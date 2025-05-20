import type { NextConfig } from "next";

// Determinar el entorno de despliegue
const isGitHubPages = process.env.GITHUB_PAGES === "true";
const isRender = process.env.RENDER === "true";

const nextConfig: NextConfig = {
    /* config options here */
    output: "export",
    trailingSlash: true,
    distDir: "docs",

    // Configuración basada en el entorno
    basePath: isGitHubPages ? "/EuroDolar" : "",
    assetPrefix: isGitHubPages ? "/EuroDolar/" : "",

    typescript: {
        ignoreBuildErrors: true,
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "placehold.co",
                port: "",
                pathname: "/**",
            },
        ],
        unoptimized: true,
    },
};

export default nextConfig;
