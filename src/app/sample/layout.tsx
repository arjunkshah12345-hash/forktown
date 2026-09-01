import { Press_Start_2P, VT323 } from "next/font/google";
import "./retro.css";

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

export const metadata = {
  title: "Forktown — Retro Sample",
  description: "8-bit pixel town sample · Stardew-style UI concept",
};

export default function SampleLayout({ children }: LayoutProps<"/sample">) {
  return (
    <div className={`pixel-root ${pressStart.variable} ${vt323.variable}`}>
      <div className="pixel-scan" aria-hidden />
      {children}
    </div>
  );
}
