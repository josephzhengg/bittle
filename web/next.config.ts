import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
<<<<<<< HEAD
    reactStrictMode: true,
    images: { 
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**'
            }
        ]
    },
};

export default nextConfig;
=======
  reactStrictMode: true,
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**'
      }
    ]
  }
};

export default nextConfig;
>>>>>>> origin
