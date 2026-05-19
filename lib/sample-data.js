export const translations = {
  zh: {
    code: "编程",
    art: "绘图",
    original: "原创",
    all: "全部"
  },
  en: {
    code: "Code",
    art: "Art",
    original: "Original",
    all: "All"
  }
};

export const sampleWorks = [
  {
    id: "pixel-adventure",
    slug: "pixel-adventure",
    title_zh: "像素冒险小游戏",
    title_en: "Pixel Adventure Game",
    summary_zh: "使用 JavaScript 制作的横版闯关游戏，包含积分与关卡机制。",
    summary_en: "A side-scrolling JavaScript game with scoring and level progression.",
    content_zh: "这是一个用基础 Web 技术完成的小游戏项目，重点练习角色移动、碰撞检测、关卡状态和分数反馈。",
    content_en: "A small browser game built with core web technologies, focusing on movement, collision, level state, and score feedback.",
    category: "code",
    tags: ["JavaScript", "Game", "Canvas"],
    cover_image: "",
    cover_style: "linear-gradient(135deg, #00a6b8, #8ec63f)",
    gallery_images: [],
    code_url: "#",
    demo_url: "#",
    is_published: true,
    published_at: "2026-05-01",
    author_role: "child",
    created_at: "2026-05-01T00:00:00.000Z",
    updated_at: "2026-05-01T00:00:00.000Z"
  },
  {
    id: "weather-dashboard",
    slug: "weather-dashboard",
    title_zh: "天气数据看板",
    title_en: "Weather Data Dashboard",
    summary_zh: "抓取天气数据并可视化展示，练习 API 调用与图表交互。",
    summary_en: "A data dashboard that practices API calls and interactive chart presentation.",
    content_zh: "项目把天气指标整理成可读的卡片和趋势图，适合作为后续数据可视化作品的起点。",
    content_en: "This project organizes weather metrics into readable cards and trend visuals, making it a base for future data visualization work.",
    category: "code",
    tags: ["API", "Dashboard", "Data"],
    cover_image: "",
    cover_style: "linear-gradient(135deg, #16202a, #00a6b8)",
    gallery_images: [],
    code_url: "#",
    demo_url: "#",
    is_published: true,
    published_at: "2026-04-18",
    author_role: "child",
    created_at: "2026-04-18T00:00:00.000Z",
    updated_at: "2026-04-18T00:00:00.000Z"
  },
  {
    id: "sunset-sketch",
    slug: "sunset-sketch",
    title_zh: "海边日落速写",
    title_en: "Seaside Sunset Sketch",
    summary_zh: "用水彩表现海风和落日层次，重点尝试光影过渡。",
    summary_en: "A watercolor sketch exploring light transitions across a seaside sunset.",
    content_zh: "这组练习记录了从铅笔构图到水彩铺色的过程，重点观察天空、海面和人物剪影的层次。",
    content_en: "This practice records the process from pencil composition to watercolor layers, focusing on sky, sea, and silhouette depth.",
    category: "art",
    tags: ["Watercolor", "Sketch", "Light"],
    cover_image: "",
    cover_style: "linear-gradient(135deg, #f05d4f, #f3b61f)",
    gallery_images: [],
    code_url: "",
    demo_url: "#",
    is_published: true,
    published_at: "2026-03-22",
    author_role: "child",
    created_at: "2026-03-22T00:00:00.000Z",
    updated_at: "2026-03-22T00:00:00.000Z"
  },
  {
    id: "echo-station",
    slug: "echo-station",
    title_zh: "科幻短篇《回声站》",
    title_en: "Short Story: Echo Station",
    summary_zh: "独立完成的短篇故事，围绕太空信号与少年选择展开。",
    summary_en: "A short sci-fi story about a space signal and a young creator's choice.",
    content_zh: "故事尝试把科学想象和成长主题放在一起，后续可以补充插图、设定集和英文版修订。",
    content_en: "The story combines scientific imagination with a coming-of-age theme, with room for illustrations and revised English editions.",
    category: "original",
    tags: ["Writing", "Sci-fi", "Story"],
    cover_image: "",
    cover_style: "linear-gradient(135deg, #7b61ff, #00a6b8)",
    gallery_images: [],
    code_url: "",
    demo_url: "#",
    is_published: true,
    published_at: "2026-02-10",
    author_role: "child",
    created_at: "2026-02-10T00:00:00.000Z",
    updated_at: "2026-02-10T00:00:00.000Z"
  }
];

export function localizedField(work, field, lang = "zh") {
  return work[`${field}_${lang}`] || work[`${field}_zh`] || "";
}
