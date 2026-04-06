"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Prediction = {
  placeId: string;
  description: string;
};

type AddressAutocompleteInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSelect: (address: string, county: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  canSubmit: boolean;
};

export function AddressAutocompleteInput({
  value,
  onChange,
  onSelect,
  onSubmit,
  placeholder,
  canSubmit,
}: AddressAutocompleteInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  // Track whether the user just selected from the dropdown to suppress re-fetching
  const justSelectedRef = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(t);
  }, []);

  const fetchPredictions = useCallback(async (input: string) => {
    if (input.length < 3) {
      setPredictions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/places/autocomplete?input=${encodeURIComponent(input)}`
      );
      const data = await res.json();
      setPredictions(data.predictions ?? []);
      setIsOpen((data.predictions ?? []).length > 0);
      setActiveIndex(-1);
    } catch {
      setPredictions([]);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = useCallback(
    (val: string) => {
      onChange(val);

      if (justSelectedRef.current) {
        justSelectedRef.current = false;
        return;
      }

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        fetchPredictions(val);
      }, 250);
    },
    [onChange, fetchPredictions]
  );

  const handleSelect = useCallback(
    async (prediction: Prediction) => {
      justSelectedRef.current = true;
      onChange(prediction.description);
      setPredictions([]);
      setIsOpen(false);
      setActiveIndex(-1);

      // Fetch county from place details
      try {
        const res = await fetch(
          `/api/places/details?placeId=${encodeURIComponent(prediction.placeId)}`
        );
        const data = await res.json();
        onSelect(prediction.description, data.county ?? "");
      } catch {
        onSelect(prediction.description, "");
      }
    },
    [onChange, onSelect]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || predictions.length === 0) {
        if (e.key === "Enter" && canSubmit) onSubmit();
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((i) =>
            i < predictions.length - 1 ? i + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((i) =>
            i > 0 ? i - 1 : predictions.length - 1
          );
          break;
        case "Enter":
          e.preventDefault();
          if (activeIndex >= 0 && activeIndex < predictions.length) {
            handleSelect(predictions[activeIndex]);
          } else if (canSubmit) {
            setIsOpen(false);
            onSubmit();
          }
          break;
        case "Escape":
          setIsOpen(false);
          setActiveIndex(-1);
          break;
      }
    },
    [isOpen, predictions, activeIndex, canSubmit, onSubmit, handleSelect]
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (predictions.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls="address-listbox"
          aria-activedescendant={
            activeIndex >= 0 ? `address-option-${activeIndex}` : undefined
          }
          className={cn(
            "w-full h-14 px-4 pr-10 text-lg rounded-2xl",
            "bg-muted/50 border border-border",
            "placeholder:text-muted-foreground/50",
            "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary",
            "transition-all"
          )}
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="size-5 text-muted-foreground animate-spin" />
          </div>
        )}
      </div>

      {isOpen && predictions.length > 0 && (
        <div
          ref={dropdownRef}
          id="address-listbox"
          role="listbox"
          className={cn(
            "absolute z-50 w-full mt-2 rounded-2xl",
            "bg-card border border-border shadow-lg",
            "overflow-hidden"
          )}
        >
          {predictions.map((p, i) => (
            <button
              key={p.placeId}
              id={`address-option-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              onClick={() => handleSelect(p)}
              className={cn(
                "flex items-center gap-3 w-full px-4 py-3 text-left",
                "transition-colors",
                i === activeIndex
                  ? "bg-primary/10 text-foreground"
                  : "hover:bg-muted/50 text-foreground",
                i < predictions.length - 1 && "border-b border-border/50"
              )}
            >
              <MapPin className="size-4 flex-shrink-0 text-muted-foreground" />
              <span className="text-sm truncate">{p.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
