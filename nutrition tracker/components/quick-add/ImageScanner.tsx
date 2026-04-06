"use client";
import { useState, useRef } from "react";
import { Camera, Upload, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SearchResult } from "./FoodSearchInput";

interface ImageScannerProps {
  onScanned: (food: SearchResult) => void;
}

export function ImageScanner({ onScanned }: ImageScannerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    setPreview(URL.createObjectURL(file));
    setLoading(true);

    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch("/api/scan", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error ?? "Failed to scan label. Try a clearer photo.");
        return;
      }

      onScanned({
        name: data.name ?? "Scanned food",
        serving_size: data.serving_size,
        serving_unit: data.serving_unit,
        serving_weight_grams: data.serving_weight_grams ?? null,
        calories: data.calories,
        protein: data.protein,
        carbs: data.carbs,
        fat: data.fat,
        fiber: data.fiber,
        sugar: data.sugar,
        source: "scanned",
      });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("image/")) handleFile(file);
  }

  return (
    <div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
        Take a photo of a nutrition facts label and we&apos;ll extract the info automatically.
      </p>

      {loading ? (
        <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl p-8 text-center">
          <div className="flex flex-col items-center gap-3 text-zinc-400 dark:text-zinc-500">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500 dark:text-emerald-400" />
            <span className="text-sm">Reading nutrition label...</span>
          </div>
        </div>
      ) : preview ? (
        <div
          className="border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl p-8 text-center hover:border-emerald-400 dark:hover:border-emerald-600 transition-colors cursor-pointer"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => libraryRef.current?.click()}
        >
          <div className="space-y-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded-xl object-contain" />
            <p className="text-xs text-zinc-400 dark:text-zinc-500">Tap to choose a different image</p>
          </div>
        </div>
      ) : (
        <div
          className="border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl p-8 text-center"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <div className="flex flex-col items-center gap-3 text-zinc-400 dark:text-zinc-500">
            <Camera className="h-10 w-10" />
            <div>
              <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Scan a nutrition label</div>
              <div className="text-xs mt-1">JPG, PNG, HEIC supported</div>
            </div>
          </div>
        </div>
      )}

      {/* Camera input (opens camera) */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
      {/* Library input (opens photo library) */}
      <input
        ref={libraryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />

      {error && (
        <div className="mt-3 flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 rounded-xl px-3 py-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => cameraRef.current?.click()}
          disabled={loading}
        >
          <Camera className="h-4 w-4" />
          Take photo
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => libraryRef.current?.click()}
          disabled={loading}
        >
          <Upload className="h-4 w-4" />
          Choose photo
        </Button>
      </div>
    </div>
  );
}
