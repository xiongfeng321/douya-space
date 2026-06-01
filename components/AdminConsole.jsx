"use client";

import { useEffect, useMemo, useState } from "react";
import { translations } from "@/lib/sample-data";
import { WORK_TYPES } from "@/lib/works";

const emptyForm = {
  id: "",
  slug: "",
  type: "code",
  title_zh: "",
  title_en: "",
  summary_zh: "",
  summary_en: "",
  content_zh: "",
  content_en: "",
  tags: "",
  cover_image: "",
  cover_style: "linear-gradient(135deg, #00a6b8, #8ec63f)",
  code_url: "",
  demo_url: "",
  media_url: "",
  gallery_text: "",
  materials_text: "",
  steps_text: "",
  learning_notes: "",
  parent_note: "",
  featured: false,
  sort_order: 0,
  published_at: "",
  is_published: false
};

const emptyUserForm = {
  id: "",
  email: "",
  name: "",
  role: "child",
  password: "",
  is_active: true
};

function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeWork(work) {
  const gallery = Array.isArray(work.gallery_images) ? work.gallery_images.join("\n") : "";
  const materials = Array.isArray(work.materials) ? work.materials.join("\n") : "";
  const steps = Array.isArray(work.process_steps)
    ? work.process_steps.map((step) => `${step.title || ""}|${step.detail || ""}`).join("\n")
    : "";

  return {
    ...emptyForm,
    ...work,
    type: work.type || work.category || "original",
    tags: Array.isArray(work.tags) ? work.tags.join(", ") : work.tags || "",
    gallery_text: gallery,
    materials_text: materials,
    steps_text: steps,
    featured: Boolean(work.featured),
    sort_order: Number(work.sort_order || 0)
  };
}

function normalizeUser(user) {
  return {
    ...emptyUserForm,
    ...user,
    password: "",
    is_active: user?.is_active !== false
  };
}

function parseLineList(value) {
  return String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseSteps(value) {
  return parseLineList(value).map((line) => {
    const [title, ...rest] = line.split("|");
    return {
      title: (title || "").trim(),
      detail: rest.join("|").trim()
    };
  }).filter((step) => step.title || step.detail);
}

async function compressImage(file, settings) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const targetWidth = 1200;
  const targetHeight = 760;
  const zoom = Number(settings.zoom);
  const offsetX = Number(settings.offsetX) / 100;
  const offsetY = Number(settings.offsetY) / 100;

  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  const sourceRatio = bitmap.width / bitmap.height;
  const targetRatio = targetWidth / targetHeight;
  let sourceWidth = bitmap.width;
  let sourceHeight = bitmap.height;

  if (sourceRatio > targetRatio) {
    sourceWidth = bitmap.height * targetRatio;
  } else {
    sourceHeight = bitmap.width / targetRatio;
  }

  sourceWidth /= zoom;
  sourceHeight /= zoom;
  const maxX = bitmap.width - sourceWidth;
  const maxY = bitmap.height - sourceHeight;
  const sourceX = Math.max(0, Math.min(maxX, maxX * offsetX));
  const sourceY = Math.max(0, Math.min(maxY, maxY * offsetY));

  ctx.drawImage(bitmap, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, targetWidth, targetHeight);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", Number(settings.quality));
  });
}

