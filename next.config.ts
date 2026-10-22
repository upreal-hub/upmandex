import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.public.blob.vercel-storage.com",
        pathname: "/upmans/**",
        search: "",
      },
      {
        protocol: "https",
        hostname: "**.public.blob.vercel-storage.com",
        pathname: "/artworks/**",
        search: "",
      },
      {
        protocol: "https",
        hostname: "**.public.blob.vercel-storage.com",
        pathname: "/profile-cosmetics/**",
        search: "",
      },
      {
        protocol: "https",
        hostname: "**.public.blob.vercel-storage.com",
        pathname: "/upman-submissions/**",
        search: "",
      },
      {
        protocol: "https",
        hostname: "e4pburhj5wrv8agh.public.blob.vercel-storage.com",
        pathname: "/personal-profile-backgrounds/**",
        search: "",
      },
    ],
  },
};

export default nextConfig;
