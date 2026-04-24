import { prisma } from "./prisma";

const SLUG_RE = /[^a-z0-9]+/g;

export function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(SLUG_RE, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "project";
}

export async function uniqueProjectSlug(base: string) {
  const root = slugify(base);
  let candidate = root;
  let n = 0;
  for (;;) {
    const exists = await prisma.project.findUnique({ where: { slug: candidate } });
    if (!exists) return candidate;
    n += 1;
    candidate = `${root}-${n}`;
  }
}
