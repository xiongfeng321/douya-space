import { getCloudflareEnv, requireAdmin } from "@/lib/cloudflare";

function safeName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function POST(request) {
  const env = await getCloudflareEnv();
  const { response } = requireAdmin(request, env);
  if (response) return response;

  if (!env.MEDIA_BUCKET) {
    return Response.json({ error: "R2 binding MEDIA_BUCKET is not configured" }, { status: 503 });
  }

  const form = await request.formData();
  const file = form.get("file");

  if (!file || typeof file === "string") {
    return Response.json({ error: "file is required" }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return Response.json({ error: "only image uploads are supported" }, { status: 400 });
  }

  const key = `works/${crypto.randomUUID()}-${safeName(file.name || "cover.jpg")}`;
  await env.MEDIA_BUCKET.put(key, file.stream(), {
    httpMetadata: { contentType: file.type }
  });

  const publicUrl = env.MEDIA_PUBLIC_URL || "";
  const url = publicUrl ? `${publicUrl.replace(/\/$/, "")}/${key}` : `/${key}`;

  return Response.json({ key, url });
}
