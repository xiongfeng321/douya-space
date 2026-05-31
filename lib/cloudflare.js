export async function getCloudflareEnv() {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    return getCloudflareContext().env || {};
  } catch {
    return {};
  }
}

export function getAccessEmail(request) {
  return request?.headers?.get("cf-access-authenticated-user-email")?.trim().toLowerCase() || "";
}

export function getParentEmails(env = {}) {
  return (env.PARENT_EMAILS || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function isLocalDevelopment(env = {}) {
  return env.NEXTJS_ENV === "development" || process.env.NODE_ENV === "development";
}

export function getUserRole(request, env = {}) {
  const email = getAccessEmail(request);
  const parentEmails = (env.PARENT_EMAILS || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return parentEmails.includes(email.toLowerCase()) ? "parent" : "child";
}

export function getUserContext(request, env = {}) {
  const email = getAccessEmail(request);
  const localDevelopment = isLocalDevelopment(env);
  const parentEmails = getParentEmails(env);
  const role = email && parentEmails.includes(email) ? "parent" : "child";

  return {
    email: email || (localDevelopment ? "local-dev@example.com" : ""),
    authenticated: Boolean(email) || localDevelopment,
    localDevelopment,
    role: localDevelopment && !email ? "parent" : role,
    isParent: localDevelopment && !email ? true : role === "parent"
  };
}

export function requireAdmin(request, env = {}) {
  const user = getUserContext(request, env);
  if (!user.authenticated) {
    return {
      user,
      response: Response.json({ error: "Cloudflare Access login is required" }, { status: 401 })
    };
  }

  return { user, response: null };
}
