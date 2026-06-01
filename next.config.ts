import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: false, // 수정
  images: {
    unoptimized: true,
  }
};

export default nextConfig;