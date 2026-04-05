# Portside V2 — Lease Wizard Logic Reference

Extracted from the original `portside-pipeline-web` project (`Codebases_salvaged_work/portside-pipeline-web/`).

---

## Overview

A step-by-step wizard that walks a user through generating a residential lease agreement. One question per screen, conversational style, with conditional branching based on answers. The final step is a review screen that produces a PDF.

---

## Step Flow (with branching)

```
1.  propertyAddress        — "Enter property address" (text, min 5 chars)
2.  tenantName             — "Add tenant name" (text)
3.  addAnotherTenant       — "Add another tenant?" (yes/no)
      ├─ YES → loop back to step 2 (tenantName)
      └─ NO  → continue
4.  confirmCounty          — "Confirm county" (yes/no, county auto-looked-up from address)
      ├─ YES → accept suggestion, skip to step 6
      └─ NO  → continue to step 5
5.  manualCounty           — "Enter county" (text)
6.  leaseStartDate         — "Lease start date" (date picker)
7.  leaseTermLength        — "Lease term length" (choice: 6 months / 12 months / custom)
      ├─ CUSTOM → continue to step 8
      └─ 6 or 12 → skip to step 9
8.  customTermLength       — "Custom term length" (integer, months)
9.  monthlyRent            — "Monthly rent" (currency)
10. securityDepositMatchesRent — "Security deposit equals rent?" (yes/no)
      ├─ YES → auto-set deposit = rent, skip to step 12
      └─ NO  → continue
11. securityDeposit        — "Security deposit amount" (currency)
12. numberOfKeys           — "Number of keys" (integer)
13. numberOfGarageOpeners  — "Number of garage door openers" (integer)
14. numberOfMailboxKeys    — "Number of mailbox keys" (integer)
15. numberOfPoolAccessCards— "Number of pool access cards" (integer)
16. anyExtraItems          — "Any extra items?" (yes/no)
      ├─ YES → continue to step 17
      └─ NO  → skip to step 20
17. extraItemName          — "Extra item name" (text)
18. extraItemQuantity      — "Extra item quantity" (integer)
19. addAnotherExtraItem    — "Add another extra item?" (yes/no)
      ├─ YES → loop back to step 17
      └─ NO  → continue
20. maxOccupants           — "Max occupants" (integer)
21. anyPets                — "Any pets?" (yes/no)
      ├─ YES → continue to steps 22-23
      └─ NO  → skip to step 24
22. petDeposit             — "Pet deposit" (currency)
23. petRent                — "Pet rent" (currency)

--- UTILITIES (each yes/no) ---
24. waterIncluded          — "Water included?"
25. sewerIncluded          — "Sewer included?"
26. electricIncluded       — "Electric included?"
27. gasIncluded            — "Gas included?"
28. trashIncluded          — "Trash included?"
29. internetIncluded       — "Internet included?"
30. anyOtherUtilities      — "Any other utilities included?" (yes/no)
      ├─ YES → continue
      └─ NO  → skip to step 33
31. otherUtilityName       — "Add utility name" (text)
32. addAnotherUtility      — "Add another utility?" (yes/no)
      ├─ YES → loop back to step 31
      └─ NO  → continue

--- APPLIANCES (each yes/no) ---
33. stoveProvided          — "Stove provided?"
34. refrigeratorProvided   — "Refrigerator provided?"
35. dishwasherProvided     — "Dishwasher provided?"
36. garbageDisposalProvided— "Garbage disposal provided?"
37. washerProvided         — "Washer provided?"
38. dryerProvided          — "Dryer provided?"
39. microwaveProvided      — "Microwave provided?"
40. trashCompactorProvided — "Trash compactor provided?"
41. anyOtherAppliances     — "Any other appliances?" (yes/no)
      ├─ YES → continue
      └─ NO  → skip to step 44
42. otherApplianceName     — "Add appliance name" (text)
43. addAnotherAppliance    — "Add another appliance?" (yes/no)
      ├─ YES → loop back to step 42
      └─ NO  → continue

44. additionalTerms        — "Additional terms" (textarea, optional)
45. review                 — Summary with per-section "Edit" links → "Confirm & Generate" PDF
```

---

## Branching Rules Summary

| Decision Point                | YES path                       | NO path                    |
|-------------------------------|--------------------------------|----------------------------|
| addAnotherTenant              | Loop → tenantName              | → confirmCounty            |
| confirmCounty                 | Accept suggestion → leaseStart | → manualCounty             |
| leaseTermLength = "custom"    | → customTermLength             | → monthlyRent              |
| securityDepositMatchesRent    | Auto-set deposit → numberOfKeys| → securityDeposit          |
| anyExtraItems                 | → extraItemName                | → maxOccupants             |
| addAnotherExtraItem           | Loop → extraItemName           | → maxOccupants             |
| anyPets                       | → petDeposit                   | → waterIncluded            |
| anyOtherUtilities             | → otherUtilityName             | → stoveProvided            |
| addAnotherUtility             | Loop → otherUtilityName        | → stoveProvided            |
| anyOtherAppliances            | → otherApplianceName           | → additionalTerms          |
| addAnotherAppliance           | Loop → otherApplianceName      | → additionalTerms          |

