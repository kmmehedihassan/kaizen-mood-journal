// src/app/layout.tsx
import "./globals.css";
import type { Metadata, Viewport } from "next";
import NavBar from "@/components/NavBar";
import { ChatDrawer } from "@/components/ChatDrawer";
import { MoodAmbience } from "@/components/MoodAmbience";
import { Toaster } from "@/components/Toaster";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Kaizen — mood journal", template: "%s · Kaizen" },
  description:
    "A private, AI-assisted mood journal. Check in daily, grow a Mood Garden, discover what lifts you up, and get 1% better every day.",
  applicationName: "Kaizen",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  openGraph: {
    title: "Kaizen — mood journal",
    description: "Check in daily, grow a Mood Garden, and get 1% better every day.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7faf8" },
    { media: "(prefers-color-scheme: dark)", color: "#14191a" },
  ],
};

// Runs before paint so there's no flash of the wrong theme / mood colour.
const bootScript = `(function(){try{
var t=localStorage.getItem('kaizen.theme');t=t?JSON.parse(t):'system';
var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);
document.documentElement.classList.toggle('dark',d);
var hues={joyful:45,grateful:140,calm:190,energized:25,loved:335,tired:250,anxious:280,sad:215,angry:0};
var m=localStorage.getItem('kaizen.currentMood');m=m?JSON.parse(m):null;
if(m&&hues[m]!=null)document.documentElement.style.setProperty('--mood-hue',hues[m]);
}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body className="min-h-dvh antialiased">
        <div className="ambient" aria-hidden />
        <MoodAmbience />
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 btn btn-primary">
          Skip to content
        </a>
        <NavBar />
        <main id="main" className="mx-auto w-full max-w-5xl px-4 pb-28 pt-6 sm:px-6 sm:pt-10">
          {children}
        </main>
        <footer className="mx-auto max-w-5xl px-4 pb-10 text-center text-xs text-muted sm:px-6">
          Your journal lives only in this browser. Kaizen is a wellbeing companion, not a substitute for professional care.
        </footer>
        <ChatDrawer />
        <Toaster />
      </body>
    </html>
  );
}
