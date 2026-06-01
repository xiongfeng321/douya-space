import { requireAdmin } from "@/lib/auth";
import { getCloudflareEnv } from "@/lib/cloudflare";
import { deleteWork, getWork, prepareWork, upsertWork, validateWork } from "@/lib/works";

export async function PATCH(request, { params }) {
  const { slug } = await params;
  const env = await getCloudflareEnv();
  const { user, response } = await requireAdmin(request, env);
  if (response) return response;

  const existing = await getWork(env, slug);
  if (existing?.is_published && !user.isParent) {
    return Response.json({ error: "Only parent role can edit published works" }, { status: 403 });
  }

  const payload = await request.json();
  const work = prepareWork({ ...(existing || {}), ...payload, slug }, user.role);
  const validationError = validateWork(work);

  if (validationError) {
    return Response.json({ error: validationError }, { status: 400 });
  }

  if (work.is_published && !user.isParent) {
    return Response.json({ error: "Only parent role can publish works" }, { status: 403 });
  }

  const saved = await upsertWork(env, work);
  return Response.json({ ok: true, work: saved });
}

export async function DELETE(request, { params }) {
  const { slug } = await params;
  const env = await getCloudflareEnv();
  const { user, response } = await requireAdmin(request, env);
  if (response) return response;
  if (!user.isParent) {
    return Response.json({ error: "Only parent role can delete works" }, { status: 403 });
  }

  await deleteWork(env, slug);

  return Response.json({ ok: true });
}
