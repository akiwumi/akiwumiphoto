import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // picsum.photos has a TLS redirect issue (fastly.picsum.photos cert mismatch)
    // that breaks server-side image optimization — keep unoptimized for dev
    unoptimized: process.env.NODE_ENV === 'development',
    // AVIF first, then WebP: the smallest file each browser can show.
    formats: ['image/avif', 'image/webp'],
    // Uploaded page images never change at the same address.
    minimumCacheTTL: 60 * 60 * 24 * 30,
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
      {
        // Signed URLs from private buckets
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/sign/**',
      },
    ],
  },
};

export default nextConfig;
