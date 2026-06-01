import { deleteUser, requireParent, updateUser } from "@/lib/auth";
import { getCloudflareEnv } from "@/lib/cloudflare";

export async function PATCH(request, { params }) {
  const { id } = await params;
  const env = await getCloudflareEnv();
  const { response } = await requireParent(request, env);
  if (response) return response;

  try {
    const user = await updateUser(env, id, await request.json());
    return Response.json({ ok: true, user });
  } catch (error) {
    return Response.json({ error: error.message || "更新用户失败" }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const env = await getCloudflareEnv();
  const { user, response } = await requireParent(request, env);
  if (response) return response;

  if (user.id === id) {
    return Response.json({ error: "不能删除当前登录账号" }, { status: 400 });
  }

  try {
    await deleteUser(env, id);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message || "删除用户失败" }, { status: 400 });
  }
}
