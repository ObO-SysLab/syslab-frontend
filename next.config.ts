import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.NODE_ENV==='development'?undefined:'export',
  trailingSlash: false, // 수정
  images: {
    unoptimized: true,
  }
};

export default nextConfig;
