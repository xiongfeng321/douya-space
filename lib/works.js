import { sampleWorks } from "./sample-data";

const columns = [
  "id",
  "slug",
  "title_zh",
  "title_en",
  "summary_zh",
  "summary_en",
  "content_zh",
  "content_en",
  "category",
  "tags",
  "cover_image",
  "cover_style",
  "gallery_images",
  "code_url",
  "demo_url",
  "is_published",
  "published_at",
  "author_role",
  "created_at",
  "updated_at"
];

export function normalizeWork(row) {
  if (!row) return null;

  return {
    ...row,
    tags: Array.isArray(row.tags) ? row.tags : JSON.parse(row.tags || "[]"),
    gallery_images: Array.isArray(row.gallery_images) ? row.gallery_images : JSON.parse(row.gallery_images || "[]"),
    is_published: row.is_published === true || row.is_published === 1
  };
}

export function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function validateWork(work) {
  const required = ["title_zh", "title_en", "summary_zh", "summary_en", "content_zh", "content_en", "category"];
  for (const field of required) {
    if (!work[field] || String(work[field]).trim() === "") return `${field} is required`;
  }

  if (!["code", "art", "original"].includes(work.category)) return "category must be code, art, or original";

  for (const field of ["code_url", "demo_url", "cover_image"]) {
    if (work[field] && !/^https?:\/\//.test(work[field]) && !work[field].startsWith("/") && !work[field].startsWith("data:image/")) {
      return `${field} must be a valid URL, data URL, or local path`;
    }
  }

  return "";
}

export function prepareWork(input, role = "child") {
  const now = new Date().toISOString();
  const title = input.title_en || input.title_zh || "untitled";

  return {
    id: input.id || crypto.randomUUID(),
    slug: input.slug || slugify(title),
    title_zh: input.title_zh?.trim() || "",
    title_en: input.title_en?.trim() || "",
    summary_zh: input.summary_zh?.trim() || "",
    summary_en: input.summary_en?.trim() || "",
    content_zh: input.content_zh?.trim() || "",
    content_en: input.content_en?.trim() || "",
    category: input.category || "code",
    tags: Array.isArray(input.tags) ? input.tags : String(input.tags || "").split(",").map((tag) => tag.trim()).filter(Boolean),
    cover_image: input.cover_image || "",
    cover_style: input.cover_style || "linear-gradient(135deg, #00a6b8, #8ec63f)",
    gallery_images: Array.isArray(input.gallery_images) ? input.gallery_images : [],
    code_url: input.code_url || "",
    demo_url: input.demo_url || "",
    is_published: Boolean(input.is_published),
    published_at: input.published_at || "",
    author_role: input.author_role || role,
    created_at: input.created_at || now,
    updated_at: now
  };
}

export async function listWorks(env, options = {}) {
  if (!env?.DB) {
    return sampleWorks.map(normalizeWork);
  }

  const params = [];
  const where = [];

  if (options.publishedOnly) where.push("is_published = 1");
  if (options.category) {
    where.push("category = ?");
    params.push(options.category);
  }
  if (options.q) {
    where.push("(title_zh LIKE ? OR title_en LIKE ? OR summary_zh LIKE ? OR summary_en LIKE ?)");
    params.push(`%${options.q}%`, `%${options.q}%`, `%${options.q}%`, `%${options.q}%`);
  }

  const sql = `
    SELECT ${columns.join(", ")} FROM works
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY is_published DESC, published_at DESC, updated_at DESC
    LIMIT 120
  `;
  const result = await env.DB.prepare(sql).bind(...params).all();
  return result.results.map(normalizeWork);
}

export async function getWork(env, slug, options = {}) {
  if (!env?.DB) {
    const work = sampleWorks.find((item) => item.slug === slug);
    return options.publishedOnly && !work?.is_published ? null : normalizeWork(work);
  }

  const where = options.publishedOnly ? "slug = ? AND is_published = 1" : "slug = ?";
  const work = await env.DB.prepare(`SELECT ${columns.join(", ")} FROM works WHERE ${where} LIMIT 1`).bind(slug).first();
  return normalizeWork(work);
}

export async function upsertWork(env, work) {
  if (!env?.DB) return work;

  await env.DB.prepare(`
    INSERT INTO works (${columns.join(", ")})
    VALUES (${columns.map(() => "?").join(", ")})
    ON CONFLICT(slug) DO UPDATE SET
      title_zh = excluded.title_zh,
      title_en = excluded.title_en,
      summary_zh = excluded.summary_zh,
      summary_en = excluded.summary_en,
      content_zh = excluded.content_zh,
      content_en = excluded.content_en,
      category = excluded.category,
      tags = excluded.tags,
      cover_image = excluded.cover_image,
      cover_style = excluded.cover_style,
      gallery_images = excluded.gallery_images,
      code_url = excluded.code_url,
      demo_url = excluded.demo_url,
      is_published = excluded.is_published,
      published_at = excluded.published_at,
      author_role = excluded.author_role,
      updated_at = excluded.updated_at
  `).bind(
    work.id,
    work.slug,
    work.title_zh,
    work.title_en,
    work.summary_zh,
    work.summary_en,
    work.content_zh,
    work.content_en,
    work.category,
    JSON.stringify(work.tags || []),
    work.cover_image || "",
    work.cover_style || "",
    JSON.stringify(work.gallery_images || []),
    work.code_url || "",
    work.demo_url || "",
    work.is_published ? 1 : 0,
    work.published_at || "",
    work.author_role || "child",
    work.created_at,
    work.updated_at
  ).run();

  return work;
}

export async function deleteWork(env, slug) {
  if (!env?.DB) return { deleted: false };
  await env.DB.prepare("DELETE FROM works WHERE slug = ?").bind(slug).run();
  return { deleted: true };
}
