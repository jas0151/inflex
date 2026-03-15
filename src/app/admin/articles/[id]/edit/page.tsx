"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ArticleForm from "@/components/admin/ArticleForm";
import type { ArticleFormData } from "@/lib/validations";

export default function EditArticlePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [article, setArticle] = useState<ArticleFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/articles/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data) => {
        setArticle({
          title: data.title,
          slug: data.slug,
          content: data.content,
          excerpt: data.excerpt || "",
          category: data.category,
          featuredImage: data.featuredImage || "",
          status: data.status,
        });
        setLoading(false);
      })
      .catch(() => {
        router.push("/admin/articles");
      });
  }, [id, router]);

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this article?")) return;
    setDeleting(true);

    const res = await fetch(`/api/articles/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/admin/articles");
      router.refresh();
    } else {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted text-sm">
        Loading...
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl font-bold">Edit Article</h1>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs px-3 py-1.5 text-red border border-red/20 rounded-md hover:bg-red/5 transition-colors disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Delete Article"}
        </button>
      </div>
      {article && <ArticleForm defaultValues={article} articleId={id} />}
    </div>
  );
}
