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

// Set the saved theme + light/dark mode before paint to avoid a flash.
const themeBootstrap = `(function(){try{var d=document.documentElement;d.setAttribute("data-theme",localStorage.getItem("dss-theme")||"teal-coral");d.setAttribute("data-mode",localStorage.getItem("dss-mode")||"light");}catch(e){}})();`;

export const metadata = {
  title: "Inventory DSS Platform",
  description: "Decision Support System for inventory optimization in retail MSEs.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" data-theme="teal-coral" data-mode="light" className={fontVars} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
