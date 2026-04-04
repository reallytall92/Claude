"use client";

interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function MacroSummary({ macros }: { macros: Macros }) {
  const totalMacroG = macros.protein + macros.carbs + macros.fat;
  const proteinPct = totalMacroG > 0 ? (macros.protein / totalMacroG) * 100 : 33;
  const carbsPct = totalMacroG > 0 ? (macros.carbs / totalMacroG) * 100 : 34;
  const fatPct = totalMacroG > 0 ? (macros.fat / totalMacroG) * 100 : 33;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-4">
      {/* Top row: calories large, macros alongside */}
      <div className="flex items-center gap-3">
        <div className="text-center min-w-[80px]">
          <div className="text-3xl font-bold text-zinc-900 leading-none">
            {Math.round(macros.calories)}
          </div>
          <div className="text-[10px] text-zinc-400 mt-1 font-semibold uppercase tracking-widest">
            kcal
          </div>
        </div>

        <div className="w-px h-10 bg-zinc-100 shrink-0" />

        <div className="flex-1 grid grid-cols-3 gap-1">
          <MacroItem label="Protein" value={macros.protein} color="text-blue-600" />
          <MacroItem label="Carbs" value={macros.carbs} color="text-amber-600" />
          <MacroItem label="Fat" value={macros.fat} color="text-rose-600" />
        </div>
      </div>

      {/* Macro distribution bar */}
      {totalMacroG > 0 && (
        <div className="mt-3 flex rounded-full overflow-hidden h-1.5 gap-0.5">
          <div
            className="bg-blue-400 rounded-full transition-all duration-500"
            style={{ width: `${proteinPct}%` }}
          />
          <div
            className="bg-amber-400 rounded-full transition-all duration-500"
            style={{ width: `${carbsPct}%` }}
          />
          <div
            className="bg-rose-400 rounded-full transition-all duration-500"
            style={{ width: `${fatPct}%` }}
          />
        </div>
      )}
    </div>
  );
}

function MacroItem({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <div className={`text-base font-bold ${color} leading-none`}>
        {Math.round(value * 10) / 10}
        <span className="text-[10px] font-normal ml-px">g</span>
      </div>
      <div className="text-[10px] text-zinc-400 mt-0.5 font-semibold uppercase tracking-wider">
        {label}
      </div>
    </div>
  );
}
