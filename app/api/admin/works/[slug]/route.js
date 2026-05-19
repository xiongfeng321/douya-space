import { getCloudflareEnv, getUserRole } from "@/lib/cloudflare";
import { deleteWork, getWork, prepareWork, upsertWork, validateWork } from "@/lib/works";

export async function PATCH(request, { params }) {
  const { slug } = await params;
  const env = await getCloudflareEnv();
  const role = getUserRole(request, env);
  const existing = await getWork(env, slug);
  const payload = await request.json();
  const work = prepareWork({ ...(existing || {}), ...payload, slug }, role);
  const validationError = validateWork(work);

  if (validationError) {
    return Response.json({ error: validationError }, { status: 400 });
  }

  if (work.is_published && role !== "parent") {
    return Response.json({ error: "Only parent role can publish works" }, { status: 403 });
  }

  const saved = await upsertWork(env, work);
  return Response.json({ ok: true, work: saved });
}

export async function DELETE(_request, { params }) {
  const { slug } = await params;
  const env = await getCloudflareEnv();
  await deleteWork(env, slug);

  return Response.json({ ok: true });
}
