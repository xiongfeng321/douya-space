import { sampleWorks } from "./sample-data";

export const WORK_TYPES = [
  "code",
  "art",
  "writing",
  "video",
  "scratch",
  "maker",
  "achievement",
  "original"
];

const columns = [
  "id",
  "slug",
  "type",
  "category",
  "title_zh",
  "title_en",
  "summary_zh",
  "summary_en",
  "content_zh",
  "content_en",
  "tags",
  "cover_image",
  "cover_style",
  "gallery_images",
  "media_url",
  "code_url",
  "demo_url",
  "materials",
  "process_steps",
  "learning_notes",
  "parent_note",
  "featured",
  "sort_order",
  "is_published",
  "published_at",
  "author_role",
  "created_at",
  "updated_at"
];

const worksExtraColumns = [
  { name: "type", definition: "TEXT NOT NULL DEFAULT 'original'" },
  { name: "media_url", definition: "TEXT NOT NULL DEFAULT ''" },
  { name: "materials", definition: "TEXT NOT NULL DEFAULT '[]'" },
  { name: "process_steps", definition: "TEXT NOT NULL DEFAULT '[]'" },
  { name: "learning_notes", definition: "TEXT NOT NULL DEFAULT ''" },
  { name: "parent_note", definition: "TEXT NOT NULL DEFAULT ''" },
  { name: "featured", definition: "INTEGER NOT NULL DEFAULT 0" },
  { name: "sort_order", definition: "INTEGER NOT NULL DEFAULT 0" }
];

function safeParseArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeParseStepArray(value) {
  const parsed = safeParseArray(value);
  return parsed
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      return {
        title: String(item.title || "").trim(),
        detail: String(item.detail || "").trim()
      };
    })
    .filter((item) => item && (item.title || item.detail));
}

async function ensureExtraColumns(env, table, definitions) {
  const pragma = await env.DB.prepare(`PRAGMA table_info(${table})`).all();
  const existingColumns = new Set((pragma.results || []).map((row) => row.name));

  for (const column of definitions) {
    if (existingColumns.has(column.name)) continue;
    await env.DB.prepare(`ALTER TABLE ${table} ADD COLUMN ${column.name} ${column.definition}`).run();
  }
}

