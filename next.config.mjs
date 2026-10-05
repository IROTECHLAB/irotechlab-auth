/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: { serverActions: { bodySizeLimit: '4mb' } },

  async rewrites() {
    return [
      { source: '/.well-known/openid-configuration', destination: '/well-known/openid-configuration' },
      { source: '/.well-known/jwks.json',            destination: '/well-known/jwks' },
    ];
  },

  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
      ],
    }];
  },
};
export default nextConfig;
