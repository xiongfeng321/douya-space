"use client";

import { useMemo, useState } from "react";
import WorkCard from "./WorkCard";
import { translations, localizedField } from "@/lib/sample-data";

export default function PortfolioClient({ initialWorks }) {
  const [lang, setLang] = useState("zh");
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const labels = translations[lang];

  const categories = useMemo(() => ["all", ...new Set(initialWorks.map((work) => work.category))], [initialWorks]);
  const filteredWorks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return initialWorks.filter((work) => {
      if (category !== "all" && work.category !== category) return false;
      if (!normalizedQuery) return true;

      return [
        localizedField(work, "title", lang),
        localizedField(work, "summary", lang),
        localizedField(work, "content", lang),
        ...(work.tags || [])
      ].join(" ").toLowerCase().includes(normalizedQuery);
    });
  }, [category, initialWorks, lang, query]);

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
        <nav className="nav-links" aria-label="主导航">
          <a href="#works">{lang === "zh" ? "作品" : "Works"}</a>
          <a href="#about">{lang === "zh" ? "档案" : "Archive"}</a>
          <a href="/admin">{lang === "zh" ? "管理" : "Admin"}</a>
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
                ? "一个持续生长的作品档案，收集编程、绘图、写作和手作实验。"
                : "A growing bilingual archive for code, drawings, writing, and hands-on experiments."}
            </p>
            <div className="hero-actions">
              <a className="button-primary" href="#works">{lang === "zh" ? "浏览作品" : "Explore Works"}</a>
              <a className="button-secondary" href="/admin">{lang === "zh" ? "进入管理台" : "Open Admin"}</a>
            </div>
          </div>
          <div className="signal-panel" aria-hidden="true">
            <div className="scanner-line" />
            <div className="signal-grid">
              {Array.from({ length: 12 }).map((_, index) => <span key={index} />)}
            </div>
            <div className="signal-readout">
              <strong>DOUYA / LAB</strong>
              <small>CODE · ART · ORIGINAL</small>
            </div>
          </div>
        </section>

        <section className="stats-strip" aria-label="作品概览">
          <article><strong>{initialWorks.length}</strong><span>{lang === "zh" ? "公开作品" : "Published Works"}</span></article>
          <article><strong>{categories.length - 1}</strong><span>{lang === "zh" ? "创作分类" : "Categories"}</span></article>
          <article><strong>ZH / EN</strong><span>{lang === "zh" ? "双语展示" : "Bilingual Archive"}</span></article>
        </section>

        <section id="works" className="section">
          <div className="section-head">
            <div>
              <p className="eyebrow">{lang === "zh" ? "作品库" : "Portfolio"}</p>
              <h2>{lang === "zh" ? "最近作品" : "Recent Works"}</h2>
            </div>
            <label className="search-box">
              <span>{lang === "zh" ? "搜索" : "Search"}</span>
              <input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={lang === "zh" ? "输入关键词" : "Type a keyword"} />
            </label>
          </div>
          <div className="filters" role="tablist" aria-label="作品分类">
            {categories.map((item) => (
              <button className="filter-btn" type="button" key={item} aria-selected={category === item} onClick={() => setCategory(item)}>
                {item === "all" ? labels.all : labels[item] || item}
              </button>
            ))}
          </div>
          <div className="work-grid">
            {filteredWorks.map((work) => <WorkCard key={work.slug} work={work} lang={lang} />)}
          </div>
        </section>

        <section id="about" className="section">
          <p className="eyebrow">{lang === "zh" ? "创作档案" : "Creator Archive"}</p>
          <h2>{lang === "zh" ? "为每一次创造留下记录" : "A record for every act of making"}</h2>
          <p className="rich-text">
            {lang === "zh"
              ? "豆芽空间把项目、草图、故事和实验过程整理成可持续更新的作品库。现在作品详情拥有独立页面，管理台支持编辑、下线、删除和图片处理。"
              : "Douya Space turns projects, sketches, stories, and experiments into a portfolio that can keep growing. Works now have standalone pages, and the admin console supports editing, unpublishing, deleting, and image processing."}
          </p>
        </section>
      </main>

      <footer className="site-footer">
        <span>© {new Date().getFullYear()} 豆芽空间</span>
        <span>Cloudflare Workers · D1 · R2</span>
      </footer>
    </>
  );
}
