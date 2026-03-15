"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { articleSchema, ArticleFormData, generateSlug } from "@/lib/validations";
import TiptapEditor from "./TiptapEditor";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface ArticleFormProps {
  defaultValues?: Partial<ArticleFormData>;
  articleId?: string;
}

export default function ArticleForm({ defaultValues, articleId }: ArticleFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  const isEditing = !!articleId;

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ArticleFormData>({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      title: "",
      slug: "",
      content: "",
      excerpt: "",
      category: "CRYPTO",
      featuredImage: "",
      status: "DRAFT",
      ...defaultValues,
    },
  });

  const title = watch("title");

  function handleGenerateSlug() {
    if (title) {
      setValue("slug", generateSlug(title), { shouldValidate: true });
    }
  }

  async function onSubmit(data: ArticleFormData) {
    setSubmitting(true);
    setServerError("");

    const url = isEditing ? `/api/articles/${articleId}` : "/api/articles";
    const method = isEditing ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json();
      setServerError(err.error || "Something went wrong");
      setSubmitting(false);
      return;
    }

    router.push("/admin/articles");
    router.refresh();
  }

  const inputClass =
    "w-full px-3 py-2 border border-border rounded-md bg-paper text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent";
  const labelClass = "block text-sm font-medium text-ink mb-1";
  const errorClass = "text-red text-xs mt-1";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-3xl">
      {serverError && (
        <div className="bg-red/10 text-red text-sm px-4 py-3 rounded-md">
          {serverError}
        </div>
      )}

      {/* Title */}
      <div>
        <label className={labelClass}>Title</label>
        <input
          {...register("title")}
          className={inputClass}
          placeholder="Article title"
        />
        {errors.title && <p className={errorClass}>{errors.title.message}</p>}
      </div>

      {/* Slug */}
      <div>
        <label className={labelClass}>Slug</label>
        <div className="flex gap-2">
          <input
            {...register("slug")}
            className={inputClass}
            placeholder="article-slug"
          />
          <button
            type="button"
            onClick={handleGenerateSlug}
            className="px-3 py-2 text-xs bg-paper2 border border-border rounded-md hover:bg-ink/5 whitespace-nowrap"
          >
            Generate
          </button>
        </div>
        {errors.slug && <p className={errorClass}>{errors.slug.message}</p>}
      </div>

      {/* Category & Status */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Category</label>
          <select {...register("category")} className={inputClass}>
            <option value="MACRO">Macro</option>
            <option value="DEFI">DeFi</option>
            <option value="CRYPTO">Crypto</option>
          </select>
          {errors.category && (
            <p className={errorClass}>{errors.category.message}</p>
          )}
        </div>
        <div>
          <label className={labelClass}>Status</label>
          <select {...register("status")} className={inputClass}>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
          </select>
        </div>
      </div>

      {/* Featured Image */}
      <div>
        <label className={labelClass}>Featured Image URL</label>
        <input
          {...register("featuredImage")}
          className={inputClass}
          placeholder="https://example.com/image.jpg"
        />
        {errors.featuredImage && (
          <p className={errorClass}>{errors.featuredImage.message}</p>
        )}
      </div>

      {/* Excerpt */}
      <div>
        <label className={labelClass}>Excerpt</label>
        <textarea
          {...register("excerpt")}
          className={`${inputClass} resize-none`}
          rows={2}
          placeholder="Brief summary for SEO and article cards"
        />
        {errors.excerpt && (
          <p className={errorClass}>{errors.excerpt.message}</p>
        )}
      </div>

      {/* Content (Rich Text) */}
      <div>
        <label className={labelClass}>Content</label>
        <Controller
          name="content"
          control={control}
          render={({ field }) => (
            <TiptapEditor content={field.value} onChange={field.onChange} />
          )}
        />
        {errors.content && (
          <p className={errorClass}>{errors.content.message}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t border-border">
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2 bg-ink text-paper text-sm font-semibold rounded-md hover:bg-ink/90 transition-colors disabled:opacity-50"
        >
          {submitting
            ? "Saving..."
            : isEditing
              ? "Update Article"
              : "Create Article"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2 text-sm text-muted hover:text-ink transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