export default function AdminConsole({ initialWorks, initialUsers = [], user }) {
  const [activeTab, setActiveTab] = useState("works");
  const [works, setWorks] = useState(initialWorks);
  const [users, setUsers] = useState(initialUsers);
  const [form, setForm] = useState(emptyForm);
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [crop, setCrop] = useState({ zoom: 1, offsetX: 50, offsetY: 50, quality: 0.82 });
  const [status, setStatus] = useState("");
  const [userStatus, setUserStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [publishFilter, setPublishFilter] = useState("all");
  const isParent = Boolean(user?.isParent);

  const previewStyle = useMemo(() => {
    if (form.cover_image) return { "--cover": `url("${form.cover_image}")` };
    return { "--cover": form.cover_style };
  }, [form.cover_image, form.cover_style]);

  const filteredWorks = useMemo(() => {
    return works.filter((work) => {
      if (typeFilter !== "all" && (work.type || work.category) !== typeFilter) return false;
      if (publishFilter === "published" && !work.is_published) return false;
      if (publishFilter === "draft" && work.is_published) return false;
      if (!query.trim()) return true;

      const blob = [
        work.title_zh,
        work.title_en,
        work.summary_zh,
        work.summary_en,
        ...(work.tags || [])
      ].join(" ").toLowerCase();

      return blob.includes(query.trim().toLowerCase());
    });
  }, [works, query, typeFilter, publishFilter]);

  useEffect(() => {
    fetch("/api/admin/works")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((payload) => setWorks(payload.works || initialWorks))
      .catch(() => setStatus("Could not refresh works list."));
  }, [initialWorks]);

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function editWork(work) {
    setForm(normalizeWork(work));
    setImagePreview("");
    setSelectedFile(null);
    window.location.hash = "editor";
  }

  function resetForm() {
    setForm(emptyForm);
    setImagePreview("");
    setSelectedFile(null);
  }

  async function processSelectedImage(file = selectedFile) {
    if (!file) return "";

    const blob = await compressImage(file, crop);
    const localUrl = URL.createObjectURL(blob);
    setImagePreview(localUrl);

    const data = new FormData();
    data.append("file", blob, file.name.replace(/\.[^.]+$/, ".jpg"));

    const response = await fetch("/api/admin/upload", { method: "POST", body: data });
    if (!response.ok) {
      setForm((current) => ({ ...current, cover_image: localUrl }));
      setStatus("Image preview is local only; upload failed.");
      return localUrl;
    }

    const payload = await response.json();
    setForm((current) => ({ ...current, cover_image: payload.url }));
    setStatus("Cover image uploaded.");
    return payload.url;
  }

  function toPayload(publishState = form.is_published) {
    const now = new Date().toISOString();
    const slug = form.slug || slugify(form.title_en || form.title_zh);

    return {
      ...form,
      id: form.id || crypto.randomUUID(),
      slug,
      category: form.type,
      type: form.type,
      tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      gallery_images: parseLineList(form.gallery_text),
      materials: parseLineList(form.materials_text),
      process_steps: parseSteps(form.steps_text),
      featured: Boolean(form.featured),
      sort_order: Number(form.sort_order || 0),
      is_published: publishState,
      published_at: publishState ? form.published_at || now.slice(0, 10) : form.published_at || "",
      updated_at: now
    };
  }

  async function saveWork(publishState = form.is_published) {
    if (publishState && !isParent) {
      setStatus("Only parent role can publish.");
      return;
    }

    setSaving(true);
    setStatus("Saving...");

    let coverImage = form.cover_image;
    if (selectedFile && !coverImage.startsWith("http")) {
      coverImage = await processSelectedImage();
    }

    const payload = { ...toPayload(publishState), cover_image: coverImage };
    const method = form.slug ? "PATCH" : "POST";
    const url = form.slug ? `/api/admin/works/${form.slug}` : "/api/admin/works";

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(await response.text());

      const nextWorks = works.filter((item) => item.slug !== payload.slug);
      setWorks([payload, ...nextWorks]);
      setForm(normalizeWork(payload));
      setStatus(publishState ? "Saved and published." : "Saved as draft.");
    } catch {
      setStatus("Save failed. Please retry.");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(work) {
    if (!isParent) {
      setStatus("Only parent role can change publish status.");
      return;
    }

    const nextWork = { ...work, is_published: !work.is_published };
    const response = await fetch(`/api/admin/works/${work.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextWork)
    });
    if (!response.ok) {
      setStatus("Could not change publish status.");
      return;
    }

    setWorks((current) => current.map((item) => (item.slug === work.slug ? nextWork : item)));
  }

  async function removeWork(work) {
    if (!isParent) {
      setStatus("Only parent role can delete works.");
      return;
    }

    const confirmed = window.confirm(`Delete "${work.title_zh}"?`);
    if (!confirmed) return;

    const response = await fetch(`/api/admin/works/${work.slug}`, { method: "DELETE" });
    if (!response.ok) {
      setStatus("Delete failed.");
      return;
    }

    setWorks((current) => current.filter((item) => item.slug !== work.slug));
    if (form.slug === work.slug) resetForm();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.reload();
  }

  function editUser(nextUser) {
    setUserForm(normalizeUser(nextUser));
    setActiveTab("users");
    window.location.hash = "users";
  }

  function resetUserForm() {
    setUserForm(emptyUserForm);
  }

  async function saveUser(event) {
    event.preventDefault();
    setUserStatus("Saving user...");

    const payload = {
      email: userForm.email,
      name: userForm.name,
      role: userForm.role,
      is_active: userForm.is_active
    };
    if (userForm.password) payload.password = userForm.password;

    const response = await fetch(userForm.id ? `/api/admin/users/${userForm.id}` : "/api/admin/users", {
      method: userForm.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setUserStatus(data.error || "Save user failed.");
      return;
    }

    setUsers((current) => [data.user, ...current.filter((item) => item.id !== data.user.id)]);
    resetUserForm();
    setUserStatus("User saved.");
  }

  async function removeUser(nextUser) {
    if (nextUser.id === user.id) {
      setUserStatus("Cannot delete current user.");
      return;
    }
    if (!window.confirm(`Delete user ${nextUser.email}?`)) return;

    const response = await fetch(`/api/admin/users/${nextUser.id}`, { method: "DELETE" });
    if (!response.ok) {
      setUserStatus("Delete user failed.");
      return;
    }
    setUsers((current) => current.filter((item) => item.id !== nextUser.id));
  }

  const showCodeFields = form.type === "code" || form.type === "scratch";
  const showMediaEmbed = form.type === "video" || form.type === "scratch";
  const showGallery = form.type === "art" || form.type === "maker" || form.type === "achievement";
  const showProcess = form.type === "maker" || form.type === "code" || form.type === "scratch";
  const showWriting = form.type === "writing" || form.type === "original";

  return (
    <main className="page-shell">
      <section className="admin-hero">
        <p className="eyebrow">Site Admin</p>
        <h1>作品发布台</h1>
        <p className="rich-text">按作品类型发布内容，支持多图、过程步骤、媒体嵌入、精选和排序。</p>
        <div className="admin-account">
          <span>Current: {user?.email || "unknown"} · Role: {isParent ? "parent" : "child"}</span>
          <button className="small-button" type="button" onClick={logout}>Logout</button>
        </div>
      </section>

      <nav className="admin-tabs" aria-label="admin tabs">
        <button type="button" aria-selected={activeTab === "works"} onClick={() => setActiveTab("works")}>Works</button>
        {isParent && <button type="button" aria-selected={activeTab === "users"} onClick={() => setActiveTab("users")}>Users</button>}
      </nav>

      {activeTab === "works" && (
        <>
          <section id="editor" className="editor-layout">
            <form className="work-form panel" onSubmit={(event) => { event.preventDefault(); saveWork(false); }}>
              <div className="section-head">
                <h2>{form.slug ? "Edit Work" : "New Work"}</h2>
                <button className="small-button" type="button" onClick={resetForm}>Reset</button>
              </div>

              <label className="form-field">
                Type
                <select className="select" value={form.type} onChange={(event) => updateField("type", event.target.value)}>
                  {WORK_TYPES.map((type) => (
                    <option key={type} value={type}>{translations.zh[type] || type}</option>
                  ))}
                </select>
              </label>

              <label className="form-field">中文标题<input className="input" required value={form.title_zh} onChange={(event) => updateField("title_zh", event.target.value)} /></label>
              <label className="form-field">English title<input className="input" required value={form.title_en} onChange={(event) => updateField("title_en", event.target.value)} /></label>
              <label className="form-field">Slug<input className="input" value={form.slug} placeholder="Auto generated if empty" onChange={(event) => updateField("slug", event.target.value)} /></label>

              <label className="form-field">中文摘要<textarea className="textarea" required value={form.summary_zh} onChange={(event) => updateField("summary_zh", event.target.value)} /></label>
              <label className="form-field">English summary<textarea className="textarea" required value={form.summary_en} onChange={(event) => updateField("summary_en", event.target.value)} /></label>
              <label className="form-field">中文正文<textarea className="textarea" value={form.content_zh} onChange={(event) => updateField("content_zh", event.target.value)} /></label>
              <label className="form-field">English content<textarea className="textarea" value={form.content_en} onChange={(event) => updateField("content_en", event.target.value)} /></label>

              <label className="form-field">Tags (comma separated)<input className="input" value={form.tags} onChange={(event) => updateField("tags", event.target.value)} /></label>

              {showCodeFields && (
                <>
                  <label className="form-field">Code URL<input className="input" type="url" value={form.code_url} onChange={(event) => updateField("code_url", event.target.value)} /></label>
                  <label className="form-field">Demo URL<input className="input" type="url" value={form.demo_url} onChange={(event) => updateField("demo_url", event.target.value)} /></label>
                </>
              )}

              {showMediaEmbed && (
                <label className="form-field">Media URL (video or embed link)<input className="input" type="url" value={form.media_url} onChange={(event) => updateField("media_url", event.target.value)} /></label>
              )}

              {showGallery && (
                <label className="form-field">
                  Gallery URLs (one per line)
                  <textarea className="textarea" value={form.gallery_text} onChange={(event) => updateField("gallery_text", event.target.value)} />
                </label>
              )}

              {showProcess && (
                <label className="form-field">
                  Process Steps (`title|detail`, one per line)
                  <textarea className="textarea" value={form.steps_text} onChange={(event) => updateField("steps_text", event.target.value)} />
                </label>
              )}

              {(showProcess || form.type === "maker") && (
                <label className="form-field">
                  Materials (one per line)
                  <textarea className="textarea" value={form.materials_text} onChange={(event) => updateField("materials_text", event.target.value)} />
                </label>
              )}

              {(showWriting || form.type === "code" || form.type === "scratch") && (
                <label className="form-field">
                  Learning Notes
                  <textarea className="textarea" value={form.learning_notes} onChange={(event) => updateField("learning_notes", event.target.value)} />
                </label>
              )}

              {isParent && (
                <label className="form-field">
                  Parent Note
                  <textarea className="textarea" value={form.parent_note} onChange={(event) => updateField("parent_note", event.target.value)} />
                </label>
              )}

              <div className="media-tools">
                <label className="form-field">
                  Cover Image
                  <input
                    className="input"
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      setSelectedFile(file || null);
                      setImagePreview(file ? URL.createObjectURL(file) : "");
                    }}
                  />
                </label>
                {imagePreview && (
                  <div className="crop-frame">
                    <img src={imagePreview} alt="crop preview" style={{ "--zoom": crop.zoom, "--offset-x": `${crop.offsetX - 50}%`, "--offset-y": `${crop.offsetY - 50}%` }} />
                  </div>
                )}
                <label className="form-field">Zoom<input type="range" min="1" max="2" step="0.05" value={crop.zoom} onChange={(event) => setCrop({ ...crop, zoom: event.target.value })} /></label>
                <label className="form-field">Offset X<input type="range" min="0" max="100" value={crop.offsetX} onChange={(event) => setCrop({ ...crop, offsetX: event.target.value })} /></label>
                <label className="form-field">Offset Y<input type="range" min="0" max="100" value={crop.offsetY} onChange={(event) => setCrop({ ...crop, offsetY: event.target.value })} /></label>
                <label className="form-field">Quality<input type="range" min="0.5" max="0.95" step="0.05" value={crop.quality} onChange={(event) => setCrop({ ...crop, quality: event.target.value })} /></label>
                <button className="button-secondary" type="button" onClick={() => processSelectedImage()} disabled={!selectedFile}>Upload Cover</button>
              </div>

              <label className="form-field">Cover Gradient<input className="input" value={form.cover_style} onChange={(event) => updateField("cover_style", event.target.value)} /></label>
              <label className="check-field"><input type="checkbox" checked={form.featured} onChange={(event) => updateField("featured", event.target.checked)} /> Featured work</label>
              <label className="form-field">Sort Order<input className="input" type="number" value={form.sort_order} onChange={(event) => updateField("sort_order", event.target.value)} /></label>
              <label className="form-field">Published Date<input className="input" type="date" value={form.published_at} onChange={(event) => updateField("published_at", event.target.value)} /></label>

              <div className="action-row">
                <button className="button-secondary" type="submit" disabled={saving}>Save Draft</button>
                <button className="button-primary" type="button" onClick={() => saveWork(true)} disabled={saving || !isParent}>Save & Publish</button>
              </div>
              <p className="muted" role="status">{status}</p>
            </form>

            <aside className="preview-panel panel">
              <h2>Card Preview</h2>
              <article className="preview-card">
                <div className="preview-cover" style={previewStyle} />
                <div className="preview-body">
                  <p className="eyebrow">{translations.zh[form.type] || form.type}</p>
                  <h3>{form.title_zh || "Untitled"}</h3>
                  <p>{form.summary_zh || "Summary preview..."}</p>
                  <span className="tag-row">
                    {form.tags.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}
                  </span>
                </div>
              </article>
            </aside>
          </section>

          <section className="list-panel panel">
            <div className="section-head">
              <h2>Works</h2>
              <span className="muted">{filteredWorks.length} / {works.length}</span>
            </div>
            <div className="filters admin-filters">
              <input className="input admin-filter-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title/summary/tag" />
              <select className="select admin-filter-select" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                <option value="all">All types</option>
                {WORK_TYPES.map((type) => <option key={type} value={type}>{translations.zh[type] || type}</option>)}
              </select>
              <select className="select admin-filter-select" value={publishFilter} onChange={(event) => setPublishFilter(event.target.value)}>
                <option value="all">All status</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>

            <div className="work-table">
              {filteredWorks.map((work) => (
                <article className="work-row" key={work.slug}>
                  <span>
                    <strong>{work.title_zh}</strong>
                    <span className="table-meta">
                      <span>{translations.zh[work.type || work.category] || work.type || work.category}</span>
                      <span>{work.featured ? "Featured" : "Normal"}</span>
                      <span>{work.is_published ? "Published" : "Draft"}</span>
                    </span>
                  </span>
                  <span className="row-actions">
                    <button className="small-button" type="button" onClick={() => editWork(work)}>Edit</button>
                    <button className="small-button" type="button" onClick={() => togglePublish(work)} disabled={!isParent}>{work.is_published ? "Unpublish" : "Publish"}</button>
                    <button className="small-button danger" type="button" onClick={() => removeWork(work)} disabled={!isParent}>Delete</button>
                  </span>
                </article>
              ))}
            </div>
          </section>
        </>
      )}

      {activeTab === "users" && isParent && (
        <section id="users" className="user-admin panel">
          <div className="section-head">
            <h2>User Management</h2>
            <button className="small-button" type="button" onClick={resetUserForm}>New User</button>
          </div>

          <form className="user-form" onSubmit={saveUser}>
            <label className="form-field">Email<input className="input" type="email" required value={userForm.email} onChange={(event) => setUserForm({ ...userForm, email: event.target.value })} /></label>
            <label className="form-field">Name<input className="input" value={userForm.name} onChange={(event) => setUserForm({ ...userForm, name: event.target.value })} /></label>
            <label className="form-field">Role<select className="select" value={userForm.role} onChange={(event) => setUserForm({ ...userForm, role: event.target.value })}><option value="child">Child</option><option value="parent">Parent</option></select></label>
            <label className="form-field">Password<input className="input" type="password" minLength={6} required={!userForm.id} placeholder={userForm.id ? "Leave blank to keep" : "At least 6 chars"} value={userForm.password} onChange={(event) => setUserForm({ ...userForm, password: event.target.value })} /></label>
            <label className="check-field"><input type="checkbox" checked={userForm.is_active} onChange={(event) => setUserForm({ ...userForm, is_active: event.target.checked })} /> Active account</label>
            <button className="button-primary" type="submit">{userForm.id ? "Update User" : "Create User"}</button>
          </form>
          <p className="muted" role="status">{userStatus}</p>

          <div className="user-table">
            {users.map((nextUser) => (
              <article className="user-row" key={nextUser.id}>
                <span>
                  <strong>{nextUser.email}</strong>
                  <span className="table-meta">
                    <span>{nextUser.name || "No name"}</span>
                    <span>{nextUser.role === "parent" ? "Parent" : "Child"}</span>
                    <span>{nextUser.is_active ? "Active" : "Inactive"}</span>
                  </span>
                </span>
                <span className="row-actions">
                  <button className="small-button" type="button" onClick={() => editUser(nextUser)}>Edit</button>
                  <button className="small-button danger" type="button" onClick={() => removeUser(nextUser)} disabled={nextUser.id === user.id}>Delete</button>
                </span>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
