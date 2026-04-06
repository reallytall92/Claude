"use client";

import { motion } from "motion/react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChoiceOption } from "@/lib/wizard/types";

type ChoiceInputProps = {
  choices: ChoiceOption[];
  onSelect: (value: string) => void;
};

export function ChoiceInput({ choices, onSelect }: ChoiceInputProps) {
  return (
    <div className="flex flex-col gap-3">
      {choices.map((choice) => (
        <motion.button
          key={choice.value}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect(choice.value)}
          className={cn(
            "flex items-center justify-between w-full px-5 h-16 rounded-2xl",
            "text-lg font-medium text-left",
            "bg-card border-2 border-border",
            "hover:border-primary/40 hover:bg-primary/5",
            "active:bg-primary/10",
            "transition-colors"
          )}
        >
          <span>{choice.label}</span>
          <ChevronRight className="size-5 text-muted-foreground" />
        </motion.button>
      ))}
    </div>
  );
}
