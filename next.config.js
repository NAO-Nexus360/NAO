/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Sin caché del router en páginas dinámicas: los datos nuevos aparecen al navegar, sin refrescar
    staleTimes: { dynamic: 0 },
  },
  output: "standalone",
  images: {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
};

module.exports = nextConfig;
