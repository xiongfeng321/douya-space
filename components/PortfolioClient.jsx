"use client";

import { useMemo, useState } from "react";
import WorkCard from "./WorkCard";
import { translations, localizedField } from "@/lib/sample-data";
import { WORK_TYPES } from "@/lib/works";

function timelineGroups(works) {
  const groups = new Map();
  for (const work of works) {
    const key = work.published_at ? work.published_at.slice(0, 7) : "No Date";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(work);
  }

  return Array.from(groups.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, 6);
}

export default function PortfolioClient({ initialWorks }) {
  const [lang, setLang] = useState("zh");
  const [type, setType] = useState("all");
  const [query, setQuery] = useState("");
  const labels = translations[lang];

  const categories = useMemo(() => ["all", ...WORK_TYPES.filter((item) => initialWorks.some((work) => (work.type || work.category) === item))], [initialWorks]);
  const featuredWorks = useMemo(() => initialWorks.filter((work) => work.featured).slice(0, 4), [initialWorks]);
  const timeline = useMemo(() => timelineGroups(initialWorks), [initialWorks]);

  const filteredWorks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return initialWorks.filter((work) => {
      if (type !== "all" && (work.type || work.category) !== type) return false;
      if (!normalizedQuery) return true;

      return [
        localizedField(work, "title", lang),
        localizedField(work, "summary", lang),
        localizedField(work, "content", lang),
        ...(work.tags || [])
      ].join(" ").toLowerCase().includes(normalizedQuery);
    });
  }, [type, initialWorks, lang, query]);

  return (
    <>
      <header className="site-header">
        <a className="brand" href="#top">
          <span className="brand-mark">D</span>
          <span>
            <strong>豆芽空间</strong>
            <small>Douya Space</small>
          </span>
        </a>
        <nav className="nav-links" aria-label="primary navigation">
          <a href="#featured">{lang === "zh" ? "精选" : "Featured"}</a>
          <a href="#works">{lang === "zh" ? "作品库" : "Works"}</a>
          <a href="#timeline">{lang === "zh" ? "成长线" : "Timeline"}</a>
          <a href="/admin">{lang === "zh" ? "管理台" : "Admin"}</a>
        </nav>
        <button className="icon-button" type="button" onClick={() => setLang(lang === "zh" ? "en" : "zh")}>
          {lang === "zh" ? "EN" : "中"}
        </button>
      </header>

      <main id="top" className="page-shell">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">{lang === "zh" ? "少年创作者实验室" : "Young Creator Lab"}</p>
            <h1>{lang === "zh" ? "豆芽空间" : "Douya Space"}</h1>
            <p>
              {lang === "zh"
                ? "支持编程、绘画、写作、视频、Scratch、手工和活动记录的成长型作品档案。"
                : "A growth portfolio covering code, art, writing, video, Scratch, maker projects, and achievements."}
            </p>
            <div className="hero-actions">
              <a className="button-primary" href="#works">{lang === "zh" ? "浏览作品" : "Explore Works"}</a>
              <a className="button-secondary" href="/admin">{lang === "zh" ? "进入发布台" : "Open Publisher"}</a>
            </div>
          </div>
          <div className="signal-panel" aria-hidden="true">
            <div className="scanner-line" />
            <div className="signal-grid">
              {Array.from({ length: 12 }).map((_, index) => <span key={index} />)}
            </div>
            <div className="signal-readout">
              <strong>DOUYA / PORTFOLIO</strong>
              <small>CODE · ART · WRITING · MAKER</small>
            </div>
          </div>
        </section>

        <section className="stats-strip" aria-label="work stats">
          <article><strong>{initialWorks.length}</strong><span>{lang === "zh" ? "公开作品" : "Published Works"}</span></article>
          <article><strong>{categories.length - 1}</strong><span>{lang === "zh" ? "内容类型" : "Types"}</span></article>
          <article><strong>{featuredWorks.length}</strong><span>{lang === "zh" ? "精选作品" : "Featured"}</span></article>
        </section>

        <section id="featured" className="section">
          <div className="section-head">
            <div>
              <p className="eyebrow">{lang === "zh" ? "精选推荐" : "Featured Picks"}</p>
              <h2>{lang === "zh" ? "重点展示" : "Featured Showcase"}</h2>
            </div>
          </div>
          <div className="work-grid featured-grid">
            {(featuredWorks.length ? featuredWorks : initialWorks.slice(0, 3)).map((work) => <WorkCard key={work.slug} work={work} lang={lang} featured />)}
          </div>
        </section>

        <section id="works" className="section">
          <div className="section-head">
            <div>
              <p className="eyebrow">{lang === "zh" ? "作品库" : "Portfolio"}</p>
              <h2>{lang === "zh" ? "全部作品" : "All Works"}</h2>
            </div>
            <label className="search-box">
              <span>{lang === "zh" ? "搜索" : "Search"}</span>
              <input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={lang === "zh" ? "输入标题、摘要或标签" : "Search title, summary, or tags"} />
            </label>
          </div>
          <div className="filters" role="tablist" aria-label="work types">
            {categories.map((item) => (
              <button className="filter-btn" type="button" key={item} aria-selected={type === item} onClick={() => setType(item)}>
                {item === "all" ? labels.all : labels[item] || item}
              </button>
            ))}
          </div>
          <div className="work-grid">
            {filteredWorks.map((work) => <WorkCard key={work.slug} work={work} lang={lang} />)}
          </div>
        </section>

        <section id="timeline" className="section">
          <p className="eyebrow">{lang === "zh" ? "成长时间线" : "Growth Timeline"}</p>
          <h2>{lang === "zh" ? "持续创作记录" : "Making Progress Over Time"}</h2>
          <div className="timeline-grid">
            {timeline.map(([month, works]) => (
              <article className="timeline-card" key={month}>
                <strong>{month}</strong>
                <div className="timeline-list">
                  {works.slice(0, 4).map((work) => (
                    <a key={work.slug} href={`/works/${work.slug}?lang=${lang}`}>
                      <span>{translations[lang][work.type || work.category] || work.type || work.category}</span>
                      <span>{localizedField(work, "title", lang)}</span>
                    </a>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <span>© {new Date().getFullYear()} 豆芽空间</span>
        <span>Cloudflare Workers · D1 · R2</span>
      </footer>
    </>
  );
}
