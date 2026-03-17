#!/usr/bin/env node
/**
 * Admin Reset CLI — Reset or create a new admin account
 *
 * Usage:
 *   node reset-admin.js                  # Interactive: prompts for username/password
 *   node reset-admin.js <user> <pass>    # Direct: provide credentials as arguments
 */

const { getDb } = require('./db');
const bcrypt = require('bcryptjs');
const readline = require('readline');

function ask(question, hidden) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    if (hidden) {
      process.stdout.write(question);
      const stdin = process.stdin;
      const wasRaw = stdin.isRaw;
      if (stdin.setRawMode) stdin.setRawMode(true);
      let input = '';
      const onData = (ch) => {
        const c = ch.toString();
        if (c === '\n' || c === '\r') {
          if (stdin.setRawMode) stdin.setRawMode(wasRaw);
          stdin.removeListener('data', onData);
          process.stdout.write('\n');
          rl.close();
          resolve(input);
        } else if (c === '\u007f' || c === '\b') {
          if (input.length > 0) {
            input = input.slice(0, -1);
            process.stdout.write('\b \b');
          }
        } else if (c === '\u0003') {
          process.exit(0);
        } else {
          input += c;
          process.stdout.write('*');
        }
      };
      stdin.resume();
      stdin.on('data', onData);
    } else {
      rl.question(question, answer => { rl.close(); resolve(answer); });
    }
  });
}

async function main() {
  let username, password;

  if (process.argv.length >= 4) {
    username = process.argv[2];
    password = process.argv[3];
  } else {
    console.log('\n  Inflex Admin Reset Tool');
    console.log('  ──────────────────────\n');
    username = await ask('  New admin username: ');
    password = await ask('  New admin password: ', true);
    const confirm = await ask('  Confirm password:   ', true);

    if (password !== confirm) {
      console.error('\n  Error: Passwords do not match.\n');
      process.exit(1);
    }
  }

  if (!username || username.length < 2) {
    console.error('\n  Error: Username must be at least 2 characters.\n');
    process.exit(1);
  }
  if (!password || password.length < 8) {
    console.error('\n  Error: Password must be at least 8 characters.\n');
    process.exit(1);
  }

  const db = getDb();
  const hash = await bcrypt.hash(password, 12);

  // Clear existing admin data
  db.exec('DELETE FROM admin_sessions');
  db.exec('DELETE FROM admin_users');

  // Create new admin
  db.prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)').run(username, hash);

  console.log('\n  Admin account reset successfully.');
  console.log(`  Username: ${username}`);
  console.log('  Password: ********');
  console.log('\n  You can now log in at /login.html\n');
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
