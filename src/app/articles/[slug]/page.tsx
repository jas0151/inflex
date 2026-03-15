import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { formatDate, categoryLabel, categoryColor } from "@/lib/utils";
import type { Metadata } from "next";
import Link from "next/link";

interface Props {
  params: Promise<{ slug: string }>;
}

// Dynamic SEO Metadata
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await prisma.article.findUnique({
    where: { slug, status: "PUBLISHED" },
    include: { author: { select: { name: true } } },
  });

  if (!article) return { title: "Artikel Tidak Ditemukan" };

  return {
    title: article.title,
    description: article.excerpt || article.title,
    authors: [{ name: article.author.name || "INFLEX" }],
    openGraph: {
      title: article.title,
      description: article.excerpt || article.title,
      type: "article",
      publishedTime: article.createdAt.toISOString(),
      modifiedTime: article.updatedAt.toISOString(),
      authors: [article.author.name || "INFLEX"],
      images: article.featuredImage ? [article.featuredImage] : [],
      siteName: "INFLEX",
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.excerpt || article.title,
      images: article.featuredImage ? [article.featuredImage] : [],
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await prisma.article.findUnique({
    where: { slug, status: "PUBLISHED" },
    include: { author: { select: { name: true } } },
  });

  if (!article) notFound();

  // JSON-LD Structured Data for SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt,
    image: article.featuredImage,
    datePublished: article.createdAt.toISOString(),
    dateModified: article.updatedAt.toISOString(),
    author: {
      "@type": "Person",
      name: article.author.name || "INFLEX",
    },
    publisher: {
      "@type": "Organization",
      name: "INFLEX",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="min-h-screen bg-paper">
        {/* Navigation */}
        <header className="border-b border-rule">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link
              href="/"
              className="font-serif text-2xl font-extrabold tracking-tight text-ink"
            >
              INFLEX
            </Link>
            <nav className="flex items-center gap-6 text-sm">
              <Link href="/" className="text-muted hover:text-ink transition">
                Beranda
              </Link>
              <Link
                href="/#insights"
                className="text-muted hover:text-ink transition"
              >
                Insights
              </Link>
            </nav>
          </div>
        </header>

        {/* Article */}
        <article className="max-w-4xl mx-auto px-4 py-12">
          {/* Meta */}
          <div className="flex items-center gap-3 mb-6">
            <span
              className={`px-2.5 py-1 rounded text-xs font-semibold ${categoryColor(
                article.category
              )}`}
            >
              {categoryLabel(article.category)}
            </span>
            <span className="text-muted text-sm">
              {formatDate(article.createdAt)}
            </span>
          </div>

          {/* Title */}
          <h1 className="font-serif text-4xl md:text-5xl font-bold leading-tight mb-4">
            {article.title}
          </h1>

          {/* Excerpt */}
          {article.excerpt && (
            <p className="text-lg text-muted leading-relaxed mb-8">
              {article.excerpt}
            </p>
          )}

          {/* Author */}
          <div className="flex items-center gap-3 pb-8 mb-8 border-b border-rule">
            <div className="w-10 h-10 rounded-full bg-ink text-white flex items-center justify-center font-serif font-bold text-sm">
              {(article.author.name || "I")[0]}
            </div>
            <div>
              <p className="text-sm font-semibold">
                {article.author.name || "INFLEX"}
              </p>
              <p className="text-xs text-muted">Analyst</p>
            </div>
          </div>

          {/* Featured Image */}
          {article.featuredImage && (
            <div className="mb-10">
              <img
                src={article.featuredImage}
                alt={article.title}
                className="w-full rounded-lg"
              />
            </div>
          )}

          {/* Content */}
          <div
            className="prose prose-lg max-w-none font-sans
              prose-headings:font-serif prose-headings:text-ink
              prose-a:text-accent prose-a:no-underline hover:prose-a:underline
              prose-blockquote:border-accent prose-blockquote:text-muted
              prose-code:font-mono prose-code:text-sm
              prose-img:rounded-lg"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </article>

        {/* Footer */}
        <footer className="border-t border-rule py-8 text-center text-sm text-muted">
          <p>&copy; {new Date().getFullYear()} INFLEX. All rights reserved.</p>
        </footer>
      </div>
    </>
  );
}
