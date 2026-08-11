import type { NextConfig } from "next";

const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  reactCompiler: true,
  turbopack: {},
  // Redirects are not supported when using output: 'export'
  // async redirects() {
  //   return [
  //     {
  //       source: '/:path*.html',
  //       destination: '/:path*',
  //       permanent: true,
  //     },
  //   ];
  // },
};

export default withPWA(nextConfig);
