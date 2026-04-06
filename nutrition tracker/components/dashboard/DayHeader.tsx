"use client";
import { useState, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

interface DayHeaderProps {
  date: string; // YYYY-MM-DD
  onPrev: () => void;
  onNext: () => void;
}

function formatDisplayDate(dateStr: string): { label: string; sub: string } {
  const today = formatDate(new Date());
  const yd = new Date();
  yd.setDate(yd.getDate() - 1);
  const yesterday = formatDate(yd);

  const d = new Date(dateStr + "T00:00:00");
  const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
  const monthDay = d.toLocaleDateString("en-US", { month: "long", day: "numeric" });

  if (dateStr === today) return { label: "Today", sub: `${weekday}, ${monthDay}` };
  if (dateStr === yesterday) return { label: "Yesterday", sub: `${weekday}, ${monthDay}` };
  return { label: weekday, sub: monthDay };
}

export function DayHeader({ date, onPrev, onNext }: DayHeaderProps) {
  const today = formatDate(new Date());
  const isToday = date === today;
  const { label, sub } = formatDisplayDate(date);
  const directionRef = useRef(1);

  function handlePrev() {
    directionRef.current = -1;
    onPrev();
  }

  function handleNext() {
    directionRef.current = 1;
    onNext();
  }

  return (
    <div className="flex items-center justify-between py-1">
      <Button variant="ghost" size="icon" onClick={handlePrev} className="h-10 w-10 rounded-xl">
        <ChevronLeft className="h-5 w-5" />
      </Button>

      <AnimatePresence mode="wait">
        <motion.div
          key={date}
          className="text-center"
          initial={{ opacity: 0, x: directionRef.current * 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: directionRef.current * -24 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="font-bold text-zinc-900 text-base leading-tight">{label}</div>
          <div className="text-xs text-zinc-400 font-medium mt-0.5">{sub}</div>
        </motion.div>
      </AnimatePresence>

      <Button variant="ghost" size="icon" onClick={handleNext} disabled={isToday} className="h-10 w-10 rounded-xl">
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  );
}
