import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 's3-api.rdrealty.com.ph',
        port: '',
        pathname: '/pms-bucket/**',
      },
    ],
  },
};

export default nextConfig;
