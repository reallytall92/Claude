"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, History, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Today", icon: LayoutDashboard },
  { href: "/history", label: "History", icon: History },
  { href: "/foods", label: "Foods", icon: BookOpen },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav
      className="glass-bar fixed bottom-0 left-0 right-0 z-50"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="max-w-2xl mx-auto flex items-stretch h-[60px]">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors",
                active ? "text-emerald-600" : "text-zinc-400"
              )}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-emerald-500 rounded-full" />
              )}
              <Icon
                className={cn(
                  "h-[22px] w-[22px] transition-all duration-200",
                  active ? "stroke-[2.2px]" : "stroke-[1.8px]"
                )}
              />
              <span
                className={cn(
                  "text-[10px] font-semibold tracking-wide transition-colors",
                  active ? "text-emerald-600" : "text-zinc-400"
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
