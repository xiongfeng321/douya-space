import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import { getCloudflareEnv } from "@/lib/cloudflare";
import { getWork } from "@/lib/works";
import { localizedField, translations } from "@/lib/sample-data";

export async function generateMetadata({ params, searchParams }) {
  const { slug } = await params;
  const query = await searchParams;
  const env = await getCloudflareEnv();
  const work = await getWork(env, slug, { publishedOnly: true });
  const lang = query?.lang === "en" ? "en" : "zh";

  if (!work) return { title: "作品不存在 | 豆芽空间" };

  return {
    title: `${localizedField(work, "title", lang)} | 豆芽空间`,
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
    ? { "--cover": `linear-gradient(rgba(22,32,42,0.08), rgba(22,32,42,0.08)), url("${work.cover_image}")` }
    : { "--cover": work.cover_style };

  return (
    <>
      <SiteHeader />
      <main className="page-shell">
        <section className="detail-layout">
          <div className="detail-content">
            <p className="eyebrow">{translations[lang][work.category] || work.category}</p>
            <h1>{localizedField(work, "title", lang)}</h1>
            <p className="rich-text">{localizedField(work, "content", lang) || localizedField(work, "summary", lang)}</p>
            <div className="tag-row">
              {(work.tags || []).map((tag) => <span key={tag}>{tag}</span>)}
            </div>
            <div className="action-row" style={{ marginTop: 24 }}>
              <Link className="button-secondary" href={`/?lang=${lang}#works`}>
                {lang === "zh" ? "返回作品库" : "Back to Works"}
              </Link>
              {work.code_url && work.code_url !== "#" && (
                <a className="button-primary" href={work.code_url} target="_blank" rel="noreferrer noopener">
                  {lang === "zh" ? "查看代码" : "View Code"}
                </a>
              )}
              {work.demo_url && work.demo_url !== "#" && (
                <a className="button-primary" href={work.demo_url} target="_blank" rel="noreferrer noopener">
                  {lang === "zh" ? "打开演示" : "Open Demo"}
                </a>
              )}
            </div>
          </div>
          <div className="detail-cover" style={coverStyle} aria-label={localizedField(work, "title", lang)} />
        </section>
      </main>
      <footer className="site-footer">
        <span>© {new Date().getFullYear()} 豆芽空间</span>
        <span>{work.published_at}</span>
      </footer>
    </>
  );
}
