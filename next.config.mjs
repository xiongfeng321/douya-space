import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig = {
  images: {
    unoptimized: true
  }
};

initOpenNextCloudflareForDev();

export default nextConfig;
