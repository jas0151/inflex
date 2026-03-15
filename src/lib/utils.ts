export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 200);
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function categoryLabel(cat: string): string {
  const labels: Record<string, string> = {
    MACRO: "Makroekonomi",
    DEFI: "DeFi",
    CRYPTO: "Crypto",
  };
  return labels[cat] || cat;
}

export function categoryColor(cat: string): string {
  const colors: Record<string, string> = {
    MACRO: "bg-blue-100 text-blue-800",
    DEFI: "bg-purple-100 text-purple-800",
    CRYPTO: "bg-amber-100 text-amber-800",
  };
  return colors[cat] || "bg-gray-100 text-gray-800";
}
