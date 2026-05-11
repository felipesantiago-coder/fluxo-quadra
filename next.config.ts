import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Configurações de produção otimizadas
  typescript: {
    // Em produção, erros de TypeScript devem quebrar o build
    ignoreBuildErrors: false,
  },
  // Strict mode ajuda a identificar efeitos colaterais em desenvolvimento
  reactStrictMode: true,
  // Otimização de imagens
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },
  // Minimizar bundle em produção
  productionBrowserSourceMaps: false,
  // Experimental: otimizações para React 19
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "@radix-ui/react-dialog"],
  },
};

export default nextConfig;
