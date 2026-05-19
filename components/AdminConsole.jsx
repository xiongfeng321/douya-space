"use client";

import { useEffect, useMemo, useState } from "react";

const emptyForm = {
  id: "",
  slug: "",
  title_zh: "",
  title_en: "",
  summary_zh: "",
  summary_en: "",
  content_zh: "",
  content_en: "",
  category: "code",
  tags: "",
  cover_image: "",
  cover_style: "linear-gradient(135deg, #00a6b8, #8ec63f)",
  code_url: "",
  demo_url: "",
  is_published: false
};

function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeWork(work) {
  return {
    ...emptyForm,
    ...work,
    tags: Array.isArray(work.tags) ? work.tags.join(", ") : work.tags || ""
  };
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

export default function AdminConsole({ initialWorks }) {
  const [works, setWorks] = useState(initialWorks);
  const [form, setForm] = useState(emptyForm);
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [crop, setCrop] = useState({ zoom: 1, offsetX: 50, offsetY: 50, quality: 0.82 });
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const previewStyle = useMemo(() => {
    if (form.cover_image) return { "--cover": `url("${form.cover_image}")` };
    return { "--cover": form.cover_style };
  }, [form.cover_image, form.cover_style]);

  useEffect(() => {
    fetch("/api/admin/works")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((payload) => setWorks(payload.works || initialWorks))
      .catch(() => setStatus("本地预览模式：API 不可用，列表使用内置数据。"));
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

    try {
      const response = await fetch("/api/admin/upload", { method: "POST", body: data });
      if (!response.ok) throw new Error(await response.text());
      const payload = await response.json();
      setForm((current) => ({ ...current, cover_image: payload.url }));
      setStatus("图片已裁剪压缩并上传。");
      return payload.url;
    } catch {
      setForm((current) => ({ ...current, cover_image: localUrl }));
      setStatus("本地预览模式：图片已裁剪压缩，但未上传到 R2。");
      return localUrl;
    }
  }

  function toPayload(publishState = form.is_published) {
    const now = new Date().toISOString();
    return {
      ...form,
      id: form.id || crypto.randomUUID(),
      slug: form.slug || slugify(form.title_en || form.title_zh),
      tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      is_published: publishState,
      published_at: publishState ? form.published_at || now.slice(0, 10) : form.published_at || "",
      updated_at: now
    };
  }

  async function saveWork(publishState = form.is_published) {
    setSaving(true);
    setStatus("正在保存...");

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
      setStatus(publishState ? "作品已保存并发布。" : "作品已保存为草稿。");
    } catch {
      const nextWorks = works.filter((item) => item.slug !== payload.slug);
      setWorks([payload, ...nextWorks]);
      setForm(normalizeWork(payload));
      setStatus("本地预览模式：API 不可用，变更只保存在当前页面状态。");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(work) {
    const nextWork = { ...work, is_published: !work.is_published };
    try {
      await fetch(`/api/admin/works/${work.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextWork)
      });
    } catch {
      setStatus("本地预览模式：发布状态只在当前页面更新。");
    }
    setWorks((current) => current.map((item) => (item.slug === work.slug ? nextWork : item)));
  }

  async function removeWork(work) {
    const confirmed = window.confirm(`删除作品「${work.title_zh}」？`);
    if (!confirmed) return;

    try {
      await fetch(`/api/admin/works/${work.slug}`, { method: "DELETE" });
    } catch {
      setStatus("本地预览模式：删除只在当前页面生效。");
    }
    setWorks((current) => current.filter((item) => item.slug !== work.slug));
    if (form.slug === work.slug) resetForm();
  }

  return (
    <main className="page-shell">
      <section className="admin-hero">
        <p className="eyebrow">Cloudflare Access Protected</p>
        <h1>作品发布台</h1>
        <p className="rich-text">管理台支持作品列表、编辑、下线、删除，并在浏览器内完成封面裁剪与 JPEG 压缩。</p>
      </section>

      <section id="editor" className="editor-layout">
        <form className="work-form panel" onSubmit={(event) => { event.preventDefault(); saveWork(false); }}>
          <div className="section-head">
            <h2>{form.slug ? "编辑作品" : "新建作品"}</h2>
            <button className="small-button" type="button" onClick={resetForm}>新建</button>
          </div>

          <label className="form-field">中文标题<input className="input" required value={form.title_zh} onChange={(event) => updateField("title_zh", event.target.value)} /></label>
          <label className="form-field">English title<input className="input" required value={form.title_en} onChange={(event) => updateField("title_en", event.target.value)} /></label>
          <label className="form-field">Slug<input className="input" value={form.slug} placeholder="留空自动生成" onChange={(event) => updateField("slug", event.target.value)} /></label>
          <label className="form-field">分类<select className="select" value={form.category} onChange={(event) => updateField("category", event.target.value)}><option value="code">编程 / Code</option><option value="art">绘图 / Art</option><option value="original">原创 / Original</option></select></label>
          <label className="form-field">中文摘要<textarea className="textarea" required value={form.summary_zh} onChange={(event) => updateField("summary_zh", event.target.value)} /></label>
          <label className="form-field">English summary<textarea className="textarea" required value={form.summary_en} onChange={(event) => updateField("summary_en", event.target.value)} /></label>
          <label className="form-field">中文正文<textarea className="textarea" required value={form.content_zh} onChange={(event) => updateField("content_zh", event.target.value)} /></label>
          <label className="form-field">English content<textarea className="textarea" required value={form.content_en} onChange={(event) => updateField("content_en", event.target.value)} /></label>
          <label className="form-field">标签<input className="input" value={form.tags} placeholder="JavaScript, Game, Canvas" onChange={(event) => updateField("tags", event.target.value)} /></label>
          <label className="form-field">代码链接<input className="input" type="url" value={form.code_url} onChange={(event) => updateField("code_url", event.target.value)} /></label>
          <label className="form-field">演示链接<input className="input" type="url" value={form.demo_url} onChange={(event) => updateField("demo_url", event.target.value)} /></label>

          <div className="media-tools">
            <label className="form-field">封面图片<input className="input" type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; setSelectedFile(file || null); setImagePreview(file ? URL.createObjectURL(file) : ""); }} /></label>
            {imagePreview && (
              <div className="crop-frame">
                <img src={imagePreview} alt="裁剪预览" style={{ "--zoom": crop.zoom, "--offset-x": `${crop.offsetX - 50}%`, "--offset-y": `${crop.offsetY - 50}%` }} />
              </div>
            )}
            <label className="form-field">缩放<input type="range" min="1" max="2" step="0.05" value={crop.zoom} onChange={(event) => setCrop({ ...crop, zoom: event.target.value })} /></label>
            <label className="form-field">横向裁剪<input type="range" min="0" max="100" value={crop.offsetX} onChange={(event) => setCrop({ ...crop, offsetX: event.target.value })} /></label>
            <label className="form-field">纵向裁剪<input type="range" min="0" max="100" value={crop.offsetY} onChange={(event) => setCrop({ ...crop, offsetY: event.target.value })} /></label>
            <label className="form-field">压缩质量<input type="range" min="0.5" max="0.95" step="0.05" value={crop.quality} onChange={(event) => setCrop({ ...crop, quality: event.target.value })} /></label>
            <button className="button-secondary" type="button" onClick={() => processSelectedImage()} disabled={!selectedFile}>裁剪压缩封面</button>
          </div>

          <label className="form-field">封面色彩<input className="input" value={form.cover_style} onChange={(event) => updateField("cover_style", event.target.value)} /></label>
          <div className="action-row">
            <button className="button-secondary" type="submit" disabled={saving}>保存草稿</button>
            <button className="button-primary" type="button" onClick={() => saveWork(true)} disabled={saving}>保存并发布</button>
          </div>
          <p className="muted" role="status">{status}</p>
        </form>

        <aside className="preview-panel panel">
          <h2>实时预览</h2>
          <article className="preview-card">
            <div className="preview-cover" style={previewStyle} />
            <div className="preview-body">
              <p className="eyebrow">{form.category}</p>
              <h3>{form.title_zh || "未命名作品"}</h3>
              <p>{form.summary_zh || "填写摘要后会在这里预览。"}</p>
              <span className="tag-row">
                {form.tags.split(",").map((tag) => tag.trim()).filter(Boolean).map((tag) => <span key={tag}>{tag}</span>)}
              </span>
            </div>
          </article>
        </aside>
      </section>

      <section className="list-panel panel">
        <div className="section-head">
          <h2>作品列表</h2>
          <span className="muted">{works.length} items</span>
        </div>
        <div className="work-table">
          {works.map((work) => (
            <article className="work-row" key={work.slug}>
              <span>
                <strong>{work.title_zh}</strong>
                <span className="table-meta">
                  <span>{work.category}</span>
                  <span>{work.is_published ? "已发布" : "草稿"}</span>
                </span>
              </span>
              <span className="row-actions">
                <button className="small-button" type="button" onClick={() => editWork(work)}>编辑</button>
                <button className="small-button" type="button" onClick={() => togglePublish(work)}>{work.is_published ? "下线" : "发布"}</button>
                <button className="small-button danger" type="button" onClick={() => removeWork(work)}>删除</button>
              </span>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
