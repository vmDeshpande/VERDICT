import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VERDICT — AI-powered courtroom simulation and legal education",
  description:
    "VERDICT is an AI-powered multiplayer courtroom simulation and legal education platform. Practice legal advocacy, debate cases, and learn legal reasoning with an interactive AI judge.",
  keywords: [
    "legal education",
    "courtroom simulation",
    "moot court",
    "AI judge",
    "legal research",
    "law school",
  ],
  authors: [{ name: "VERDICT" }],
  creator: "VERDICT",
  openGraph: {
    title: "VERDICT",
    description:
      "AI-powered legal education and multiplayer courtroom simulation. Every argument deserves a hearing.",
    url: "https://verdict.example",
    siteName: "VERDICT",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}