const SESSION_COOKIE = "douya_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const PASSWORD_ITERATIONS = 100000;

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function base64UrlEncode(bytes) {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function textBytes(value) {
  return new TextEncoder().encode(value);
}

function getSessionSecret(env = {}) {
  return env.SESSION_SECRET || env.PARENT_EMAILS || "douya-space-development-session-secret";
}

function shouldUseSecureCookie(env = {}) {
  return !(env.NEXTJS_ENV === "development" || process.env.NODE_ENV === "development");
}

function getConfiguredParentEmails(env = {}) {
  return `${env.PARENT_EMAILS || ""},${env.ADMIN_EMAILS || ""}`
    .split(",")
    .map(normalizeEmail)
    .filter(Boolean);
}

export function isConfiguredParentEmail(env, email) {
  const parentEmails = getConfiguredParentEmails(env);
  const normalized = normalizeEmail(email);
  return parentEmails.length === 0 || parentEmails.includes(normalized);
}

export async function ensureAuthSchema(env = {}) {
  if (!env.DB) return;

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL CHECK (role IN ('parent', 'child')),
      password_hash TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_login_at TEXT NOT NULL DEFAULT ''
    )
  `).run();

  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)").run();
}

async function importPasswordKey(password) {
  return crypto.subtle.importKey("raw", textBytes(password), "PBKDF2", false, ["deriveBits"]);
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await importPasswordKey(password);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: PASSWORD_ITERATIONS },
    key,
    256
  );

  return `pbkdf2_sha256$${PASSWORD_ITERATIONS}$${base64UrlEncode(salt)}$${base64UrlEncode(bits)}`;
}

export async function verifyPassword(password, storedHash) {
  const [algorithm, iterations, saltValue, hashValue] = String(storedHash || "").split("$");
  if (algorithm !== "pbkdf2_sha256" || !iterations || !saltValue || !hashValue) return false;

  const key = await importPasswordKey(password);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: base64UrlDecode(saltValue), iterations: Number(iterations) },
    key,
    256
  );

  return base64UrlEncode(bits) === hashValue;
}

function toPublicUser(row) {
  if (!row) return null;

  const role = row.role === "parent" ? "parent" : "child";
  return {
    id: row.id,
    email: row.email,
    name: row.name || "",
    role,
    isParent: role === "parent",
    is_active: row.is_active === 1 || row.is_active === true,
    created_at: row.created_at || "",
    updated_at: row.updated_at || "",
    last_login_at: row.last_login_at || ""
  };
}

export async function countUsers(env = {}) {
  if (!env.DB) return 1;
  await ensureAuthSchema(env);
  const row = await env.DB.prepare("SELECT COUNT(*) AS count FROM users").first();
  return Number(row?.count || 0);
}

export async function listUsers(env = {}) {
  if (!env.DB) return [];
  await ensureAuthSchema(env);
  const result = await env.DB.prepare(`
    SELECT id, email, name, role, is_active, created_at, updated_at, last_login_at
    FROM users
    ORDER BY role DESC, email ASC
  `).all();
  return (result.results || []).map(toPublicUser);
}

export async function getUserById(env = {}, id) {
  if (!env.DB || !id) return null;
  await ensureAuthSchema(env);
  const row = await env.DB.prepare(`
    SELECT id, email, name, role, is_active, created_at, updated_at, last_login_at
    FROM users
    WHERE id = ?
    LIMIT 1
  `).bind(id).first();
  return toPublicUser(row);
}

async function getUserWithPasswordByEmail(env = {}, email) {
  if (!env.DB) return null;
  await ensureAuthSchema(env);
  return env.DB.prepare("SELECT * FROM users WHERE email = ? LIMIT 1").bind(normalizeEmail(email)).first();
}

export async function createUser(env = {}, input = {}) {
  if (!env.DB) throw new Error("Database is not configured");

  await ensureAuthSchema(env);
  const email = normalizeEmail(input.email);
  const password = String(input.password || "");
  const role = input.role === "parent" ? "parent" : "child";

  if (!email || !email.includes("@")) throw new Error("请输入有效邮箱");
  if (password.length < 6) throw new Error("密码至少 6 位");

  const now = new Date().toISOString();
  const user = {
    id: crypto.randomUUID(),
    email,
    name: String(input.name || "").trim(),
    role,
    password_hash: await hashPassword(password),
    is_active: input.is_active === false ? 0 : 1,
    created_at: now,
    updated_at: now,
    last_login_at: ""
  };

  await env.DB.prepare(`
    INSERT INTO users (id, email, name, role, password_hash, is_active, created_at, updated_at, last_login_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    user.id,
    user.email,
    user.name,
    user.role,
    user.password_hash,
    user.is_active,
    user.created_at,
    user.updated_at,
    user.last_login_at
  ).run();

  return toPublicUser(user);
}

