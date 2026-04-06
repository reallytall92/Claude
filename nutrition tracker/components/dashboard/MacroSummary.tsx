"use client";

import { useEffect, useRef } from "react";
import { useMotionValue, useTransform, animate, motion } from "motion/react";

interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface Goals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const MACRO_CONFIG = [
  { key: "protein" as const, label: "Protein", color: "var(--color-protein)", glowColor: "rgba(59,130,246,0.15)" },
  { key: "carbs" as const, label: "Carbs", color: "var(--color-carbs)", glowColor: "rgba(245,158,11,0.15)" },
  { key: "fat" as const, label: "Fat", color: "var(--color-fat)", glowColor: "rgba(244,63,94,0.15)" },
];

/* ─── Animated number counter ─── */
function AnimatedNumber({
  value,
  className,
  decimals = 0,
}: {
  value: number;
  className?: string;
  decimals?: number;
}) {
  const mv = useMotionValue(0);
  const display = useTransform(mv, (v) =>
    decimals > 0 ? v.toFixed(decimals) : Math.round(v).toLocaleString()
  );
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const ctrl = animate(mv, value, {
      duration: 1,
      ease: [0.22, 1, 0.36, 1],
    });
    return () => ctrl.stop();
  }, [value, mv]);

  useEffect(() => {
    const unsub = display.on("change", (v) => {
      if (ref.current) ref.current.textContent = v;
    });
    return unsub;
  }, [display]);

  return <span ref={ref} className={className}>0</span>;
}

/* ─── SVG progress ring ─── */
function ProgressRing({
  size,
  strokeWidth,
  progress,
  color,
  gradientId,
  delay = 0,
  glowColor,
  children,
  ariaLabel,
  ariaValueNow,
  ariaValueMax,
}: {
  size: number;
  strokeWidth: number;
  progress: number; // 0-1
  color: string;
  gradientId: string;
  delay?: number;
  glowColor?: string;
  children?: React.ReactNode;
  ariaLabel?: string;
  ariaValueNow?: number;
  ariaValueMax?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(progress, 1);
  const offset = circumference * (1 - clampedProgress);

  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={ariaValueNow ?? Math.round(progress * 100)}
      aria-valuemin={0}
      aria-valuemax={ariaValueMax ?? 100}
      aria-label={ariaLabel}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="block"
        style={{ transform: "rotate(-90deg)" }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity={0.85} />
            <stop offset="100%" stopColor={color} stopOpacity={1} />
          </linearGradient>
        </defs>

        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-ring-track)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          className="ring-animated"
          style={{
            "--ring-circumference": circumference,
            "--ring-offset": offset,
            animationDelay: `${delay}ms`,
            strokeDashoffset: circumference,
          } as React.CSSProperties}
        />
      </svg>

      {/* Center content */}
      {children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}

/* ─── Macro mini ring with label ─── */
function MacroRing({
  label,
  value,
  goal,
  color,
  glowColor,
  delay,
}: {
  label: string;
  value: number;
  goal: number;
  color: string;
  glowColor: string;
  delay: number;
}) {
  const progress = goal > 0 ? value / goal : 0;
  const isOver = value > goal + 25;

  return (
    <motion.div
      className="flex items-center gap-3"
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: delay / 1000, ease: [0.22, 1, 0.36, 1] }}
    >
      <ProgressRing
        size={52}
        strokeWidth={5}
        progress={progress}
        color={isOver ? "var(--color-fat)" : color}
        gradientId={`macro-${label.toLowerCase()}`}
        delay={delay}
        glowColor={glowColor}
        ariaLabel={`${label}: ${Math.round(value)}g of ${goal}g`}
        ariaValueNow={Math.round(value)}
        ariaValueMax={goal}
      >
        <AnimatedNumber
          value={Math.round(value)}
          className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 leading-none"
        />
      </ProgressRing>

      <div className="min-w-0">
        <div className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider leading-none">
          {label}
        </div>
        <div className="mt-0.5 flex items-baseline gap-1">
          <span className="text-sm font-bold leading-none" style={{ color }}>
            <AnimatedNumber value={Math.round(value)} />
            <span className="text-[10px] font-semibold">g</span>
          </span>
          <span className="text-[10px] text-zinc-300 dark:text-zinc-600 font-medium">/ {goal}g</span>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Main component ─── */
export function MacroSummary({ macros, goals }: { macros: Macros; goals?: Goals }) {
  const CALORIE_GOAL = goals?.calories ?? 2000;
  const MACRO_GOALS = {
    protein: goals?.protein ?? 150,
    carbs: goals?.carbs ?? 250,
    fat: goals?.fat ?? 65,
  };
  const remaining = Math.max(0, CALORIE_GOAL - macros.calories);
  const calorieProgress = CALORIE_GOAL > 0 ? macros.calories / CALORIE_GOAL : 0;
  const isOver = macros.calories > CALORIE_GOAL + 50;
  const isEmpty = macros.calories === 0 && macros.protein === 0 && macros.carbs === 0 && macros.fat === 0;
  const goalReached = !isOver && calorieProgress >= 1;

  return (
    <motion.div
      className="bg-[--color-surface] rounded-2xl shadow-sm border border-zinc-100/80 dark:border-zinc-800/80 p-5"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex items-center gap-5">
        {/* Calorie ring — left */}
        <div className="shrink-0">
          <ProgressRing
            size={128}
            strokeWidth={10}
            progress={calorieProgress}
            color={isOver ? "var(--color-fat)" : "var(--color-calories)"}
            gradientId="calorie-ring"
            glowColor={isOver ? "rgba(244,63,94,0.12)" : "rgba(16,185,129,0.12)"}
            ariaLabel={`Calories: ${Math.round(macros.calories)} of ${CALORIE_GOAL}`}
            ariaValueNow={Math.round(macros.calories)}
            ariaValueMax={CALORIE_GOAL}
          >
            <AnimatedNumber
              value={Math.round(macros.calories)}
              className="text-[26px] font-extrabold text-zinc-900 dark:text-zinc-100 leading-none tracking-tight"
            />
            <span className="text-[9px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mt-1">
              cal
            </span>
          </ProgressRing>

          {/* Remaining label */}
          <div className="text-center mt-1.5">
            <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500">
              {goalReached ? (
                <motion.span
                  className="text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0">
                    <motion.path
                      d="M2.5 6L5 8.5L9.5 3.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.4, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </svg>
                  Goal reached
                </motion.span>
              ) : isOver ? (
                <span className="text-rose-500 dark:text-rose-400">
                  +{Math.round(macros.calories - CALORIE_GOAL)} over
                </span>
              ) : (
                <>{Math.round(remaining)} remaining</>
              )}
            </span>
          </div>
        </div>

        {/* Macro rings — right */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          {MACRO_CONFIG.map((m, i) => (
            <MacroRing
              key={m.key}
              label={m.label}
              value={macros[m.key]}
              goal={MACRO_GOALS[m.key]}
              color={m.color}
              glowColor={m.glowColor}
              delay={200 + i * 120}
            />
          ))}
        </div>
      </div>

      {/* Empty state hint */}
      {isEmpty && (
        <motion.p
          className="text-sm text-zinc-400 dark:text-zinc-500 text-center mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          Log your first meal to see your progress
        </motion.p>
      )}
    </motion.div>
  );
}
