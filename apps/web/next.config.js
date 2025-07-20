/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["images.pexels.com"], // Allow images from Pexels
  },
  async rewrites() {
    return [
      {
        source: "/ws/:path*",
        destination: "http://localhost:8080/:path*",
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/ws/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "http://localhost:3000",
          },
          {
            key: "Access-Control-Allow-Credentials",
            value: "true",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
