import { z } from "zod";

export const articleSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase with hyphens"),
  content: z.string().min(1, "Content is required"),
  excerpt: z.string().max(500, "Excerpt too long").optional().or(z.literal("")),
  category: z.enum(["MACRO", "DEFI", "CRYPTO"]),
  featuredImage: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  status: z.enum(["DRAFT", "PUBLISHED"]),
});

export type ArticleFormData = z.infer<typeof articleSchema>;

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
