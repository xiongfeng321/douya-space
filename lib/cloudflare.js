export async function getCloudflareEnv() {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    return getCloudflareContext().env || {};
  } catch {
    return {};
  }
}

export function getUserRole(request, env = {}) {
  const email = request?.headers?.get("cf-access-authenticated-user-email") || "";
  const parentEmails = (env.PARENT_EMAILS || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return parentEmails.includes(email.toLowerCase()) ? "parent" : "child";
}
