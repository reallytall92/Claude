"use client";

import { useReducer, useCallback } from "react";
import type { LeaseDraft, WizardState, WizardAction, StepConfig } from "./types";
import { INITIAL_DRAFT } from "./types";
import { STEPS, PROGRESS_MAP } from "./steps";
import { getNextStep } from "./flow";
import { canProceed } from "./validation";
import { applyPrepare } from "./prepare";

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "UPDATE_DRAFT": {
      return {
        ...state,
        draft: { ...state.draft, [action.field]: action.value } as LeaseDraft,
      };
    }

    case "ADVANCE": {
      if (!canProceed(state.currentStep, state.draft)) return state;
      // Determine next step BEFORE prepare, since prepare may reset
      // flags (e.g. addAnotherTenant) that the flow logic depends on.
      const next = getNextStep(state.currentStep, state.draft);
      const prepared = applyPrepare(state.currentStep, state.draft);
      if (!next) return state;
      return {
        currentStep: next,
        draft: prepared,
        history: [...state.history, state.currentStep],
        direction: 1,
      };
    }

    case "SET_AND_ADVANCE": {
      const newDraft = {
        ...state.draft,
        [action.field]: action.value,
      } as LeaseDraft;
      // Determine next step BEFORE prepare, since prepare may reset
      // flags (e.g. addAnotherTenant) that the flow logic depends on.
      const next = getNextStep(state.currentStep, newDraft);
      const prepared = applyPrepare(state.currentStep, newDraft);
      if (!next) return state;
      return {
        currentStep: next,
        draft: prepared,
        history: [...state.history, state.currentStep],
        direction: 1,
      };
    }

    case "BACK": {
      if (state.history.length === 0) return state;
      const history = [...state.history];
      const prev = history.pop()!;
      return {
        ...state,
        currentStep: prev,
        history,
        direction: -1,
      };
    }

    case "JUMP": {
      return {
        ...state,
        currentStep: action.step,
        history: [...state.history, state.currentStep],
        direction: 1,
      };
    }

    default:
      return state;
  }
}

const INITIAL_STATE: WizardState = {
  currentStep: "propertyAddress",
  draft: INITIAL_DRAFT,
  history: [],
  direction: 1,
};

export function useWizard() {
  const [state, dispatch] = useReducer(wizardReducer, INITIAL_STATE);

  const step: StepConfig | undefined = STEPS[state.currentStep];
  const valid = canProceed(state.currentStep, state.draft);
  const progress = PROGRESS_MAP[state.currentStep] ?? 0;

  const updateDraft = useCallback(
    (field: keyof LeaseDraft, value: unknown) =>
      dispatch({ type: "UPDATE_DRAFT", field, value }),
    []
  );

  const advance = useCallback(() => dispatch({ type: "ADVANCE" }), []);

  const setAndAdvance = useCallback(
    (field: keyof LeaseDraft, value: unknown) =>
      dispatch({ type: "SET_AND_ADVANCE", field, value }),
    []
  );

  const back = useCallback(() => dispatch({ type: "BACK" }), []);

  const jumpTo = useCallback(
    (stepId: string) => dispatch({ type: "JUMP", step: stepId }),
    []
  );

  return {
    currentStep: state.currentStep,
    draft: state.draft,
    history: state.history,
    direction: state.direction,
    step,
    canProceed: valid,
    progress,
    canGoBack: state.history.length > 0,
    updateDraft,
    advance,
    setAndAdvance,
    back,
    jumpTo,
  };
}
