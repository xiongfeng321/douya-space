import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig = {
  images: {
    unoptimized: true
  },
  experimental: {
    typedRoutes: false
  }
};

initOpenNextCloudflareForDev();

export default nextConfig;
