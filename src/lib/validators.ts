import { z } from "zod";

export const CATEGORIES = ["MACRO", "DEFI", "CRYPTO"] as const;
export const STATUSES = ["DRAFT", "PUBLISHED"] as const;

export type Category = (typeof CATEGORIES)[number];
export type Status = (typeof STATUSES)[number];

export const articleCreateSchema = z.object({
  title: z
    .string()
    .min(5, "Judul minimal 5 karakter")
    .max(200, "Judul maksimal 200 karakter"),
  slug: z
    .string()
    .min(5, "Slug minimal 5 karakter")
    .max(200, "Slug maksimal 200 karakter")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug hanya boleh huruf kecil, angka, dan strip"
    ),
  excerpt: z.string().max(500, "Excerpt maksimal 500 karakter").optional(),
  content: z.string().optional(),
  category: z.enum(CATEGORIES, {
    error: "Kategori harus MACRO, DEFI, atau CRYPTO",
  }),
  featuredImage: z.string().url("URL gambar tidak valid").optional().nullable(),
  status: z.enum(STATUSES).optional(),
});

export const articleUpdateSchema = articleCreateSchema.partial();

export type ArticleCreateInput = z.infer<typeof articleCreateSchema>;
export type ArticleUpdateInput = z.infer<typeof articleUpdateSchema>;
