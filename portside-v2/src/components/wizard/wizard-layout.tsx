"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 40 : -40,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -40 : 40,
    opacity: 0,
  }),
};

type WizardLayoutProps = {
  stepId: string;
  prompt: string;
  progress: number;
  direction: 1 | -1;
  canGoBack: boolean;
  onBack: () => void;
  showContinue: boolean;
  canProceed: boolean;
  onProceed: () => void;
  continueLabel?: string;
  children: React.ReactNode;
};

export function WizardLayout({
  stepId,
  prompt,
  progress,
  direction,
  canGoBack,
  onBack,
  showContinue,
  canProceed,
  onProceed,
  continueLabel = "Continue",
  children,
}: WizardLayoutProps) {
  return (
    <div className="flex flex-col h-dvh bg-background">
      {/* Top bar */}
      <header className="flex-none px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <div className="flex items-center h-10">
          {canGoBack ? (
            <button
              onClick={onBack}
              className="flex items-center justify-center size-10 -ml-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="size-5" />
            </button>
          ) : (
            <div className="size-10" />
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-1 h-1 w-full rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          />
        </div>
      </header>

      {/* Content area */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={stepId}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute inset-0 flex flex-col px-6 pt-6 pb-4 overflow-y-auto"
          >
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {prompt}
            </h1>
            <div className="mt-6 flex-1">{children}</div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom action */}
      {showContinue && (
        <footer
          className={cn(
            "flex-none px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3",
            "border-t border-border/50 bg-background"
          )}
        >
          <Button
            onClick={onProceed}
            disabled={!canProceed}
            className={cn(
              "w-full h-14 text-base font-medium rounded-2xl transition-all",
              "bg-primary text-primary-foreground",
              "hover:bg-primary/90",
              "disabled:opacity-40 disabled:cursor-not-allowed"
            )}
          >
            {continueLabel}
          </Button>
        </footer>
      )}
    </div>
  );
}
