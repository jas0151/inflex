import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ArticlesPage() {
  const articles = await prisma.article.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl font-bold">Articles</h1>
        <Link
          href="/admin/articles/new"
          className="px-4 py-2 bg-ink text-paper text-sm font-semibold rounded-md hover:bg-ink/90 transition-colors"
        >
          + New Article
        </Link>
      </div>

      {articles.length === 0 ? (
        <div className="bg-surface border border-border rounded-lg px-4 py-12 text-center">
          <p className="text-muted">No articles yet.</p>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-paper2/50">
                <th className="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">
                  Title
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">
                  Category
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {articles.map((article) => (
                <tr key={article.id} className="hover:bg-paper2/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/articles/${article.id}/edit`}
                      className="font-medium hover:text-accent transition-colors"
                    >
                      {article.title}
                    </Link>
                    <p className="text-xs text-muted mt-0.5">/{article.slug}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 bg-paper2 rounded">
                      {article.category}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        article.status === "PUBLISHED"
                          ? "bg-green/10 text-green"
                          : "bg-ink/5 text-muted"
                      }`}
                    >
                      {article.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted text-xs">
                    {new Date(article.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/articles/${article.id}/edit`}
                      className="text-xs text-muted hover:text-ink transition-colors"
                    >
                      Edit →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
