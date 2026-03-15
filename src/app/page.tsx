import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";

export const dynamic = "force-dynamic";

const categoryLabel: Record<string, string> = {
  MACRO: "Macro",
  DEFI: "DeFi",
  CRYPTO: "Crypto",
};

export default async function HomePage() {
  const articles = await prisma.article.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  const featured = articles[0];
  const rest = articles.slice(1);

  return (
    <div className="min-h-screen bg-paper">
      {/* Navigation */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-serif text-xl font-black tracking-tight">
            INFLEX
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/articles" className="text-muted hover:text-ink transition-colors">
              Research
            </Link>
            <Link
              href="/terminal.html"
              className="text-muted hover:text-ink transition-colors"
            >
              Terminal
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-16 text-center">
        <h1 className="font-serif text-4xl md:text-5xl font-black leading-tight mb-4">
          Infinite Outcomes Requires
          <br />
          <span className="text-accent">Infinite Reflexes</span>
        </h1>
        <p className="text-muted max-w-xl mx-auto">
          Professional insights on Macroeconomics, DeFi protocols, and Crypto
          markets.
        </p>
      </section>

      {/* Featured + Grid */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-2xl font-bold">Latest Insights</h2>
          <Link
            href="/articles"
            className="text-sm text-muted hover:text-ink transition-colors"
          >
            View all →
          </Link>
        </div>

        {!featured ? (
          <p className="text-muted text-center py-20">
            No published articles yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Featured */}
            <Link
              href={`/articles/${featured.slug}`}
              className="group bg-surface border border-border rounded-lg overflow-hidden hover:border-ink/20 transition-colors lg:row-span-2"
            >
              {featured.featuredImage && (
                <div className="relative aspect-[16/9] overflow-hidden">
                  <Image
                    src={featured.featuredImage}
                    alt={featured.title}
                    fill
                    priority
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </div>
              )}
              <div className="p-6">
                <span className="text-xs text-accent font-medium uppercase tracking-wider">
                  {categoryLabel[featured.category]}
                </span>
                <h3 className="font-serif text-xl font-bold mt-2 group-hover:text-accent transition-colors">
                  {featured.title}
                </h3>
                {featured.excerpt && (
                  <p className="text-sm text-muted mt-2">{featured.excerpt}</p>
                )}
                <p className="text-xs text-muted mt-3">
                  {new Date(featured.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </Link>

            {/* Rest */}
            {rest.map((article) => (
              <Link
                key={article.id}
                href={`/articles/${article.slug}`}
                className="group flex gap-4 bg-surface border border-border rounded-lg overflow-hidden hover:border-ink/20 transition-colors p-4"
              >
                {article.featuredImage && (
                  <div className="relative w-24 h-24 flex-shrink-0 rounded overflow-hidden">
                    <Image
                      src={article.featuredImage}
                      alt={article.title}
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-accent font-medium uppercase tracking-wider">
                    {categoryLabel[article.category]}
                  </span>
                  <h3 className="font-serif text-sm font-bold mt-1 group-hover:text-accent transition-colors line-clamp-2">
                    {article.title}
                  </h3>
                  <p className="text-xs text-muted mt-1">
                    {new Date(article.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between text-xs text-muted">
          <p>&copy; {new Date().getFullYear()} INFLEX</p>
          <p>Macro · DeFi · Crypto</p>
        </div>
      </footer>
    </div>
  );
}
