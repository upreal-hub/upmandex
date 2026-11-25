import type { Metadata } from "next";
import { connection } from "next/server";
import { Geist, Geist_Mono } from "next/font/google";
import SkyAtmosphere from "@/components/SkyAtmosphere";
import Navbar from "@/components/Navbar";
import AuthProvider from "@/components/SessionProvider";
import SiteThemeProvider from "@/components/SiteThemeProvider";
import { auth } from "@/auth";
import { isPrivateSiteMember } from "@/lib/private-site-access";
import { isSitePrivate } from "@/lib/site-publication";
import AnniversaryWaiting from "@/components/AnniversaryWaiting";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await connection();
  if (await isSitePrivate()) {
    const id = (await auth())?.user?.twitchUserId;
    if (!isPrivateSiteMember(id)) return <html lang="en"><body><AnniversaryWaiting /></body></html>;
  }

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){var t;try{t=localStorage.getItem("upmandex-theme")}catch(e){}document.documentElement.dataset.theme=t==="day"||t==="night"?t:matchMedia("(prefers-color-scheme: dark)").matches?"night":"day"})()` }} />
      </head>
      <body>
        <a className="skip-link" href="#main-content">Skip to content</a>

        <AuthProvider>
          <SiteThemeProvider>
            <div className="site-frame">
              <Navbar />
              <SkyAtmosphere />
              <div id="main-content" tabIndex={-1}>{children}</div>
            </div>
          </SiteThemeProvider>
        </AuthProvider>

      </body>
    </html>
  );
}
