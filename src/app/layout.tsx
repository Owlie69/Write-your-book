import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JustWrite — Lock in. Write. Ship.",
  description:
    "A distraction-free writing tool that locks you in so you can finally finish what you started. No AI. No excuses. Just your words.",
  keywords: ["writing", "focus", "distraction-free", "book", "journal", "habit"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
