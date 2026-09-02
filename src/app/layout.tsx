import type { Metadata } from "next";
import { Bricolage_Grotesque, Source_Serif_4, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
});

const source = Source_Serif_4({
  variable: "--font-source",
  subsets: ["latin"],
  display: "swap",
});

const ibm = IBM_Plex_Mono({
  variable: "--font-ibm",
  subsets: ["latin"],
  weight: ["400", "500"],
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
    "Living simulations of real codebases. AI agents experiment, break things, fight fake incidents, and learn what changes actually survive. Start with agent-safe migrations.",
  applicationName: "Forktown",
  keywords: [
    "Forktown",
    "codebase simulation",
    "migration rehearsal",
    "AI agents",
    "SimCity for codebases",
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
    <html
      lang="en"
      className={`${bricolage.variable} ${source.variable} ${ibm.variable} h-full`}
    >
      <body className="topo-grain min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
