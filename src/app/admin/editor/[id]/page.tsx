"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import TiptapEditor from "@/components/editor/TiptapEditor";
import { slugify } from "@/lib/utils";
import type { Category } from "@/lib/validators";

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "MACRO", label: "Makroekonomi" },
  { value: "DEFI", label: "DeFi" },
  { value: "CRYPTO", label: "Crypto" },
];

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: Category;
  featuredImage: string | null;
  status: "DRAFT" | "PUBLISHED";
}

export default function EditEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    category: "MACRO" as Category,
    featuredImage: null as string | null,
    status: "DRAFT" as "DRAFT" | "PUBLISHED",
  });

  // Load article
  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/articles/${id}`);
      if (!res.ok) {
        setError("Artikel tidak ditemukan");
        setLoading(false);
        return;
      }
      const article: Article = await res.json();
      setForm({
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        content: article.content,
        category: article.category,
        featuredImage: article.featuredImage,
        status: article.status,
      });
      setLoading(false);
    }
    load();
  }, [id]);

  // Auto-save every 30 seconds
  const autoSave = useCallback(async () => {
    if (!form.title || form.title.length < 5) return;
    try {
      await fetch(`/api/articles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setAutoSaved(true);
      setTimeout(() => setAutoSaved(false), 2000);
    } catch {
      // Silent fail
    }
  }, [form, id]);

  useEffect(() => {
    const interval = setInterval(autoSave, 30000);
    return () => clearInterval(interval);
  }, [autoSave]);

  async function handleSubmit(publishStatus: "DRAFT" | "PUBLISHED") {
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/articles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, status: publishStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Gagal menyimpan");
        setSaving(false);
        return;
      }

      router.push("/admin/dashboard");
      router.refresh();
    } catch {
      setError("Terjadi kesalahan jaringan");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Hapus artikel ini? Tindakan ini tidak bisa dibatalkan.")) return;
    setDeleting(true);
    try {
      await fetch(`/api/articles/${id}`, { method: "DELETE" });
      router.push("/admin/dashboard");
      router.refresh();
    } catch {
      setError("Gagal menghapus artikel");
      setDeleting(false);
    }
  }

  async function handleImageUpload() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (data.url) {
          setForm((prev) => ({ ...prev, featuredImage: data.url }));
        }
      } catch {
        setError("Gagal upload gambar");
      }
    };
    input.click();
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <p className="text-muted">Memuat artikel...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-serif font-bold text-ink">Edit Artikel</h1>
          {autoSaved && (
            <p className="text-xs text-green-600 mt-1">Draft tersimpan otomatis</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-md hover:bg-red-50 transition disabled:opacity-50"
          >
            Hapus
          </button>
          <button
            onClick={() => handleSubmit("DRAFT")}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium border border-rule rounded-md hover:bg-surface transition disabled:opacity-50"
          >
            Simpan Draft
          </button>
          <button
            onClick={() => handleSubmit("PUBLISHED")}
            disabled={saving}
            className="px-4 py-2 text-sm font-semibold bg-ink text-white rounded-md hover:bg-ink/90 transition disabled:opacity-50"
          >
            {saving ? "Menyimpan..." : "Publish"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
          {error}
        </div>
      )}

      <div className="space-y-5">
        <input
          type="text"
          value={form.title}
          onChange={(e) => {
            const title = e.target.value;
            setForm((prev) => ({
              ...prev,
              title,
              slug:
                prev.slug === slugify(prev.title) || prev.slug === ""
                  ? slugify(title)
                  : prev.slug,
            }));
          }}
          placeholder="Judul Artikel"
          className="w-full text-3xl font-serif font-bold border-0 border-b border-rule bg-transparent p-3 focus:outline-none focus:border-ink placeholder:text-muted/50"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
              Slug
            </label>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-rule rounded-md bg-white font-mono focus:outline-none focus:ring-1 focus:ring-ink"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
              Kategori
            </label>
            <select
              value={form.category}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  category: e.target.value as Category,
                }))
              }
              className="w-full px-3 py-2 text-sm border border-rule rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-ink"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
              Featured Image
            </label>
            <button
              type="button"
              onClick={handleImageUpload}
              className="w-full px-3 py-2 text-sm border border-dashed border-rule rounded-md text-muted hover:border-ink hover:text-ink transition text-left"
            >
              {form.featuredImage ? "Ganti Gambar" : "Upload Gambar"}
            </button>
            {form.featuredImage && (
              <img
                src={form.featuredImage}
                alt="Preview"
                className="mt-2 h-20 w-full object-cover rounded"
              />
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
            Excerpt
          </label>
          <textarea
            value={form.excerpt}
            onChange={(e) => setForm((prev) => ({ ...prev, excerpt: e.target.value }))}
            rows={2}
            placeholder="Ringkasan singkat artikel (untuk SEO & preview)..."
            className="w-full px-3 py-2 text-sm border border-rule rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-ink resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
            Konten
          </label>
          <TiptapEditor
            content={form.content}
            onChange={(html) => setForm((prev) => ({ ...prev, content: html }))}
          />
        </div>
      </div>
    </div>
  );
}
