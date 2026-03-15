"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: "◫" },
  { href: "/admin/articles", label: "Articles", icon: "◧" },
  { href: "/admin/articles/new", label: "New Article", icon: "+" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-paper">
      {/* Top bar */}
      <header className="bg-ink text-paper border-b border-ink">
        <div className="flex items-center justify-between px-6 py-3">
          <Link href="/admin" className="font-serif text-lg font-black tracking-tight">
            INFLEX <span className="text-xs font-sans font-normal text-paper/60 ml-1">ADMIN</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-xs text-paper/60 hover:text-paper transition-colors"
            >
              View Site →
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-xs text-paper/60 hover:text-paper transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-56 min-h-[calc(100vh-49px)] bg-surface border-r border-border p-4">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive
                      ? "bg-ink text-paper font-medium"
                      : "text-muted hover:text-ink hover:bg-paper2"
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
