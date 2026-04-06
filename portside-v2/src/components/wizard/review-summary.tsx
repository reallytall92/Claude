"use client";

import { motion } from "motion/react";
import { ArrowLeft, Pencil, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LeaseDraft, Section } from "@/lib/wizard/types";
import { SECTION_LABELS } from "@/lib/wizard/types";
import { SECTION_FIRST_STEP } from "@/lib/wizard/steps";

type ReviewSummaryProps = {
  draft: LeaseDraft;
  progress: number;
  canGoBack: boolean;
  onBack: () => void;
  onEdit: (stepId: string) => void;
};

type SummaryRow = { label: string; value: string };
type SummarySection = { section: Section; rows: SummaryRow[] };

function buildSections(d: LeaseDraft): SummarySection[] {
  const sections: SummarySection[] = [];

  // Property
  const countyDisplay = d.county
    ? d.county.toLowerCase().includes("county")
      ? d.county
      : `${d.county} County`
    : "—";
  sections.push({
    section: "property",
    rows: [
      { label: "Address", value: d.propertyAddress || "—" },
      { label: "County", value: countyDisplay },
    ],
  });

  // Parties
  sections.push({
    section: "parties",
    rows: [{ label: "Tenants", value: d.tenants.join(", ") || "—" }],
  });

  // Term
  const termLabel =
    d.leaseTermOption === "sixMonths"
      ? "6 months"
      : d.leaseTermOption === "twelveMonths"
        ? "12 months"
        : d.customTermMonths
          ? `${d.customTermMonths} months`
          : "—";
  sections.push({
    section: "term",
    rows: [
      {
        label: "Start Date",
        value: d.leaseStartDate
          ? new Date(d.leaseStartDate + "T00:00:00").toLocaleDateString(
              "en-US",
              { month: "long", day: "numeric", year: "numeric" }
            )
          : "—",
      },
      { label: "Length", value: termLabel },
    ],
  });

  // Financials
  const fmt = (v: string) => {
    const n = parseInt(v.replace(/[^0-9]/g, ""), 10);
    return isNaN(n) ? "—" : `$${n.toLocaleString("en-US")}`;
  };
  sections.push({
    section: "financials",
    rows: [
      { label: "Monthly Rent", value: fmt(d.monthlyRent) },
      { label: "Security Deposit", value: fmt(d.securityDeposit) },
    ],
  });

  // Access
  sections.push({
    section: "access",
    rows: [
      { label: "Keys", value: d.numberOfKeys || "0" },
      { label: "Garage Openers", value: d.numberOfGarageOpeners || "0" },
      { label: "Mailbox Keys", value: d.numberOfMailboxKeys || "0" },
      { label: "Pool Cards", value: d.numberOfPoolAccessCards || "0" },
    ],
  });

  // Extra Items
  if (d.extraItems.length > 0) {
    sections.push({
      section: "extraItems",
      rows: d.extraItems.map((item) => ({
        label: item.name,
        value: String(item.quantity),
      })),
    });
  } else {
    sections.push({
      section: "extraItems",
      rows: [{ label: "Extra Items", value: "None" }],
    });
  }

  // Occupancy
  sections.push({
    section: "occupancy",
    rows: [{ label: "Max Occupants", value: d.maxOccupants || "—" }],
  });

  // Pets
  if (d.hasPets) {
    sections.push({
      section: "pets",
      rows: [
        { label: "Pet Deposit", value: fmt(d.petDeposit) },
        { label: "Monthly Pet Rent", value: fmt(d.petRent) },
      ],
    });
  } else {
    sections.push({
      section: "pets",
      rows: [{ label: "Pets", value: "No pets" }],
    });
  }

  // Utilities
  const includedUtils: string[] = [];
  if (d.waterIncluded) includedUtils.push("Water");
  if (d.sewerIncluded) includedUtils.push("Sewer");
  if (d.electricIncluded) includedUtils.push("Electric");
  if (d.gasIncluded) includedUtils.push("Gas");
  if (d.trashIncluded) includedUtils.push("Trash");
  if (d.internetIncluded) includedUtils.push("Internet");
  const allUtils = [...includedUtils, ...d.otherUtilities];
  sections.push({
    section: "utilities",
    rows: [
      {
        label: "Included",
        value: allUtils.length > 0 ? allUtils.join(", ") : "None",
      },
    ],
  });

  // Appliances
  const providedApps: string[] = [];
  if (d.stoveProvided) providedApps.push("Stove");
  if (d.refrigeratorProvided) providedApps.push("Refrigerator");
  if (d.dishwasherProvided) providedApps.push("Dishwasher");
  if (d.garbageDisposalProvided) providedApps.push("Garbage Disposal");
  if (d.washerProvided) providedApps.push("Washer");
  if (d.dryerProvided) providedApps.push("Dryer");
  if (d.microwaveProvided) providedApps.push("Microwave");
  if (d.trashCompactorProvided) providedApps.push("Trash Compactor");
  const allApps = [...providedApps, ...d.otherAppliances];
  sections.push({
    section: "appliances",
    rows: [
      {
        label: "Provided",
        value: allApps.length > 0 ? allApps.join(", ") : "None",
      },
    ],
  });

  // Additional Terms
  sections.push({
    section: "additional",
    rows: [
      {
        label: "Terms",
        value: d.additionalTerms.trim() || "None",
      },
    ],
  });

  return sections;
}

export function ReviewSummary({
  draft,
  progress,
  canGoBack,
  onBack,
  onEdit,
}: ReviewSummaryProps) {
  const sections = buildSections(draft);

  return (
    <div className="flex flex-col h-dvh bg-background">
      {/* Header */}
      <header className="flex-none px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <div className="flex items-center h-10">
          {canGoBack && (
            <button
              onClick={onBack}
              className="flex items-center justify-center size-10 -ml-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="size-5" />
            </button>
          )}
        </div>
        {/* Full progress bar */}
        <div className="mt-1 h-1 w-full rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          />
        </div>
      </header>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 pt-6 pb-4">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Review your lease
        </h1>
        <p className="mt-1 text-muted-foreground">
          Double-check everything before generating.
        </p>

        <div className="mt-6 space-y-4">
          {sections.map((s, i) => (
            <motion.div
              key={s.section}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={cn(
                "rounded-2xl border border-border bg-card p-4",
                "shadow-sm"
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {SECTION_LABELS[s.section]}
                </h2>
                <button
                  onClick={() => onEdit(SECTION_FIRST_STEP[s.section])}
                  className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  <Pencil className="size-3.5" />
                  Edit
                </button>
              </div>
              <div className="space-y-2">
                {s.rows.map((row, j) => (
                  <div key={j} className="flex justify-between gap-4">
                    <span className="text-muted-foreground text-sm">
                      {row.label}
                    </span>
                    <span className="text-sm font-medium text-right">
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Generate button */}
      <footer
        className={cn(
          "flex-none px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3",
          "border-t border-border/50 bg-background"
        )}
      >
        <Button
          className={cn(
            "w-full h-14 text-base font-medium rounded-2xl gap-2",
            "bg-primary text-primary-foreground",
            "hover:bg-primary/90"
          )}
          disabled
        >
          <FileText className="size-5" />
          Generate Lease PDF
        </Button>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          PDF generation coming soon
        </p>
      </footer>
    </div>
  );
}
