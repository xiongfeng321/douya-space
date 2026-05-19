import Link from "next/link";

export default function SiteHeader({ admin = false }) {
  return (
    <header className="site-header">
      <Link className="brand" href="/">
        <span className="brand-mark">D</span>
        <span>
          <strong>豆芽空间</strong>
          <small>{admin ? "Admin Console" : "Douya Space"}</small>
        </span>
      </Link>
      <nav className="nav-links" aria-label={admin ? "管理导航" : "主导航"}>
        <Link href="/#works">{admin ? "前台" : "作品"}</Link>
        <Link href={admin ? "/admin#editor" : "/#about"}>{admin ? "发布" : "档案"}</Link>
        <Link href="/admin">{admin ? "管理" : "管理"}</Link>
      </nav>
      {!admin && (
        <Link className="icon-button" href="/?lang=en" aria-label="Switch language">
          EN
        </Link>
      )}
    </header>
  );
}
