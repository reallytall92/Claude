"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type TextInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  canSubmit: boolean;
};

export function TextInput({
  value,
  onChange,
  onSubmit,
  placeholder,
  canSubmit,
}: TextInputProps) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Delay focus slightly for animation to settle
    const t = setTimeout(() => ref.current?.focus(), 250);
    return () => clearTimeout(t);
  }, []);

  return (
    <input
      ref={ref}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && canSubmit) onSubmit();
      }}
      placeholder={placeholder}
      className={cn(
        "w-full h-14 px-4 text-lg rounded-2xl",
        "bg-muted/50 border border-border",
        "placeholder:text-muted-foreground/50",
        "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary",
        "transition-all"
      )}
    />
  );
}
