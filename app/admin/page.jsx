import AdminConsole from "@/components/AdminConsole";
import SiteHeader from "@/components/SiteHeader";
import { getCloudflareEnv } from "@/lib/cloudflare";
import { listWorks } from "@/lib/works";

export const metadata = {
  title: "豆芽空间 | 管理台"
};

export default async function AdminPage() {
  const env = await getCloudflareEnv();
  const works = await listWorks(env);

  return (
    <>
      <SiteHeader admin />
      <AdminConsole initialWorks={works} />
    </>
  );
}
