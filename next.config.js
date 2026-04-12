/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // Disable caching for JS chunks so PWA always gets fresh files
        source: "/_next/static/chunks/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