export async function ensureWorksSchema(env) {
  if (!env?.DB) return;

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS works (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL DEFAULT 'original',
      category TEXT NOT NULL DEFAULT 'original',
      title_zh TEXT NOT NULL,
      title_en TEXT NOT NULL,
      summary_zh TEXT NOT NULL,
      summary_en TEXT NOT NULL,
      content_zh TEXT NOT NULL,
      content_en TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      cover_image TEXT NOT NULL DEFAULT '',
      cover_style TEXT NOT NULL DEFAULT '',
      gallery_images TEXT NOT NULL DEFAULT '[]',
      media_url TEXT NOT NULL DEFAULT '',
      code_url TEXT NOT NULL DEFAULT '',
      demo_url TEXT NOT NULL DEFAULT '',
      materials TEXT NOT NULL DEFAULT '[]',
      process_steps TEXT NOT NULL DEFAULT '[]',
      learning_notes TEXT NOT NULL DEFAULT '',
      parent_note TEXT NOT NULL DEFAULT '',
      featured INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_published INTEGER NOT NULL DEFAULT 0,
      published_at TEXT NOT NULL DEFAULT '',
      author_role TEXT NOT NULL DEFAULT 'child',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `).run();

  await ensureExtraColumns(env, "works", worksExtraColumns);

  await env.DB.prepare(`
    CREATE INDEX IF NOT EXISTS idx_works_published_at
    ON works (is_published, featured DESC, sort_order ASC, published_at DESC)
  `).run();

  await env.DB.prepare(`
    CREATE INDEX IF NOT EXISTS idx_works_type
    ON works (type, is_published)
  `).run();
}

export function normalizeWork(row) {
  if (!row) return null;

  const type = row.type || row.category || "original";
  const summaryZh = row.summary_zh || "";
  const summaryEn = row.summary_en || "";

  return {
    ...row,
    type,
    category: type,
    tags: safeParseArray(row.tags),
    gallery_images: safeParseArray(row.gallery_images),
    materials: safeParseArray(row.materials),
    process_steps: safeParseStepArray(row.process_steps),
    featured: row.featured === true || row.featured === 1,
    sort_order: Number(row.sort_order || 0),
    is_published: row.is_published === true || row.is_published === 1,
    learning_notes: row.learning_notes || "",
    parent_note: row.parent_note || "",
    media_url: row.media_url || "",
    content_zh: row.content_zh || summaryZh,
    content_en: row.content_en || summaryEn
  };
}

export function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeType(inputType) {
  const type = String(inputType || "").trim().toLowerCase();
  if (WORK_TYPES.includes(type)) return type;
  return "original";
}

function sanitizeStepInput(stepsInput) {
  if (!Array.isArray(stepsInput)) return [];
  return stepsInput
    .map((step) => ({
      title: String(step?.title || "").trim(),
      detail: String(step?.detail || "").trim()
    }))
    .filter((step) => step.title || step.detail);
}

export function validateWork(work) {
  const required = ["title_zh", "title_en", "summary_zh", "summary_en"];
  for (const field of required) {
    if (!work[field] || String(work[field]).trim() === "") return `${field} is required`;
  }

  if (!WORK_TYPES.includes(work.type)) return "type is invalid";

  for (const field of ["code_url", "demo_url", "cover_image", "media_url"]) {
    if (work[field] && !/^https?:\/\//.test(work[field]) && !work[field].startsWith("/") && !work[field].startsWith("data:image/")) {
      return `${field} must be a valid URL, data URL, or local path`;
    }
  }

  return "";
}

export function prepareWork(input, role = "child") {
  const now = new Date().toISOString();
  const title = input.title_en || input.title_zh || "untitled";
  const type = normalizeType(input.type || input.category);
  const summaryZh = input.summary_zh?.trim() || "";
  const summaryEn = input.summary_en?.trim() || "";

  return {
    id: input.id || crypto.randomUUID(),
    slug: input.slug || slugify(title),
    type,
    category: type,
    title_zh: input.title_zh?.trim() || "",
    title_en: input.title_en?.trim() || "",
    summary_zh: summaryZh,
    summary_en: summaryEn,
    content_zh: input.content_zh?.trim() || summaryZh,
    content_en: input.content_en?.trim() || summaryEn,
    tags: Array.isArray(input.tags) ? input.tags : String(input.tags || "").split(",").map((tag) => tag.trim()).filter(Boolean),
    cover_image: input.cover_image || "",
    cover_style: input.cover_style || "linear-gradient(135deg, #00a6b8, #8ec63f)",
    gallery_images: Array.isArray(input.gallery_images) ? input.gallery_images.filter(Boolean) : [],
    media_url: input.media_url || "",
    code_url: input.code_url || "",
    demo_url: input.demo_url || "",
    materials: Array.isArray(input.materials) ? input.materials.map((item) => String(item || "").trim()).filter(Boolean) : [],
    process_steps: sanitizeStepInput(input.process_steps),
    learning_notes: input.learning_notes?.trim() || "",
    parent_note: input.parent_note?.trim() || "",
    featured: Boolean(input.featured),
    sort_order: Number.isFinite(Number(input.sort_order)) ? Number(input.sort_order) : 0,
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

  await ensureWorksSchema(env);

  const params = [];
  const where = [];

  if (options.publishedOnly) where.push("is_published = 1");

  const typeFilter = options.type || options.category;
  if (typeFilter && typeFilter !== "all") {
    where.push("type = ?");
    params.push(typeFilter);
  }

  if (options.featuredOnly) {
    where.push("featured = 1");
  }

  if (options.q) {
    where.push("(title_zh LIKE ? OR title_en LIKE ? OR summary_zh LIKE ? OR summary_en LIKE ? OR tags LIKE ?)");
    params.push(`%${options.q}%`, `%${options.q}%`, `%${options.q}%`, `%${options.q}%`, `%${options.q}%`);
  }

  const sql = `
    SELECT ${columns.join(", ")} FROM works
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY featured DESC, sort_order ASC, published_at DESC, updated_at DESC
    LIMIT 240
  `;
  const result = await env.DB.prepare(sql).bind(...params).all();
  const works = (result.results || []).map(normalizeWork);
  return works.length ? works : sampleWorks.map(normalizeWork);
}

export async function getWork(env, slug, options = {}) {
  const fallbackWork = sampleWorks.find((item) => item.slug === slug);

  if (!env?.DB) {
    return options.publishedOnly && !fallbackWork?.is_published ? null : normalizeWork(fallbackWork);
  }

  await ensureWorksSchema(env);

  const where = options.publishedOnly ? "slug = ? AND is_published = 1" : "slug = ?";
  const work = await env.DB.prepare(`SELECT ${columns.join(", ")} FROM works WHERE ${where} LIMIT 1`).bind(slug).first();
  if (work) return normalizeWork(work);
  return options.publishedOnly && !fallbackWork?.is_published ? null : normalizeWork(fallbackWork);
}

export async function upsertWork(env, work) {
  if (!env?.DB) return work;

  await ensureWorksSchema(env);

  await env.DB.prepare(`
    INSERT INTO works (${columns.join(", ")})
    VALUES (${columns.map(() => "?").join(", ")})
    ON CONFLICT(slug) DO UPDATE SET
      type = excluded.type,
      category = excluded.category,
      title_zh = excluded.title_zh,
      title_en = excluded.title_en,
      summary_zh = excluded.summary_zh,
      summary_en = excluded.summary_en,
      content_zh = excluded.content_zh,
      content_en = excluded.content_en,
      tags = excluded.tags,
      cover_image = excluded.cover_image,
      cover_style = excluded.cover_style,
      gallery_images = excluded.gallery_images,
      media_url = excluded.media_url,
      code_url = excluded.code_url,
      demo_url = excluded.demo_url,
      materials = excluded.materials,
      process_steps = excluded.process_steps,
      learning_notes = excluded.learning_notes,
      parent_note = excluded.parent_note,
      featured = excluded.featured,
      sort_order = excluded.sort_order,
      is_published = excluded.is_published,
      published_at = excluded.published_at,
      author_role = excluded.author_role,
      updated_at = excluded.updated_at
  `).bind(
    work.id,
    work.slug,
    work.type,
    work.category,
    work.title_zh,
    work.title_en,
    work.summary_zh,
    work.summary_en,
    work.content_zh,
    work.content_en,
    JSON.stringify(work.tags || []),
    work.cover_image || "",
    work.cover_style || "",
    JSON.stringify(work.gallery_images || []),
    work.media_url || "",
    work.code_url || "",
    work.demo_url || "",
    JSON.stringify(work.materials || []),
    JSON.stringify(work.process_steps || []),
    work.learning_notes || "",
    work.parent_note || "",
    work.featured ? 1 : 0,
    Number(work.sort_order || 0),
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
  await ensureWorksSchema(env);
  await env.DB.prepare("DELETE FROM works WHERE slug = ?").bind(slug).run();
  return { deleted: true };
}
