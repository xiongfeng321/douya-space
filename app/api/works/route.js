import { getCloudflareEnv } from "@/lib/cloudflare";
import { listWorks } from "@/lib/works";

export async function GET(request) {
  const env = await getCloudflareEnv();
  const url = new URL(request.url);
  const works = await listWorks(env, {
    publishedOnly: true,
    category: url.searchParams.get("category") || "",
    q: url.searchParams.get("q") || ""
  });

  return Response.json({ works });
}
