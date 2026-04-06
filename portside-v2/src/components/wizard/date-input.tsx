"use client";

import { Calendar } from "@/components/ui/calendar";

type DateInputProps = {
  value: string; // ISO date string or empty
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export function DateInput({ value, onChange, onSubmit }: DateInputProps) {
  const selected = value ? new Date(value + "T00:00:00") : undefined;

  const handleSelect = (date: Date | undefined) => {
    if (!date) return;
    const iso = date.toISOString().split("T")[0];
    onChange(iso);
    // Auto-advance after selecting a date
    setTimeout(onSubmit, 300);
  };

  return (
    <div className="flex justify-center">
      <Calendar
        mode="single"
        selected={selected}
        onSelect={handleSelect}
        className="rounded-2xl border border-border p-4 bg-card shadow-sm [--cell-size:--spacing(10)]"
        disabled={{ before: new Date() }}
      />
    </div>
  );
}
