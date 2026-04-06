"use client";

import { motion } from "motion/react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type IntegerInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  canSubmit: boolean;
  min?: number;
};

export function IntegerInput({
  value,
  onChange,
  onSubmit,
  canSubmit,
  min = 0,
}: IntegerInputProps) {
  const num = parseInt(value, 10) || 0;

  const decrement = () => {
    if (num > min) onChange(String(num - 1));
  };

  const increment = () => {
    onChange(String(num + 1));
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex items-center gap-6">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={decrement}
          disabled={num <= min}
          className={cn(
            "flex items-center justify-center size-16 rounded-2xl",
            "bg-muted border-2 border-border",
            "text-foreground",
            "hover:bg-muted/80 active:bg-muted/60",
            "disabled:opacity-30 disabled:cursor-not-allowed",
            "transition-colors"
          )}
          aria-label="Decrease"
        >
          <Minus className="size-6" />
        </motion.button>

        <span className="text-5xl font-semibold tabular-nums w-20 text-center">
          {num}
        </span>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={increment}
          className={cn(
            "flex items-center justify-center size-16 rounded-2xl",
            "bg-primary/10 border-2 border-primary/20",
            "text-primary",
            "hover:bg-primary/15 active:bg-primary/20",
            "transition-colors"
          )}
          aria-label="Increase"
        >
          <Plus className="size-6" />
        </motion.button>
      </div>

      {/* Keyboard shortcut hint on desktop */}
      <p className="text-sm text-muted-foreground hidden sm:block">
        Press Enter to continue
      </p>

      {/* Hidden input for keyboard support */}
      <input
        type="text"
        className="sr-only"
        value={num}
        readOnly
        onKeyDown={(e) => {
          if (e.key === "Enter" && canSubmit) onSubmit();
          if (e.key === "ArrowUp") increment();
          if (e.key === "ArrowDown") decrement();
        }}
        autoFocus
      />
    </div>
  );
}
