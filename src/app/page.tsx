import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatDate, categoryLabel, categoryColor } from "@/lib/utils";

export const revalidate = 60; // ISR: revalidate every 60 seconds

export default async function HomePage() {
  const publishedArticles = await prisma.article.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
    take: 12,
    include: { author: { select: { name: true } } },
  });

  const featured = publishedArticles[0];
  const rest = publishedArticles.slice(1);

  return (
    <div className="min-h-screen bg-paper">
      {/* Header */}
      <header className="border-b border-rule">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="font-serif text-2xl font-extrabold tracking-tight text-ink">
            INFLEX
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link href="#insights" className="text-muted hover:text-ink transition">
              Insights
            </Link>
            <Link
              href="/inflex-terminal.html"
              className="px-3 py-1.5 border border-ink text-ink text-xs font-semibold tracking-wider uppercase hover:bg-ink hover:text-white transition"
            >
              Terminal
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-16 md:py-24 text-center">
        <p className="text-xs tracking-[0.4em] text-muted uppercase mb-4">
          Macro &middot; DeFi &middot; Crypto
        </p>
        <h1 className="font-serif text-4xl md:text-6xl font-extrabold leading-tight max-w-3xl mx-auto">
          Intelligence for the{" "}
          <span className="text-accent">New Financial Era</span>
        </h1>
        <p className="mt-6 text-lg text-muted max-w-xl mx-auto leading-relaxed">
          Riset mendalam dan analisis independen untuk investor dan analis
          profesional di pasar makroekonomi, DeFi, dan crypto.
        </p>
        <div className="mt-2 w-16 h-0.5 bg-accent mx-auto" />
      </section>

      {/* Insights Section */}
      <section id="insights" className="max-w-6xl mx-auto px-4 pb-20">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-serif text-2xl font-bold">Latest Insights</h2>
        </div>

        {publishedArticles.length === 0 ? (
          <div className="text-center py-20 text-muted">
            <p className="text-lg">Belum ada artikel yang dipublikasikan.</p>
            <p className="text-sm mt-2">
              Masuk ke{" "}
              <Link href="/admin/dashboard" className="text-accent underline">
                CMS
              </Link>{" "}
              untuk membuat konten.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Featured Article */}
            {featured && (
              <Link
                href={`/articles/${featured.slug}`}
                className="group lg:row-span-2 bg-white border border-rule rounded-lg overflow-hidden hover:shadow-md transition"
              >
                {featured.featuredImage && (
                  <div className="aspect-video bg-surface overflow-hidden">
                    <img
                      src={featured.featuredImage}
                      alt={featured.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                  </div>
                )}
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-semibold ${categoryColor(
                        featured.category
                      )}`}
                    >
                      {categoryLabel(featured.category)}
                    </span>
                    <span className="text-xs text-muted">
                      {formatDate(featured.createdAt)}
                    </span>
                  </div>
                  <h3 className="font-serif text-2xl font-bold group-hover:text-accent transition">
                    {featured.title}
                  </h3>
                  {featured.excerpt && (
                    <p className="mt-3 text-muted leading-relaxed line-clamp-3">
                      {featured.excerpt}
                    </p>
                  )}
                  <p className="mt-4 text-sm font-medium text-ink">
                    By {featured.author.name || "INFLEX"}
                  </p>
                </div>
              </Link>
            )}

            {/* Other Articles */}
            {rest.map((article) => (
              <Link
                key={article.id}
                href={`/articles/${article.slug}`}
                className="group bg-white border border-rule rounded-lg overflow-hidden hover:shadow-md transition flex flex-col"
              >
                <div className="p-5 flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-semibold ${categoryColor(
                        article.category
                      )}`}
                    >
                      {categoryLabel(article.category)}
                    </span>
                    <span className="text-xs text-muted">
                      {formatDate(article.createdAt)}
                    </span>
                  </div>
                  <h3 className="font-serif text-lg font-bold group-hover:text-accent transition">
                    {article.title}
                  </h3>
                  {article.excerpt && (
                    <p className="mt-2 text-sm text-muted line-clamp-2">
                      {article.excerpt}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-rule py-8 text-center text-sm text-muted">
        <p>&copy; {new Date().getFullYear()} INFLEX. All rights reserved.</p>
      </footer>
    </div>
  );
}
