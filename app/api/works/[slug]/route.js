import { getCloudflareEnv } from "@/lib/cloudflare";
import { getWork } from "@/lib/works";

export async function GET(_request, { params }) {
  const { slug } = await params;
  const env = await getCloudflareEnv();
  const work = await getWork(env, slug, { publishedOnly: true });

  if (!work) {
    return Response.json({ error: "Work not found" }, { status: 404 });
  }

  return Response.json({ work });
}
