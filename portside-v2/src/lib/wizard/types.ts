export type LeaseTermOption = "sixMonths" | "twelveMonths" | "custom";

export type LeaseQuantityItem = {
  id: string;
  name: string;
  quantity: number;
};

export type LeaseDraft = {
  // Parties
  tenants: string[];
  pendingTenantName: string;
  addAnotherTenant: boolean | null;

  // Property
  propertyAddress: string;
  county: string;

  // Term
  leaseStartDate: string; // ISO yyyy-mm-dd
  leaseTermOption: LeaseTermOption | null;
  customTermMonths: string;

  // Financials
  monthlyRent: string;
  securityDepositMatchesRent: boolean | null;
  securityDeposit: string;

  // Keys & Access
  numberOfKeys: string;
  numberOfGarageOpeners: string;
  numberOfMailboxKeys: string;
  numberOfPoolAccessCards: string;

  // Extra Items
  hasExtraItems: boolean | null;
  extraItemName: string;
  extraItemQuantity: string;
  extraItems: LeaseQuantityItem[];
  addAnotherExtraItem: boolean | null;

  // Occupancy
  maxOccupants: string;

  // Pets
  hasPets: boolean | null;
  petDeposit: string;
  petRent: string;

  // Utilities
  waterIncluded: boolean | null;
  sewerIncluded: boolean | null;
  electricIncluded: boolean | null;
  gasIncluded: boolean | null;
  trashIncluded: boolean | null;
  internetIncluded: boolean | null;
  hasOtherUtilities: boolean | null;
  otherUtilityName: string;
  otherUtilities: string[];
  addAnotherUtility: boolean | null;

  // Appliances
  stoveProvided: boolean | null;
  refrigeratorProvided: boolean | null;
  dishwasherProvided: boolean | null;
  garbageDisposalProvided: boolean | null;
  washerProvided: boolean | null;
  dryerProvided: boolean | null;
  microwaveProvided: boolean | null;
  trashCompactorProvided: boolean | null;
  hasOtherAppliances: boolean | null;
  otherApplianceName: string;
  otherAppliances: string[];
  addAnotherAppliance: boolean | null;

  // Additional
  additionalTerms: string;
};

export type InputType =
  | "text"
  | "addressAutocomplete"
  | "yesno"
  | "currency"
  | "integer"
  | "date"
  | "choice"
  | "textarea"
  | "review";

export type Section =
  | "parties"
  | "property"
  | "term"
  | "financials"
  | "access"
  | "extraItems"
  | "occupancy"
  | "pets"
  | "utilities"
  | "appliances"
  | "additional";

export type ChoiceOption = {
  value: string;
  label: string;
  description?: string;
};

export type StepConfig = {
  id: string;
  section: Section | "review";
  prompt: string;
  inputType: InputType;
  field: keyof LeaseDraft;
  placeholder?: string;
  choices?: ChoiceOption[];
};

export type WizardState = {
  currentStep: string;
  draft: LeaseDraft;
  history: string[];
  direction: 1 | -1;
};

export type WizardAction =
  | { type: "ADVANCE" }
  | { type: "BACK" }
  | { type: "JUMP"; step: string }
  | { type: "UPDATE_DRAFT"; field: keyof LeaseDraft; value: unknown }
  | { type: "SET_AND_ADVANCE"; field: keyof LeaseDraft; value: unknown };

export const INITIAL_DRAFT: LeaseDraft = {
  tenants: [],
  pendingTenantName: "",
  addAnotherTenant: null,
  propertyAddress: "",
  county: "",
  leaseStartDate: "",
  leaseTermOption: null,
  customTermMonths: "",
  monthlyRent: "",
  securityDepositMatchesRent: null,
  securityDeposit: "",
  numberOfKeys: "",
  numberOfGarageOpeners: "",
  numberOfMailboxKeys: "",
  numberOfPoolAccessCards: "",
  hasExtraItems: null,
  extraItemName: "",
  extraItemQuantity: "",
  extraItems: [],
  addAnotherExtraItem: null,
  maxOccupants: "",
  hasPets: null,
  petDeposit: "",
  petRent: "",
  waterIncluded: null,
  sewerIncluded: null,
  electricIncluded: null,
  gasIncluded: null,
  trashIncluded: null,
  internetIncluded: null,
  hasOtherUtilities: null,
  otherUtilityName: "",
  otherUtilities: [],
  addAnotherUtility: null,
  stoveProvided: null,
  refrigeratorProvided: null,
  dishwasherProvided: null,
  garbageDisposalProvided: null,
  washerProvided: null,
  dryerProvided: null,
  microwaveProvided: null,
  trashCompactorProvided: null,
  hasOtherAppliances: null,
  otherApplianceName: "",
  otherAppliances: [],
  addAnotherAppliance: null,
  additionalTerms: "",
};

export const SECTION_LABELS: Record<Section, string> = {
  parties: "Parties",
  property: "Property",
  term: "Lease Term",
  financials: "Rent & Deposits",
  access: "Keys & Access",
  extraItems: "Extra Items",
  occupancy: "Occupancy",
  pets: "Pets",
  utilities: "Utilities",
  appliances: "Appliances",
  additional: "Additional Terms",
};
