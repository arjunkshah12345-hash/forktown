"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";

const links = [
  { href: "/dashboard", label: "Board" },
  { href: "/connect", label: "Plant repo" },
  { href: "/towns", label: "Towns" },
  { href: "/sample", label: "Play sample" },
  { href: "/settings/keys", label: "Keys" },
];

export function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const onApp =
    pathname.startsWith("/towns") ||
    pathname.startsWith("/runs") ||
    pathname.startsWith("/connect") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/settings");

  return (
    <>
      <header className="sticky top-0 z-50 px-3 pt-3 sm:px-5">
        <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-panel px-3 py-2.5">
          <Link href="/" className="font-pixel text-[0.55rem] text-[var(--amber)] sm:text-[0.65rem]">
            ◆ FORK<span className="text-[var(--paper)]">TOWN</span>
          </Link>

          <div className="hidden items-center gap-2 md:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={clsx(
                  "font-pixel px-2 py-1 text-[0.42rem] uppercase tracking-wide text-[#d7ccc8] hover:text-[var(--amber)]",
                  pathname === l.href && "bg-[var(--soil-hi)] text-[var(--amber)]",
                )}
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="font-pixel hidden items-center gap-2 text-[0.42rem] text-[var(--amber)] sm:inline-flex">
              <span
                className="inline-block h-3.5 w-3.5 rounded-full border-2 border-[var(--amber-deep)] bg-[var(--amber)]"
                style={{ boxShadow: "inset -2px -2px 0 var(--amber-deep)" }}
                aria-hidden
              />
              999g
            </span>
            <Link href={onApp ? "/towns" : "/connect"} className="btn-island !text-[0.42rem] !py-2">
              {onApp ? "All towns" : "Found a town"}
              <span className="orb">↗</span>
            </Link>
            <button
              type="button"
              aria-label="Menu"
              className="btn-ghost !px-2 !py-2 md:hidden"
              onClick={() => setOpen((v) => !v)}
            >
              ≡
            </button>
          </div>
        </nav>

        {open && (
          <div className="mx-auto mt-2 flex max-w-6xl flex-col gap-1 px-panel p-3 md:hidden">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="font-pixel px-2 py-2 text-[0.5rem] text-[var(--paper)] hover:text-[var(--amber)]"
              >
                ▸ {l.label}
              </Link>
            ))}
          </div>
        )}
      </header>
    </>
  );
}
