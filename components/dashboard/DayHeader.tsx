"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DayHeaderProps {
  date: string; // YYYY-MM-DD
  onPrev: () => void;
  onNext: () => void;
}

function formatDisplayDate(dateStr: string): { label: string; sub: string } {
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  const d = new Date(dateStr + "T00:00:00");
  const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
  const monthDay = d.toLocaleDateString("en-US", { month: "long", day: "numeric" });

  if (dateStr === today) return { label: "Today", sub: `${weekday}, ${monthDay}` };
  if (dateStr === yesterday) return { label: "Yesterday", sub: `${weekday}, ${monthDay}` };
  return { label: weekday, sub: monthDay };
}

export function DayHeader({ date, onPrev, onNext }: DayHeaderProps) {
  const today = new Date().toISOString().split("T")[0];
  const isToday = date === today;
  const { label, sub } = formatDisplayDate(date);

  return (
    <div className="flex items-center justify-between py-1">
      <Button variant="ghost" size="icon" onClick={onPrev} className="h-10 w-10 rounded-xl">
        <ChevronLeft className="h-5 w-5" />
      </Button>
      <div className="text-center">
        <div className="font-bold text-zinc-900 text-base leading-tight">{label}</div>
        <div className="text-xs text-zinc-400 font-medium mt-0.5">{sub}</div>
      </div>
      <Button variant="ghost" size="icon" onClick={onNext} disabled={isToday} className="h-10 w-10 rounded-xl">
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  );
}
