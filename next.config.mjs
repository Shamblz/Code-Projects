/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  async redirects() {
    return [
      // Short join URL: /j/ABCD → /game/ABCD (QR codes use this)
      { source: '/j/:code', destination: '/game/:code', permanent: false },
    ];
  },
};

export default nextConfig;
