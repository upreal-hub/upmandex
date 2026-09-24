import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Navbar from "@/components/Navbar";
import AuthProvider from "@/components/SessionProvider";
import SiteThemeProvider from "@/components/SiteThemeProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Upmandex",
  description: "Welcome to the Skylands",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body>

        <AuthProvider>
          <SiteThemeProvider>
            <div className="site-frame">
              <Navbar />
              {children}
            </div>
          </SiteThemeProvider>
        </AuthProvider>

      </body>
    </html>
  );
}
