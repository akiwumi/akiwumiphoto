import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // picsum.photos has a TLS redirect issue (fastly.picsum.photos cert mismatch)
    // that breaks server-side image optimization — keep unoptimized for dev
    unoptimized: process.env.NODE_ENV === 'development',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: '**.picsum.photos',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
