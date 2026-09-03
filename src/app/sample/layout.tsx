import "./retro.css";

export const metadata = {
  title: "Forktown — Play sample",
  description: "8-bit pixel town sample · Stardew-style UI concept",
};

export default function SampleLayout({ children }: LayoutProps<"/sample">) {
  return (
    <div className="pixel-root">
      <div className="pixel-scan" aria-hidden />
      {children}
    </div>
  );
}
