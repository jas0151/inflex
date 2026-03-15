import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || "admin@inflex.id";
  const password = process.env.ADMIN_PASSWORD || "inflexadmin2024";
  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Inflex Admin",
      passwordHash,
      role: "ADMIN",
    },
  });

  console.log(`Admin user created: ${admin.email}`);

  // Create sample articles
  const articles = [
    {
      title: "Analisis Makro: Kebijakan Moneter The Fed Q1 2026",
      slug: "analisis-makro-kebijakan-moneter-fed-q1-2026",
      excerpt:
        "Tinjauan mendalam terhadap kebijakan moneter Federal Reserve dan dampaknya terhadap pasar global.",
      content:
        "<h2>Ringkasan Eksekutif</h2><p>Federal Reserve mempertahankan suku bunga di kisaran 4.25-4.50% pada pertemuan terakhir...</p>",
      category: "MACRO",
      status: "PUBLISHED",
      authorId: admin.id,
    },
    {
      title: "DeFi Deep Dive: Evolusi Liquid Staking Derivatives",
      slug: "defi-deep-dive-liquid-staking-derivatives",
      excerpt:
        "Eksplorasi protokol LSD terkemuka dan implikasinya terhadap ekosistem Ethereum.",
      content:
        "<h2>Pendahuluan</h2><p>Liquid Staking Derivatives telah menjadi salah satu narasi terbesar di ekosistem DeFi...</p>",
      category: "DEFI",
      status: "PUBLISHED",
      authorId: admin.id,
    },
    {
      title: "Bitcoin Halving 2024: Dampak Jangka Panjang",
      slug: "bitcoin-halving-2024-dampak-jangka-panjang",
      excerpt:
        "Analisis post-halving dan proyeksi harga BTC berdasarkan data historis.",
      content:
        "<h2>Konteks Historis</h2><p>Setiap halving Bitcoin secara historis telah diikuti oleh bull run yang signifikan...</p>",
      category: "CRYPTO",
      status: "DRAFT",
      authorId: admin.id,
    },
  ];

  for (const article of articles) {
    await prisma.article.upsert({
      where: { slug: article.slug },
      update: {},
      create: article,
    });
  }

  console.log(`Seeded ${articles.length} articles`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
