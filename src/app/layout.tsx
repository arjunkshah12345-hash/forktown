import type { Metadata } from "next";
import { Press_Start_2P, VT323 } from "next/font/google";
import "./globals.css";
import "./sample/retro.css";

const pressStart = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-press-start",
  display: "swap",
});

const vt323 = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-vt323",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://arjunshah.xyz/forktown",
  ),
  title: {
    default: "Forktown — where agents rehearse before they ship",
    template: "%s · Forktown",
  },
  description:
    "A cozy voxel town around your codebase. AI agents farm migrations, fight fake incidents, and learn what changes survive — Stardew energy for serious shipping.",
  applicationName: "Forktown",
  keywords: [
    "Forktown",
    "codebase simulation",
    "migration rehearsal",
    "AI agents",
    "SimCity for codebases",
    "Stardew Valley",
  ],
  authors: [{ name: "Arjun Shah" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Forktown",
    title: "Forktown",
    description: "SimCity for codebases. Agents rehearse before they ship.",
    images: [
      {
        url: "/launch/og.jpg",
        width: 1200,
        height: 630,
        alt: "Forktown — where agents rehearse before they ship",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Forktown",
    description: "SimCity for codebases. Agents rehearse before they ship.",
    images: ["/launch/og.jpg"],
  },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/icon.png", sizes: "256x256", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", type: "image/png" }],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${pressStart.variable} ${vt323.variable} h-full`}>
      <body className="topo-grain flex min-h-full flex-col">{children}</body>
    </html>
  );
}
