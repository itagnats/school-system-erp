import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Geist, Geist_Mono } from "next/font/google";
import { AppProviders } from "@/components/providers";
import { APP } from "@/config/app";
import { cn } from "@/lib/utils";
import "./globals.css";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });
// Wordmark only, so one weight is all that ships.
const displaySerif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: {
    default: APP.fullName,
    template: `%s · ${APP.name}`,
  },
  description: APP.description,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning on <html> is required by next-themes: it writes the theme
    // class onto <html> before React hydrates. On <body> it absorbs the attributes
    // browser extensions (Grammarly, password managers) inject before hydration.
    // It only covers the element it sits on, so it hides no real mismatch below.
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={cn(
          "font-sans antialiased",
          geistSans.variable,
          geistMono.variable,
          displaySerif.variable,
        )}
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
