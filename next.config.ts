import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Catatan: output "standalone" DIHAPUS karena tidak kompatibel dengan Vercel.
  // Vercel menggunakan build system sendiri (tidak perlu standalone).
  // Standalone hanya untuk Docker / custom server deployment.
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Izinkan gambar dari domain eksternal (YouTube thumbnail, Esri satellite tiles)
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "server.arcgisonline.com" },
    ],
  },
};

export default nextConfig;
