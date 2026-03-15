import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Articles — INFLEX",
  description: "Latest insights on Macro, DeFi, and Crypto markets.",
};

export const dynamic = "force-dynamic";

const categoryLabel: Record<string, string> = {
  MACRO: "Macro",
  DEFI: "DeFi",
  CRYPTO: "Crypto",
};

export default async function ArticlesPage() {
  const articles = await prisma.article.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-paper">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-serif text-xl font-black tracking-tight">
            INFLEX
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/articles" className="font-medium text-ink">
              Articles
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <h1 className="font-serif text-3xl font-bold mb-2">Insights</h1>
        <p className="text-muted mb-8">
          Macro · DeFi · Crypto — Research and analysis
        </p>

        {articles.length === 0 ? (
          <p className="text-muted text-center py-20">
            No published articles yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <Link
                key={article.id}
                href={`/articles/${article.slug}`}
                className="group bg-surface border border-border rounded-lg overflow-hidden hover:border-ink/20 transition-colors"
              >
                {article.featuredImage && (
                  <div className="relative aspect-[16/9] overflow-hidden">
                    <Image
                      src={article.featuredImage}
                      alt={article.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                )}
                <div className="p-4">
                  <span className="text-xs text-accent font-medium uppercase tracking-wider">
                    {categoryLabel[article.category] || article.category}
                  </span>
                  <h2 className="font-serif text-lg font-bold mt-1 group-hover:text-accent transition-colors">
                    {article.title}
                  </h2>
                  {article.excerpt && (
                    <p className="text-sm text-muted mt-2 line-clamp-2">
                      {article.excerpt}
                    </p>
                  )}
                  <p className="text-xs text-muted mt-3">
                    {new Date(article.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
