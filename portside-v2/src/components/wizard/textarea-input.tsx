"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type TextAreaInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function TextAreaInput({
  value,
  onChange,
  placeholder,
}: TextAreaInputProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const t = setTimeout(() => ref.current?.focus(), 250);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={5}
        className={cn(
          "w-full px-4 py-3 text-base rounded-2xl resize-none",
          "bg-muted/50 border border-border",
          "placeholder:text-muted-foreground/50",
          "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary",
          "transition-all"
        )}
      />
      <p className="text-sm text-muted-foreground">
        Optional — leave blank to skip
      </p>
    </div>
  );
}
