import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import StatsCard from "@/components/admin/StatsCard";
import Link from "next/link";
import { categoryLabel, categoryColor, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();

  const [totalArticles, published, drafts, macroCount, defiCount, cryptoCount, recentArticles] =
    await Promise.all([
      prisma.article.count(),
      prisma.article.count({ where: { status: "PUBLISHED" } }),
      prisma.article.count({ where: { status: "DRAFT" } }),
      prisma.article.count({ where: { category: "MACRO" } }),
      prisma.article.count({ where: { category: "DEFI" } }),
      prisma.article.count({ where: { category: "CRYPTO" } }),
      prisma.article.findMany({
        orderBy: { updatedAt: "desc" },
        take: 10,
        include: { author: { select: { name: true } } },
      }),
    ]);

  return (
    <div className="p-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-serif font-bold text-ink">Dashboard</h1>
          <p className="text-muted text-sm mt-1">
            Selamat datang, {session?.user?.name || session?.user?.email}
          </p>
        </div>
        <Link
          href="/admin/editor"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-ink text-white text-sm font-semibold rounded-md hover:bg-ink/90 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Artikel Baru
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          label="Total Artikel"
          value={totalArticles}
          icon="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
          color="bg-blue-50 text-blue-600"
        />
        <StatsCard
          label="Published"
          value={published}
          icon="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          color="bg-green-50 text-green-600"
        />
        <StatsCard
          label="Draft"
          value={drafts}
          icon="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
          color="bg-amber-50 text-amber-600"
        />
        <StatsCard
          label="Kategori"
          value={3}
          icon="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6z"
          color="bg-purple-50 text-purple-600"
        />
      </div>

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        {[
          { cat: "MACRO", count: macroCount, label: "Makroekonomi" },
          { cat: "DEFI", count: defiCount, label: "DeFi" },
          { cat: "CRYPTO", count: cryptoCount, label: "Crypto" },
        ].map(({ cat, count, label }) => (
          <div key={cat} className="bg-white border border-rule rounded-lg p-4 flex items-center gap-4">
            <span className={`px-2.5 py-1 rounded text-xs font-semibold ${categoryColor(cat)}`}>
              {label}
            </span>
            <span className="font-mono text-lg font-bold">{count}</span>
            <span className="text-muted text-sm">artikel</span>
          </div>
        ))}
      </div>

      {/* Recent Articles Table */}
      <div className="bg-white border border-rule rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-rule">
          <h2 className="font-serif font-bold text-lg">Artikel Terbaru</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface text-left text-xs font-semibold text-muted uppercase tracking-wider">
                <th className="px-5 py-3">Judul</th>
                <th className="px-5 py-3">Kategori</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Terakhir Diubah</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {recentArticles.map((article) => (
                <tr key={article.id} className="hover:bg-surface/50 transition">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-sm text-ink truncate max-w-xs">
                      {article.title}
                    </p>
                    <p className="text-xs text-muted mt-0.5 font-mono">
                      /{article.slug}
                    </p>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-semibold ${categoryColor(
                        article.category
                      )}`}
                    >
                      {categoryLabel(article.category)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        article.status === "PUBLISHED"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {article.status === "PUBLISHED" ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-muted">
                    {formatDate(article.updatedAt)}
                  </td>
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/admin/editor/${article.id}`}
                      className="text-accent text-sm font-medium hover:underline"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
              {recentArticles.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-muted text-sm">
                    Belum ada artikel. Mulai buat artikel pertama Anda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
