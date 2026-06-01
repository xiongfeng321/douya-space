import { createUser, listUsers, requireParent } from "@/lib/auth";
import { getCloudflareEnv } from "@/lib/cloudflare";

export async function GET(request) {
  const env = await getCloudflareEnv();
  const { response } = await requireParent(request, env);
  if (response) return response;

  return Response.json({ users: await listUsers(env) });
}

export async function POST(request) {
  const env = await getCloudflareEnv();
  const { response } = await requireParent(request, env);
  if (response) return response;

  try {
    const user = await createUser(env, await request.json());
    return Response.json({ ok: true, user });
  } catch (error) {
    return Response.json({ error: error.message || "创建用户失败" }, { status: 400 });
  }
}
