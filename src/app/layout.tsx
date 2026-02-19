import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme-context";

export const metadata: Metadata = {
  title: {
    default: "JustWrite | Distraction-free writing tool for deep focus",
    template: "%s | JustWrite",
  },
  description:
    "JustWrite is a distraction-free writing app that locks you into fullscreen focus sessions. Set a timer, block all distractions, and write without interruption. For journaling, novels, brainstorming, morning pages, and more. No AI. No distractions. Just your thoughts.",
  keywords: [
    "distraction-free writing",
    "focus writing app",
    "deep work writing tool",
    "fullscreen writing",
    "timed writing sessions",
    "journaling app",
    "novel writing app",
    "brainstorming tool",
    "morning pages app",
    "attention management",
    "focus mode",
    "writer productivity",
    "distraction blocker for writing",
    "writing habit tracker",
  ],
  authors: [{ name: "JustWrite" }],
  creator: "JustWrite",
  publisher: "JustWrite",
  metadataBase: new URL("https://justwrite.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "JustWrite",
    title: "JustWrite | Take back your focus and start writing",
    description:
      "A distraction-free writing tool that locks you in. Go fullscreen, set a timer, and write without interruptions. For journaling, novels, brainstorming, and deep work.",
    url: "https://justwrite.app",
  },
  twitter: {
    card: "summary_large_image",
    title: "JustWrite | Distraction-free writing for deep focus",
    description:
      "Lock into fullscreen writing sessions. Set a timer, block distractions, and write. For journaling, novels, brainstorming, and more.",
    creator: "@justwrite",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  category: "productivity",
};

// JSON-LD structured data for AI/search discoverability
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "JustWrite",
  applicationCategory: "ProductivityApplication",
  operatingSystem: "Web",
  description:
    "A distraction-free writing tool that locks you into timed fullscreen sessions. For journaling, novel writing, brainstorming, morning pages, thesis writing, and deep focus work.",
  offers: [
    {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
      name: "Free",
      description: "3 files, 100 pages, 20-minute sessions, cloud storage",
    },
    {
      "@type": "Offer",
      price: "4.99",
      priceCurrency: "EUR",
      name: "Cloud",
      description: "Unlimited files, custom timer, cloud sync, download files",
    },
  ],
  featureList: [
    "Fullscreen distraction-free writing",
    "Timed focus sessions (5–180 minutes)",
    "Automatic page management",
    "Writing session statistics",
    "Cloud sync across devices",
    "Dark mode support",
    "No AI — your words are yours",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
