"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/connect", label: "Connect repo" },
  { href: "/towns", label: "Towns" },
  { href: "/settings/keys", label: "API keys" },
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
      <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center pt-5 px-4">
        <nav className="pointer-events-auto flex items-center gap-1 rounded-full border border-[var(--hairline)] bg-white/70 px-2 py-1.5 shadow-[var(--shadow-soft)] backdrop-blur-xl">
          <Link
            href="/"
            className="font-display mr-1 flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold tracking-tight text-ink"
          >
            <span className="relative flex h-2 w-2">
              <span className="beacon absolute inset-0" />
            </span>
            Forktown
          </Link>
          <div className="hidden items-center gap-0.5 sm:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={clsx(
                  "font-display rounded-full px-3 py-1.5 text-sm text-ink-soft transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white/80 hover:text-ink",
                  pathname === l.href && "bg-white text-ink",
                )}
              >
                {l.label}
              </Link>
            ))}
          </div>
          <Link href={onApp ? "/towns" : "/connect"} className="btn-island ml-1 !py-1.5 !pl-4 !pr-1.5 text-sm">
            {onApp ? "All towns" : "Connect a repo"}
            <span className="orb">↗</span>
          </Link>
          <button
            type="button"
            aria-label="Menu"
            className="font-display ml-0.5 grid h-9 w-9 place-items-center rounded-full border border-[var(--hairline)] bg-white/50 sm:hidden"
            onClick={() => setOpen(true)}
          >
            <span className="flex h-3 w-4 flex-col justify-between">
              <span className="h-px w-full bg-ink" />
              <span className="h-px w-full bg-ink" />
            </span>
          </button>
        </nav>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[60] bg-[color-mix(in_oklab,var(--fog)_70%,transparent)] backdrop-blur-3xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex justify-end p-5">
              <button
                type="button"
                className="font-display grid h-11 w-11 place-items-center rounded-full bg-ink text-paper"
                onClick={() => setOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="flex flex-col gap-4 px-8 pt-10">
              {links.map((l, i) => (
                <motion.div
                  key={l.href}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.05 * i, duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
                >
                  <Link
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="font-display text-4xl font-semibold tracking-tight text-ink"
                  >
                    {l.label}
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
