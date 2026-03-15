import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [totalArticles, published, drafts, categories] = await Promise.all([
    prisma.article.count(),
    prisma.article.count({ where: { status: "PUBLISHED" } }),
    prisma.article.count({ where: { status: "DRAFT" } }),
    prisma.article.groupBy({
      by: ["category"],
      _count: { category: true },
    }),
  ]);

  const recentArticles = await prisma.article.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      category: true,
      createdAt: true,
    },
  });

  const categoryMap = Object.fromEntries(
    categories.map((c) => [c.category, c._count.category])
  );

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold mb-6">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Articles", value: totalArticles, color: "text-ink" },
          { label: "Published", value: published, color: "text-green" },
          { label: "Drafts", value: drafts, color: "text-muted" },
          {
            label: "Categories",
            value: `M${categoryMap.MACRO || 0} · D${categoryMap.DEFI || 0} · C${categoryMap.CRYPTO || 0}`,
            color: "text-accent",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-surface border border-border rounded-lg p-4"
          >
            <p className="text-xs text-muted uppercase tracking-wider mb-1">
              {stat.label}
            </p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Recent Articles */}
      <div className="bg-surface border border-border rounded-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="font-medium text-sm">Recent Articles</h2>
          <Link
            href="/admin/articles/new"
            className="text-xs px-3 py-1.5 bg-ink text-paper rounded-md hover:bg-ink/90 transition-colors"
          >
            + New Article
          </Link>
        </div>
        {recentArticles.length === 0 ? (
          <div className="px-4 py-8 text-center text-muted text-sm">
            No articles yet.{" "}
            <Link href="/admin/articles/new" className="text-accent underline">
              Create your first article
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recentArticles.map((article) => (
              <Link
                key={article.id}
                href={`/admin/articles/${article.id}/edit`}
                className="flex items-center justify-between px-4 py-3 hover:bg-paper2/50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium">{article.title}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {article.category} ·{" "}
                    {new Date(article.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    article.status === "PUBLISHED"
                      ? "bg-green/10 text-green"
                      : "bg-ink/5 text-muted"
                  }`}
                >
                  {article.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
