"use client";

import { motion } from "motion/react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

type YesNoInputProps = {
  onSelect: (value: boolean) => void;
};

export function YesNoInput({ onSelect }: YesNoInputProps) {
  return (
    <div className="flex flex-col gap-3">
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => onSelect(true)}
        className={cn(
          "flex items-center justify-center gap-3 w-full h-16 rounded-2xl",
          "text-lg font-medium",
          "bg-primary/5 border-2 border-primary/20 text-primary",
          "hover:bg-primary/10 hover:border-primary/40",
          "active:bg-primary/15",
          "transition-colors"
        )}
      >
        <Check className="size-5" />
        Yes
      </motion.button>
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => onSelect(false)}
        className={cn(
          "flex items-center justify-center gap-3 w-full h-16 rounded-2xl",
          "text-lg font-medium",
          "bg-muted/50 border-2 border-border text-foreground",
          "hover:bg-muted hover:border-muted-foreground/30",
          "active:bg-muted/80",
          "transition-colors"
        )}
      >
        <X className="size-5" />
        No
      </motion.button>
    </div>
  );
}
