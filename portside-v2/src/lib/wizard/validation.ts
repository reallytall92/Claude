import type { LeaseDraft } from "./types";
import { STEPS } from "./steps";

/**
 * Returns true if the user can proceed from the given step.
 */
export function canProceed(stepId: string, draft: LeaseDraft): boolean {
  const step = STEPS[stepId];
  if (!step) return false;

  switch (step.inputType) {
    case "addressAutocomplete":
    case "text": {
      const val = String(draft[step.field] ?? "").trim();
      if (stepId === "propertyAddress") return val.length >= 5;
      return val.length > 0;
    }

    case "currency": {
      const raw = String(draft[step.field] ?? "").replace(/[^0-9.]/g, "");
      const num = parseFloat(raw);
      return !isNaN(num) && num > 0;
    }

    case "integer": {
      const raw = String(draft[step.field] ?? "").replace(/[^0-9]/g, "");
      const num = parseInt(raw, 10);
      return !isNaN(num) && num >= 0;
    }

    case "yesno":
      return draft[step.field] !== null;

    case "choice":
      return draft[step.field] !== null && draft[step.field] !== "";

    case "date":
      return true; // always valid — calendar defaults to today

    case "textarea":
      return true; // optional — always valid

    case "review":
      return true;

    default:
      return false;
  }
}
