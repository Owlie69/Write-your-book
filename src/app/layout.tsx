import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme-context";

export const metadata: Metadata = {
  title: "JustWrite — Take back your focus.",
  description:
    "A distraction-free writing tool that locks you in so you can focus. Go fullscreen, set a timer, and write without interruptions. No AI. No distractions. Just your thoughts.",
  keywords: ["writing", "focus", "distraction-free", "attention", "deep work", "productivity"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