export async function createInitialParent(env = {}, input = {}) {
  const existingUsers = await countUsers(env);
  if (existingUsers > 0) throw new Error("管理员账号已经初始化");
  if (!isConfiguredParentEmail(env, input.email)) throw new Error("这个邮箱不在家长邮箱名单中");
  return createUser(env, { ...input, role: "parent", is_active: true });
}

export async function updateUser(env = {}, id, input = {}) {
  if (!env.DB || !id) throw new Error("Database is not configured");

  await ensureAuthSchema(env);
  const existing = await env.DB.prepare("SELECT * FROM users WHERE id = ? LIMIT 1").bind(id).first();
  if (!existing) throw new Error("用户不存在");

  const next = {
    email: normalizeEmail(input.email || existing.email),
    name: String(input.name ?? existing.name ?? "").trim(),
    role: input.role === "parent" ? "parent" : "child",
    is_active: input.is_active === false ? 0 : 1,
    password_hash: existing.password_hash,
    updated_at: new Date().toISOString()
  };

  if (!next.email || !next.email.includes("@")) throw new Error("请输入有效邮箱");
  if (input.password) {
    if (String(input.password).length < 6) throw new Error("密码至少 6 位");
    next.password_hash = await hashPassword(input.password);
  }

  await env.DB.prepare(`
    UPDATE users
    SET email = ?, name = ?, role = ?, is_active = ?, password_hash = ?, updated_at = ?
    WHERE id = ?
  `).bind(
    next.email,
    next.name,
    next.role,
    next.is_active,
    next.password_hash,
    next.updated_at,
    id
  ).run();

  return getUserById(env, id);
}

export async function deleteUser(env = {}, id) {
  if (!env.DB || !id) throw new Error("Database is not configured");
  await ensureAuthSchema(env);
  await env.DB.prepare("DELETE FROM users WHERE id = ?").bind(id).run();
  return { ok: true };
}

async function signPayload(payload, env = {}) {
  const key = await crypto.subtle.importKey("raw", textBytes(getSessionSecret(env)), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, textBytes(payload));
  return base64UrlEncode(signature);
}

async function createSessionToken(user, env = {}) {
  const payload = base64UrlEncode(textBytes(JSON.stringify({
    id: user.id,
    email: user.email,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
  })));
  return `${payload}.${await signPayload(payload, env)}`;
}

async function verifySessionToken(token, env = {}) {
  const [payload, signature] = String(token || "").split(".");
  if (!payload || !signature) return null;
  if ((await signPayload(payload, env)) !== signature) return null;

  const session = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload)));
  if (!session.exp || session.exp < Math.floor(Date.now() / 1000)) return null;
  return session;
}

function parseCookieHeader(header = "") {
  return Object.fromEntries(
    String(header || "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      })
  );
}

export async function createSessionCookie(user, env = {}) {
  const token = await createSessionToken(user, env);
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${SESSION_TTL_SECONDS}; HttpOnly; SameSite=Lax${shouldUseSecureCookie(env) ? "; Secure" : ""}`;
}

export function clearSessionCookie(env = {}) {
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${shouldUseSecureCookie(env) ? "; Secure" : ""}`;
}

export async function getSessionUser(request, env = {}) {
  if (!env.DB && process.env.NODE_ENV === "development") {
    return {
      id: "local-dev",
      email: "local-dev@example.com",
      name: "Local Dev",
      role: "parent",
      isParent: true,
      is_active: true
    };
  }

  const cookies = parseCookieHeader(request?.headers?.get("cookie") || "");
  const session = await verifySessionToken(cookies[SESSION_COOKIE], env);
  if (!session?.id) return null;

  const user = await getUserById(env, session.id);
  if (!user?.is_active) return null;
  return user;
}

export async function getAuthState(request, env = {}) {
  const totalUsers = await countUsers(env);
  const user = await getSessionUser(request, env);
  return {
    user,
    authenticated: Boolean(user),
    hasUsers: totalUsers > 0,
    setupRequired: totalUsers === 0,
    parentEmails: getConfiguredParentEmails(env)
  };
}

export async function loginUser(env = {}, email, password) {
  const row = await getUserWithPasswordByEmail(env, email);
  if (!row || !(row.is_active === 1 || row.is_active === true)) return null;
  if (!(await verifyPassword(password, row.password_hash))) return null;

  await env.DB.prepare("UPDATE users SET last_login_at = ? WHERE id = ?").bind(new Date().toISOString(), row.id).run();
  return toPublicUser(row);
}

export async function requireAdmin(request, env = {}) {
  const user = await getSessionUser(request, env);
  if (!user) {
    return {
      user: null,
      response: Response.json({ error: "请先登录后台" }, { status: 401 })
    };
  }

  return { user, response: null };
}

export async function requireParent(request, env = {}) {
  const { user, response } = await requireAdmin(request, env);
  if (response) return { user, response };
  if (!user.isParent) {
    return {
      user,
      response: Response.json({ error: "需要家长管理员权限" }, { status: 403 })
    };
  }

  return { user, response: null };
}
