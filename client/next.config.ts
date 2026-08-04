import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '5001' },
    ],
  },
  async redirects() {
    return [
      {
        source: '/dashboard',
        destination: '/sun/dashboard',
        permanent: false,
      },
      {
        source: '/login',
        destination: '/sun/login',
        permanent: false,
      },
      {
        source: '/students/:path*',
        destination: '/sun/students/:path*',
        permanent: false,
      },
      {
        source: '/batches/:path*',
        destination: '/sun/batches/:path*',
        permanent: false,
      },
      {
        source: '/expenses/:path*',
        destination: '/sun/expenses/:path*',
        permanent: false,
      },
      {
        source: '/vendors/:path*',
        destination: '/sun/vendors/:path*',
        permanent: false,
      },
      {
        source: '/products/:path*',
        destination: '/sun/products/:path*',
        permanent: false,
      },
      {
        source: '/admissions/:path*',
        destination: '/sun/admissions/:path*',
        permanent: false,
      },
      {
        source: '/reports/:path*',
        destination: '/sun/reports/:path*',
        permanent: false,
      },
      {
        source: '/roles/:path*',
        destination: '/sun/roles/:path*',
        permanent: false,
      },
      {
        source: '/notifications/:path*',
        destination: '/sun/notifications/:path*',
        permanent: false,
      },
      {
        source: '/settings/:path*',
        destination: '/sun/settings/:path*',
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: 'http://localhost:5001/uploads/:path*',
      },
    ];
  },
};

export default nextConfig;