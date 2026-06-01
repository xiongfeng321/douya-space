import AdminConsole from "@/components/AdminConsole";
import AdminLogin from "@/components/AdminLogin";
import SiteHeader from "@/components/SiteHeader";
import { getAuthState, listUsers } from "@/lib/auth";
import { getCloudflareEnv } from "@/lib/cloudflare";
import { listWorks } from "@/lib/works";
import { headers } from "next/headers";

export const metadata = {
  title: "豆芽空间 | 管理台"
};

export default async function AdminPage() {
  const env = await getCloudflareEnv();
  const requestHeaders = await headers();
  const auth = await getAuthState({ headers: requestHeaders }, env);

  if (!auth.authenticated) {
    return (
      <>
        <SiteHeader admin />
        <AdminLogin setupRequired={auth.setupRequired} parentEmails={auth.parentEmails} />
      </>
    );
  }

  const works = await listWorks(env);
  const users = auth.user.isParent ? await listUsers(env) : [];

  return (
    <>
      <SiteHeader admin />
      <AdminConsole initialWorks={works} initialUsers={users} user={auth.user} />
    </>
  );
}
