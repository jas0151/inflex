import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { articleCreateSchema } from "@/lib/validators";

// GET /api/articles — list articles
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const category = searchParams.get("category");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const where: Record<string, string> = {};
  if (status) where.status = status;
  if (category) where.category = category;

  const [articles, total] = await Promise.all([
    prisma.article.findMany({
      where,
      include: { author: { select: { name: true, email: true } } },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.article.count({ where }),
  ]);

  return NextResponse.json({ articles, total, page, limit });
}

// POST /api/articles — create article
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const validation = articleCreateSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.flatten() },
      { status: 400 }
    );
  }

  // Check slug uniqueness
  const existing = await prisma.article.findUnique({
    where: { slug: validation.data.slug },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Slug sudah digunakan" },
      { status: 409 }
    );
  }

  const article = await prisma.article.create({
    data: {
      ...validation.data,
      excerpt: validation.data.excerpt || "",
      content: validation.data.content || "",
      status: validation.data.status || "DRAFT",
      authorId: session.user.id,
    },
  });

  return NextResponse.json(article, { status: 201 });
}