---

## Data Model

### LeaseDraft (user input state)

```typescript
type LeaseDraft = {
  // Tenants
  tenants: string[];
  pendingTenantName: string;
  addAnotherTenant: boolean | null;

  // Property
  propertyAddress: string;
  countySuggestion: string;
  countyConfirmed: boolean | null;
  county: string;

  // Term
  leaseStartDate: string;              // ISO yyyy-mm-dd
  leaseTermOption: "sixMonths" | "twelveMonths" | "custom" | null;
  customTermMonths: string;

  // Money
  monthlyRent: string;
  securityDepositMatchesRent: boolean | null;
  securityDeposit: string;

  // Keys/Access
  numberOfKeys: string;
  numberOfGarageOpeners: string;
  numberOfMailboxKeys: string;
  numberOfPoolAccessCards: string;

  // Extra Items (dynamic list via add-another loop)
  hasExtraItems: boolean | null;
  extraItemName: string;
  extraItemQuantity: string;
  extraItems: LeaseQuantityItem[];
  addAnotherExtraItem: boolean | null;

  // Occupancy
  maxOccupants: string;

  // Pets (conditional on hasPets)
  hasPets: boolean | null;
  petDeposit: string;
  petRent: string;

  // Utilities (6 standard booleans + dynamic "other" list)
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

  // Appliances (8 standard booleans + dynamic "other" list)
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

  // Additional Terms
  hasAdditionalTerms: boolean | null;
  additionalTerms: string;
};

type LeaseQuantityItem = {
  id: string;
  name: string;
  quantity: number;
};
```

### LeasePayload (computed output, sent to PDF)

```typescript
type LeasePayload = {
  tenants: string[];
  propertyAddress: string;
  county: string;
  leaseStartDate: Date;
  leaseTermMonths: number;
  leaseEndDate: Date;                  // computed: start + months - 1 day
  monthlyRent: number;
  rentPerDay: number;                  // computed: monthlyRent / 30
  securityDeposit: number;
  buyoutFee: number;                   // computed: monthlyRent * 2
  numberOfKeys: number;
  numberOfGarageOpeners: number;
  numberOfMailboxKeys: number;
  numberOfPoolAccessCards: number;
  extraItems: LeaseQuantityItem[];
  maxOccupants: number;
  petDeposit: number;
  petRent: number;
  petDepositWords: string;             // computed: e.g. "Two hundred fifty dollars ($250.00)"
  petRentWords: string;                // computed
  utilitiesIncluded: string[];         // e.g. ["Water", "Sewer", "Electric"]
  otherUtilities: string[];
  appliancesProvided: string[];        // e.g. ["Stove", "Refrigerator"]
  otherAppliances: string[];
  additionalTerms: string;
};
```

---

## Computed / Derived Fields

These are NOT asked of the user — they are calculated from other inputs:

| Field            | Formula                                    |
|------------------|--------------------------------------------|
| leaseEndDate     | `startDate + termMonths`, then subtract 1 day |
| rentPerDay       | `monthlyRent / 30`                         |
| buyoutFee        | `monthlyRent * 2`                          |
| petDepositWords  | Currency amount spelled out in English words |
| petRentWords     | Currency amount spelled out in English words |

---

## Wizard Mechanics

### State Machine
- **Reducer-driven**: a `wizardReducer` handles actions: `ADVANCE`, `BACK`, `JUMP`, `PATCH_DRAFT`, `SET_COUNTY_SUGGESTION`
- **History stack**: every `ADVANCE` pushes the current step onto `history[]`; `BACK` pops from it
- **`nextStep(step, draft)`**: pure function — takes current step + draft state, returns the next step (or `null` at review)
- **`applyPrepare(step, draft)`**: side-effects applied before advancing:
  - `tenantName` → commits `pendingTenantName` into `tenants[]`, clears temp field
  - `extraItemQuantity` → commits item into `extraItems[]`, clears temp fields
  - `otherUtilityName` → commits into `otherUtilities[]`, clears temp field
  - `otherApplianceName` → commits into `otherAppliances[]`, clears temp field
  - `confirmCounty` (YES) → copies `countySuggestion` into `county`
  - `securityDepositMatchesRent` (YES) → copies `monthlyRent` into `securityDeposit`
  - `anyExtraItems` (NO) → clears `extraItems`
  - `anyPets` (NO) → clears pet deposit/rent
  - `anyOtherUtilities` (NO) → clears `otherUtilities`
  - `anyOtherAppliances` (NO) → clears `otherAppliances`

