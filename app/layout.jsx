import "./globals.css";

export const metadata = {
  title: "豆芽空间 | Douya Space",
  description: "豆芽空间是一个展示编程、绘图和原创内容的双语作品平台。",
  openGraph: {
    title: "豆芽空间 | Douya Space",
    description: "少年创作者的编程、绘图与原创作品档案。"
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
