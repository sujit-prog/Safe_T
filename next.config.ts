import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
   eslint: {
    ignoreDuringBuilds: true, // ✅ THIS LINE
  },

};

export default nextConfig;
