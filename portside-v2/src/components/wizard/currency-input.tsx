"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type CurrencyInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  canSubmit: boolean;
};

function formatCurrency(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, "");
  if (!digits) return "";
  const num = parseInt(digits, 10);
  return num.toLocaleString("en-US");
}

function rawFromFormatted(formatted: string): string {
  return formatted.replace(/[^0-9]/g, "");
}

export function CurrencyInput({
  value,
  onChange,
  onSubmit,
  canSubmit,
}: CurrencyInputProps) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => ref.current?.focus(), 250);
    return () => clearTimeout(t);
  }, []);

  const display = formatCurrency(value);

  return (
    <div className="flex items-center justify-center">
      <div
        className={cn(
          "flex items-center gap-1 px-6 py-4 rounded-2xl",
          "bg-muted/50 border border-border",
          "focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary",
          "transition-all"
        )}
      >
        <span className="text-3xl font-light text-muted-foreground">$</span>
        <input
          ref={ref}
          type="text"
          inputMode="numeric"
          value={display}
          onChange={(e) => onChange(rawFromFormatted(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canSubmit) onSubmit();
          }}
          placeholder="0"
          className={cn(
            "w-40 text-3xl font-semibold bg-transparent",
            "placeholder:text-muted-foreground/30",
            "focus:outline-none"
          )}
        />
      </div>
    </div>
  );
}
