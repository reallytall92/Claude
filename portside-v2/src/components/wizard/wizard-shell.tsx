"use client";

import { useWizard } from "@/lib/wizard/use-wizard";
import type { LeaseDraft } from "@/lib/wizard/types";
import { WizardLayout } from "./wizard-layout";
import { TextInput } from "./text-input";
import { AddressAutocompleteInput } from "./address-autocomplete-input";
import { YesNoInput } from "./yes-no-input";
import { CurrencyInput } from "./currency-input";
import { IntegerInput } from "./integer-input";
import { DateInput } from "./date-input";
import { ChoiceInput } from "./choice-input";
import { TextAreaInput } from "./textarea-input";
import { ReviewSummary } from "./review-summary";

export function WizardShell() {
  const wizard = useWizard();
  const { step, draft, direction, currentStep } = wizard;

  if (!step) return null;

  // Review screen has its own layout
  if (step.inputType === "review") {
    return (
      <ReviewSummary
        draft={draft}
        progress={wizard.progress}
        canGoBack={wizard.canGoBack}
        onBack={wizard.back}
        onEdit={wizard.jumpTo}
      />
    );
  }

  const autoAdvances =
    step.inputType === "yesno" || step.inputType === "choice";

  return (
    <WizardLayout
      stepId={currentStep}
      prompt={step.prompt}
      progress={wizard.progress}
      direction={direction}
      canGoBack={wizard.canGoBack}
      onBack={wizard.back}
      showContinue={!autoAdvances}
      canProceed={wizard.canProceed}
      onProceed={wizard.advance}
    >
      {renderInput(wizard)}
    </WizardLayout>
  );
}

function renderInput(wizard: ReturnType<typeof useWizard>) {
  const { step, draft, updateDraft, advance, setAndAdvance } = wizard;
  if (!step) return null;

  const field = step.field;
  const value = draft[field];

  switch (step.inputType) {
    case "addressAutocomplete":
      return (
        <AddressAutocompleteInput
          value={String(value ?? "")}
          onChange={(v) => updateDraft(field, v)}
          onSelect={(address, county) => {
            updateDraft(field, address);
            if (county) {
              updateDraft("county", county);
            }
          }}
          onSubmit={advance}
          placeholder={step.placeholder}
          canSubmit={wizard.canProceed}
        />
      );

    case "text":
      return (
        <TextInput
          value={String(value ?? "")}
          onChange={(v) => updateDraft(field, v)}
          onSubmit={advance}
          placeholder={step.placeholder}
          canSubmit={wizard.canProceed}
        />
      );

    case "yesno":
      return (
        <YesNoInput
          onSelect={(v) => setAndAdvance(field, v)}
        />
      );

    case "currency":
      return (
        <CurrencyInput
          value={String(value ?? "")}
          onChange={(v) => updateDraft(field, v)}
          onSubmit={advance}
          canSubmit={wizard.canProceed}
        />
      );

    case "integer":
      return (
        <IntegerInput
          value={String(value ?? "")}
          onChange={(v) => updateDraft(field, v)}
          onSubmit={advance}
          canSubmit={wizard.canProceed}
        />
      );

    case "date":
      return (
        <DateInput
          value={String(value ?? "")}
          onChange={(v) => updateDraft(field, v)}
          onSubmit={advance}
        />
      );

    case "choice":
      return (
        <ChoiceInput
          choices={step.choices ?? []}
          onSelect={(v) => setAndAdvance(field as keyof LeaseDraft, v)}
        />
      );

    case "textarea":
      return (
        <TextAreaInput
          value={String(value ?? "")}
          onChange={(v) => updateDraft(field, v)}
          placeholder={step.placeholder}
        />
      );

    default:
      return null;
  }
}
