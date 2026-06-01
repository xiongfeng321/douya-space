import { clearSessionCookie } from "@/lib/auth";
import { getCloudflareEnv } from "@/lib/cloudflare";

export async function POST() {
  const env = await getCloudflareEnv();
  const response = Response.json({ ok: true });
  response.headers.set("Set-Cookie", clearSessionCookie(env));
  return response;
}
