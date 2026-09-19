import "./globals.css";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { AppShell } from "@/components/layout/AppShell";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["500", "600", "700"],
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500"],
});

const fontVars = `${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`;

// Restore mode / tier / palette / motion and the FTGM stage before first paint so
// nothing flashes. Tier is a cached hint; the ExperienceProvider confirms it.
const experienceBootstrap = `(function(){try{var d=document.documentElement,s=localStorage,m=s.getItem("dss-mode")||"light";if(m==="system"){m=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}d.setAttribute("data-mode",m);d.setAttribute("data-tier",s.getItem("dss-tier")||"base");d.setAttribute("data-palette",s.getItem("dss-palette")||"emerald");d.setAttribute("data-motion",s.getItem("dss-motion")||"full");d.setAttribute("data-stage",location.pathname.indexOf("/forecasting")===0?"ftgm":"none")}catch(e){}})();`;

export const metadata = {
  title: "InventoryDSS",
  description: "Decision Support System for inventory optimization in retail MSEs.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      data-mode="light"
      data-tier="base"
      data-palette="emerald"
      data-stage="none"
      data-motion="full"
      className={fontVars}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: experienceBootstrap }} />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
