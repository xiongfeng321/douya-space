import { createInitialParent, createSessionCookie } from "@/lib/auth";
import { getCloudflareEnv } from "@/lib/cloudflare";

export async function POST(request) {
  const env = await getCloudflareEnv();
  const payload = await request.json();

  try {
    const user = await createInitialParent(env, payload);
    const response = Response.json({ ok: true, user });
    response.headers.set("Set-Cookie", await createSessionCookie(user, env));
    return response;
  } catch (error) {
    return Response.json({ error: error.message || "初始化失败" }, { status: 400 });
  }
}
