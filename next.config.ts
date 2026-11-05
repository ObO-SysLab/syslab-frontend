import type { NextConfig } from "next";
import {readFile} from 'node:fs/promises';
import path from 'node:path';

const nextConfig: NextConfig = {
  output: process.env.NODE_ENV==='development'?undefined:'export',
  async rewrites(){
    if(process.env.NODE_ENV!=='development')return [];
    try{
      const session=JSON.parse(await readFile(path.resolve(process.cwd(),'../obo-harness/evidence/2026-11-01-integration-http/session.json'),'utf8'));
      const target=new URL(session.baseUrl);
      if(target.hostname!=='127.0.0.1'||target.protocol!=='http:'||Date.now()>session.expiresAt)return [];
      return [{source:'/api/:path*',destination:target.origin+'/api/:path*'}];
    }catch{return [];}
  },
  trailingSlash: false, // 수정
  images: {
    unoptimized: true,
  }
};

export default nextConfig;