### Validation (`canProceed` per step)
- Text fields: must be non-empty (or meet min length, e.g. address >= 5 chars)
- Currency fields: must parse to a number > 0 (or >= 0 for deposits)
- Integer fields: must parse to >= 0
- Yes/No fields: must not be `null` (user must choose)
- `leaseStartDate`, `additionalTerms`, `review`: always valid (can proceed)

### Review Screen
- Built from `buildSummarySections(payload)` — 11 sections:
  Parties, Property, Lease Term, Rent & Deposits, Keys & Access, Extra Items, Occupancy, Pets, Utilities, Appliances, Additional Terms
- Each section has an "Edit" button that `JUMP`s back to the relevant first step of that section
- "Confirm & Generate" triggers PDF generation

---

## Input Types by Step

| Type       | Steps                                                                    |
|------------|--------------------------------------------------------------------------|
| Text       | propertyAddress, tenantName, manualCounty, extraItemName, otherUtilityName, otherApplianceName |
| Currency   | monthlyRent, securityDeposit, petDeposit, petRent                        |
| Integer    | customTermLength, numberOfKeys, numberOfGarageOpeners, numberOfMailboxKeys, numberOfPoolAccessCards, extraItemQuantity, maxOccupants |
| Date       | leaseStartDate                                                           |
| Choice     | leaseTermLength (6mo / 12mo / custom)                                    |
| Yes/No     | addAnotherTenant, confirmCounty, securityDepositMatchesRent, anyExtraItems, addAnotherExtraItem, anyPets, waterIncluded, sewerIncluded, electricIncluded, gasIncluded, trashIncluded, internetIncluded, anyOtherUtilities, addAnotherUtility, stoveProvided, refrigeratorProvided, dishwasherProvided, garbageDisposalProvided, washerProvided, dryerProvided, microwaveProvided, trashCompactorProvided, anyOtherAppliances, addAnotherAppliance |
| Textarea   | additionalTerms                                                          |
| Review     | review                                                                   |

---

## External Integrations (V1)

These were specific to the original Portside app. They are documented here for context but are not required for V2.

| Integration          | Endpoint              | Purpose                                              |
|----------------------|-----------------------|------------------------------------------------------|
| DoorLoop             | `/api/properties`     | Property management sync — populates address autocomplete |
| Geocoding            | `/api/autocomplete`   | Address autocomplete with location bias              |
| County lookup        | `/api/county`         | Auto-suggests county from the entered address        |
| PDF generation       | `/api/lease/pdf`      | POST finalized payload, returns PDF blob             |

---

## Sample Data

From the original fixtures (`portside_lease_answers.sample.json`):

```json
{
  "tenant_names": "John K / Jane K",
  "property_address": "123 Main St, Summerville, SC 29485",
  "county": "Dorchester County",
  "lease_start_date": "01/12/2026",
  "lease_end_date": "01/11/2027",
  "rent_per_month": "$2,500.00",
  "rent_per_day": "$83.33",
  "security_deposit": "$2,500.00",
  "keys_provided": true,
  "keys_count": 2,
  "garage_openers_provided": true,
  "garage_openers_count": 1,
  "mailbox_keys_provided": true,
  "mailbox_keys_count": 2,
  "pool_keys_provided": false,
  "pool_keys_count": 0,
  "other_access_items_provided": true,
  "other_access_items": "Gate fob x2",
  "max_occupants": 3,
  "pet_rent_monthly": "$0.00",
  "util_water": true,
  "util_sewer": true,
  "util_trash": false,
  "util_electric": true,
  "util_gas": false,
  "util_internet": true,
  "appliance_stove": true,
  "appliance_refrigerator": true,
  "appliance_dishwasher": false,
  "appliance_garbage_disposal": true,
  "appliance_washer": true,
  "appliance_dryer": true,
  "appliance_microwave": false,
  "appliance_other_checked": true,
  "appliance_other": "Trash compactor",
  "additional_terms": "No smoking. Tenant responsible for filters. Late fee after 5th."
}
```

---

## Source Files (V1 locations)

| File | Purpose |
|------|---------|
| `src/app/lease/page.tsx` | Main wizard component — step state machine, UI rendering, all branching logic |
| `src/lib/types.ts` | `LeaseDraft`, `LeaseQuantityItem`, `LeaseTermOption`, `DoorLoopProperty` types |
| `src/lib/lease.ts` | `buildPayload`, `buildSummarySections`, `payloadForPdf`, utility helpers |
| `src/lib/format.ts` | `currency()`, `formatDateMMDDYYYY()` |
| `src/lib/portside.ts` | Design tokens (colors, spacing) |
| `src/components/Screen.tsx` | Full-height screen wrapper |
| `src/components/PromptLayout.tsx` | Centered single-question layout (editing vs resting modes) |
| `src/components/Field.tsx` | `FieldLabel`, `TextField`, `TextArea` components |
| `src/components/Button.tsx` | Primary/secondary button |
| `src/components/Card.tsx` | Card container |
| `src/components/TopBar.tsx` | Navigation bar with back button |
