import { getCloudflareEnv, requireAdmin } from "@/lib/cloudflare";
import { listWorks, prepareWork, upsertWork, validateWork } from "@/lib/works";

export async function GET(request) {
  const env = await getCloudflareEnv();
  const { response } = requireAdmin(request, env);
  if (response) return response;

  const works = await listWorks(env);

  return Response.json({ works });
}

export async function POST(request) {
  const env = await getCloudflareEnv();
  const { user, response } = requireAdmin(request, env);
  if (response) return response;

  const payload = await request.json();
  const work = prepareWork(payload, user.role);
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
