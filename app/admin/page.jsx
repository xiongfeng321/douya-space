import AdminConsole from "@/components/AdminConsole";
import SiteHeader from "@/components/SiteHeader";
import { getCloudflareEnv, getUserContext } from "@/lib/cloudflare";
import { listWorks } from "@/lib/works";
import { headers } from "next/headers";

export const metadata = {
  title: "豆芽空间 | 管理台"
};

export default async function AdminPage() {
  const env = await getCloudflareEnv();
  const requestHeaders = await headers();
  const user = getUserContext({ headers: requestHeaders }, env);

  if (!user.authenticated) {
    return (
      <>
        <SiteHeader admin />
        <main className="page-shell">
          <section className="admin-hero">
            <p className="eyebrow">Access Required</p>
            <h1>管理台需要登录</h1>
            <p className="rich-text">请先在 Cloudflare Zero Trust Access 中允许当前邮箱访问 /admin 和 /api/admin/*。</p>
          </section>
        </main>
      </>
    );
  }

  const works = await listWorks(env);

  return (
    <>
      <SiteHeader admin />
      <AdminConsole initialWorks={works} user={user} />
    </>
  );
}
