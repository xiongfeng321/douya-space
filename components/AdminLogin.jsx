"use client";

import { useState } from "react";

export default function AdminLogin({ setupRequired, parentEmails }) {
  const [email, setEmail] = useState(parentEmails?.[0] || "");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setStatus(setupRequired ? "正在初始化管理员账号..." : "正在登录...");

    const response = await fetch(setupRequired ? "/api/auth/setup" : "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, password })
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setStatus(payload.error || "操作失败，请检查邮箱和密码");
      setSubmitting(false);
      return;
    }

    window.location.reload();
  }

  return (
    <main className="page-shell auth-shell">
      <section className="auth-card panel">
        <p className="eyebrow">{setupRequired ? "First setup" : "Admin login"}</p>
        <h1>{setupRequired ? "初始化家长管理员" : "后台登录"}</h1>
        <p className="rich-text">
          {setupRequired
            ? "第一次使用需要创建家长管理员账号。请使用已配置的家长邮箱，并设置一个新的后台密码。"
            : "使用后台账号密码登录，不再需要 Cloudflare Access。"}
        </p>

        <form className="auth-form" onSubmit={submit}>
          <label className="form-field">
            邮箱
            <input className="input" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          {setupRequired && (
            <label className="form-field">
              昵称
              <input className="input" value={name} placeholder="家长" onChange={(event) => setName(event.target.value)} />
            </label>
          )}
          <label className="form-field">
            密码
            <input className="input" type="password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          <button className="button-primary" type="submit" disabled={submitting}>
            {setupRequired ? "创建管理员并登录" : "登录后台"}
          </button>
        </form>
        <p className="muted" role="status">{status}</p>
      </section>
    </main>
  );
}
