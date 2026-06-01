import { createSessionCookie, loginUser } from "@/lib/auth";
import { getCloudflareEnv } from "@/lib/cloudflare";

export async function POST(request) {
  const env = await getCloudflareEnv();
  const payload = await request.json();
  const user = await loginUser(env, payload.email, payload.password);

  if (!user) {
    return Response.json({ error: "邮箱或密码不正确" }, { status: 401 });
  }

  const response = Response.json({ ok: true, user });
  response.headers.set("Set-Cookie", await createSessionCookie(user, env));
  return response;
}
