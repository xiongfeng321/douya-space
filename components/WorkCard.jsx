import Link from "next/link";
import { localizedField, translations } from "@/lib/sample-data";

export default function WorkCard({ work, lang = "zh", featured = false }) {
  const coverStyle = work.cover_image
    ? { "--cover": `linear-gradient(rgba(22,32,42,0.12), rgba(22,32,42,0.12)), url("${work.cover_image}")` }
    : { "--cover": work.cover_style };

  const type = work.type || work.category || "original";
  const typeLabel = translations[lang][type] || type;
  const tagText = (work.tags || []).slice(0, 3);

  return (
    <Link className={`work-card${featured ? " featured-card" : ""}`} href={`/works/${work.slug}?lang=${lang}`}>
      <span className="cover" style={coverStyle} />
      <span className="work-body">
        <span className="work-meta">
          <span>{typeLabel}</span>
          <span>{work.published_at || "--"}</span>
        </span>
        <strong className="work-title">{localizedField(work, "title", lang)}</strong>
        <span className="work-summary">{localizedField(work, "summary", lang)}</span>
        <span className="tag-row">
          {tagText.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </span>
      </span>
    </Link>
  );
}
