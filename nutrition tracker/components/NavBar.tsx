"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, History, BookOpen, Settings } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Today", icon: LayoutDashboard },
  { href: "/history", label: "History", icon: History },
  { href: "/foods", label: "Foods", icon: BookOpen },
  { href: "/settings", label: "Targets", icon: Settings },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <>
      {/* ── Mobile: bottom tab bar ── */}
      <nav
        className="glass-bar fixed bottom-0 left-0 right-0 z-50 md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="max-w-2xl mx-auto flex items-stretch h-[60px] relative">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors",
                  active ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400 dark:text-zinc-500"
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-indicator"
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-emerald-500 dark:bg-emerald-400 rounded-full"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <motion.div
                  animate={{ scale: active ? 1 : 0.92 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <Icon
                    className={cn(
                      "h-[22px] w-[22px] transition-colors duration-200",
                      active ? "stroke-[2.2px]" : "stroke-[1.8px]"
                    )}
                  />
                </motion.div>
                <span
                  className={cn(
                    "text-[10px] font-semibold tracking-wide transition-colors duration-200",
                    active ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400 dark:text-zinc-500"
                  )}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ── Desktop: left sidebar ── */}
      <nav
        className="hidden md:flex fixed left-0 top-0 bottom-0 z-50 w-16 flex-col items-center py-6 gap-1 border-r border-zinc-100/80 dark:border-zinc-800/80 bg-white/88 dark:bg-[rgba(10,10,11,0.88)] backdrop-blur-[20px] backdrop-saturate-[180%]"
      >
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 w-14 py-2.5 rounded-xl transition-colors",
                active ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-400"
              )}
            >
              {active && (
                <motion.span
                  layoutId="nav-indicator-desktop"
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-0.5 bg-emerald-500 dark:bg-emerald-400 rounded-full"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <motion.div
                animate={{ scale: active ? 1 : 0.92 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <Icon
                  className={cn(
                    "h-[22px] w-[22px] transition-colors duration-200",
                    active ? "stroke-[2.2px]" : "stroke-[1.8px]"
                  )}
                />
              </motion.div>
              <span
                className={cn(
                  "text-[9px] font-semibold tracking-wide transition-colors duration-200",
                  active ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400 dark:text-zinc-500"
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
