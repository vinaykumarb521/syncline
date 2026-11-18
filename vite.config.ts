import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  server: { host: "0.0.0.0", port: 4731, strictPort: true },
  preview: { host: "0.0.0.0", port: 4731, strictPort: true },
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "privacy.html", "icon-192.png", "icon-512.png", "icon-maskable-512.png"],
      manifest: {
        name: "Syncline",
        short_name: "Syncline",
        description: "Switch lanes on the beat. A one-thumb arcade runner.",
        theme_color: "#07060b",
        background_color: "#07060b",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
});
