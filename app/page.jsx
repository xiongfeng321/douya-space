import PortfolioClient from "@/components/PortfolioClient";
import { getCloudflareEnv } from "@/lib/cloudflare";
import { listWorks } from "@/lib/works";

export default async function HomePage() {
  const env = await getCloudflareEnv();
  const works = await listWorks(env, { publishedOnly: true });

  return <PortfolioClient initialWorks={works} />;
}
