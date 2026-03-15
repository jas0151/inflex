import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await prisma.article.findUnique({ where: { slug } });

  if (!article) return { title: "Not Found — INFLEX" };

  return {
    title: `${article.title} — INFLEX`,
    description: article.excerpt || `Read ${article.title} on INFLEX.`,
    openGraph: {
      title: article.title,
      description: article.excerpt || undefined,
      images: article.featuredImage ? [article.featuredImage] : undefined,
    },
  };
}

const categoryLabel: Record<string, string> = {
  MACRO: "Macro",
  DEFI: "DeFi",
  CRYPTO: "Crypto",
};

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await prisma.article.findUnique({ where: { slug } });

  if (!article || article.status !== "PUBLISHED") {
    notFound();
  }

  return (
    <div className="min-h-screen bg-paper">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-serif text-xl font-black tracking-tight">
            INFLEX
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/articles" className="text-muted hover:text-ink transition-colors">
              Articles
            </Link>
          </nav>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-6 py-12">
        {/* Meta */}
        <div className="mb-6">
          <span className="text-xs text-accent font-medium uppercase tracking-wider">
            {categoryLabel[article.category] || article.category}
          </span>
          <h1 className="font-serif text-3xl md:text-4xl font-bold mt-2 leading-tight">
            {article.title}
          </h1>
          <p className="text-sm text-muted mt-3">
            {new Date(article.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        {/* Featured Image */}
        {article.featuredImage && (
          <div className="relative aspect-[16/9] rounded-lg overflow-hidden mb-8">
            <Image
              src={article.featuredImage}
              alt={article.title}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 768px"
            />
          </div>
        )}

        {/* Content */}
        <div
          className="prose-inflex text-ink leading-relaxed"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-border">
          <Link
            href="/articles"
            className="text-sm text-muted hover:text-ink transition-colors"
          >
            ← Back to Articles
          </Link>
        </div>
      </article>
    </div>
  );
}
