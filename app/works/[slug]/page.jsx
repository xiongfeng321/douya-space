import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import { getCloudflareEnv } from "@/lib/cloudflare";
import { getWork } from "@/lib/works";
import { localizedField, translations } from "@/lib/sample-data";

function renderTypeSections(work, lang) {
  const type = work.type || work.category;

  return (
    <>
      {(type === "video" || type === "scratch") && work.media_url && (
        <section className="detail-section">
          <h3>{lang === "zh" ? "作品演示" : "Media Demo"}</h3>
          <div className="embed-wrap">
            <iframe src={work.media_url} title={localizedField(work, "title", lang)} loading="lazy" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
          </div>
        </section>
      )}

      {Array.isArray(work.gallery_images) && work.gallery_images.length > 0 && (
        <section className="detail-section">
          <h3>{lang === "zh" ? "作品画廊" : "Gallery"}</h3>
          <div className="detail-gallery">
            {work.gallery_images.map((src) => (
              <img key={src} src={src} alt={localizedField(work, "title", lang)} />
            ))}
          </div>
        </section>
      )}

      {Array.isArray(work.materials) && work.materials.length > 0 && (
        <section className="detail-section">
          <h3>{lang === "zh" ? "材料清单" : "Materials"}</h3>
          <ul className="detail-list">
            {work.materials.map((material) => <li key={material}>{material}</li>)}
          </ul>
        </section>
      )}

      {Array.isArray(work.process_steps) && work.process_steps.length > 0 && (
        <section className="detail-section">
          <h3>{lang === "zh" ? "创作步骤" : "Process Steps"}</h3>
          <ol className="detail-steps">
            {work.process_steps.map((step, index) => (
              <li key={`${step.title}-${index}`}>
                <strong>{step.title || `${lang === "zh" ? "步骤" : "Step"} ${index + 1}`}</strong>
                {step.detail && <p>{step.detail}</p>}
              </li>
            ))}
          </ol>
        </section>
      )}

      {work.learning_notes && (
        <section className="detail-section">
          <h3>{lang === "zh" ? "学习记录" : "Learning Notes"}</h3>
          <p className="rich-text">{work.learning_notes}</p>
        </section>
      )}

      {work.parent_note && (
        <section className="detail-section">
          <h3>{lang === "zh" ? "家长点评" : "Parent Note"}</h3>
          <p className="rich-text">{work.parent_note}</p>
        </section>
      )}
    </>
  );
}

export async function generateMetadata({ params, searchParams }) {
  const { slug } = await params;
  const query = await searchParams;
  const env = await getCloudflareEnv();
  const work = await getWork(env, slug, { publishedOnly: true });
  const lang = query?.lang === "en" ? "en" : "zh";

  if (!work) return { title: "Work Not Found | Douya Space" };

  return {
    title: `${localizedField(work, "title", lang)} | Douya Space`,
    description: localizedField(work, "summary", lang),
    openGraph: {
      title: localizedField(work, "title", lang),
      description: localizedField(work, "summary", lang)
    }
  };
}

export default async function WorkDetailPage({ params, searchParams }) {
  const { slug } = await params;
  const query = await searchParams;
  const env = await getCloudflareEnv();
  const work = await getWork(env, slug, { publishedOnly: true });
  const lang = query?.lang === "en" ? "en" : "zh";

  if (!work) notFound();

  const coverStyle = work.cover_image
    ? { "--cover": `linear-gradient(rgba(22,32,42,0.1), rgba(22,32,42,0.1)), url("${work.cover_image}")` }
    : { "--cover": work.cover_style };

  const type = work.type || work.category || "original";

  return (
    <>
      <SiteHeader />
      <main className="page-shell">
        <section className="detail-layout">
          <div className="detail-content">
            <p className="eyebrow">{translations[lang][type] || type}</p>
            <h1>{localizedField(work, "title", lang)}</h1>
            <p className="rich-text">{localizedField(work, "content", lang) || localizedField(work, "summary", lang)}</p>
            <div className="tag-row">
              {(work.tags || []).map((tag) => <span key={tag}>{tag}</span>)}
            </div>
            <div className="action-row" style={{ marginTop: 24 }}>
              <Link className="button-secondary" href={`/?lang=${lang}#works`}>
                {lang === "zh" ? "返回作品库" : "Back to Works"}
              </Link>
              {work.code_url && (
                <a className="button-primary" href={work.code_url} target="_blank" rel="noreferrer noopener">
                  {lang === "zh" ? "查看代码" : "View Code"}
                </a>
              )}
              {work.demo_url && (
                <a className="button-primary" href={work.demo_url} target="_blank" rel="noreferrer noopener">
                  {lang === "zh" ? "打开演示" : "Open Demo"}
                </a>
              )}
            </div>
          </div>
          <div className="detail-cover" style={coverStyle} aria-label={localizedField(work, "title", lang)} />
        </section>

        {renderTypeSections(work, lang)}
      </main>
      <footer className="site-footer">
        <span>© {new Date().getFullYear()} 豆芽空间</span>
        <span>{work.published_at || "--"}</span>
      </footer>
    </>
  );
}
