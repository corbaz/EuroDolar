import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    /* config options here */
    output: "export",
    // Optional: Change links `/me` -> `/me/` and emit `/me.html` -> `/me/index.html`
    trailingSlash: true,

    distDir: "docs",
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
    // Asegurar que los archivos estáticos se copian correctamente
    assetPrefix: "/",
};

export default nextConfig;
