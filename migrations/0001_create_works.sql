CREATE TABLE IF NOT EXISTS works (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title_zh TEXT NOT NULL,
  title_en TEXT NOT NULL,
  summary_zh TEXT NOT NULL,
  summary_en TEXT NOT NULL,
  content_zh TEXT NOT NULL,
  content_en TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('code', 'art', 'original')),
  tags TEXT NOT NULL DEFAULT '[]',
  cover_image TEXT NOT NULL DEFAULT '',
  cover_style TEXT NOT NULL DEFAULT '',
  gallery_images TEXT NOT NULL DEFAULT '[]',
  code_url TEXT NOT NULL DEFAULT '',
  demo_url TEXT NOT NULL DEFAULT '',
  is_published INTEGER NOT NULL DEFAULT 0,
  published_at TEXT NOT NULL DEFAULT '',
  author_role TEXT NOT NULL DEFAULT 'child',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_works_published_at
  ON works (is_published, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_works_category
  ON works (category, is_published);
