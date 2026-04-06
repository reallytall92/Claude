import type { LeaseDraft } from "./types";

/**
 * Pure function: given the current step and draft state, returns the next step ID.
 * Returns null if we've reached the end (should never happen — review is terminal).
 */
export function getNextStep(
  current: string,
  draft: LeaseDraft
): string | null {
  switch (current) {
    // ── Property ──
    case "propertyAddress":
      return "county";
    case "county":
      return "tenantName";

    // ── Parties ──
    case "tenantName":
      return "addAnotherTenant";
    case "addAnotherTenant":
      return draft.addAnotherTenant ? "tenantName" : "leaseStartDate";

    // ── Term ──
    case "leaseStartDate":
      return "leaseTermLength";
    case "leaseTermLength":
      return draft.leaseTermOption === "custom"
        ? "customTermLength"
        : "monthlyRent";
    case "customTermLength":
      return "monthlyRent";

    // ── Financials ──
    case "monthlyRent":
      return "securityDepositMatchesRent";
    case "securityDepositMatchesRent":
      return draft.securityDepositMatchesRent
        ? "numberOfKeys"
        : "securityDeposit";
    case "securityDeposit":
      return "numberOfKeys";

    // ── Keys & Access ──
    case "numberOfKeys":
      return "numberOfGarageOpeners";
    case "numberOfGarageOpeners":
      return "numberOfMailboxKeys";
    case "numberOfMailboxKeys":
      return "numberOfPoolAccessCards";
    case "numberOfPoolAccessCards":
      return "anyExtraItems";

    // ── Extra Items ──
    case "anyExtraItems":
      return draft.hasExtraItems ? "extraItemName" : "maxOccupants";
    case "extraItemName":
      return "extraItemQuantity";
    case "extraItemQuantity":
      return "addAnotherExtraItem";
    case "addAnotherExtraItem":
      return draft.addAnotherExtraItem ? "extraItemName" : "maxOccupants";

    // ── Occupancy ──
    case "maxOccupants":
      return "anyPets";

    // ── Pets ──
    case "anyPets":
      return draft.hasPets ? "petDeposit" : "waterIncluded";
    case "petDeposit":
      return "petRent";
    case "petRent":
      return "waterIncluded";

    // ── Utilities ──
    case "waterIncluded":
      return "sewerIncluded";
    case "sewerIncluded":
      return "electricIncluded";
    case "electricIncluded":
      return "gasIncluded";
    case "gasIncluded":
      return "trashIncluded";
    case "trashIncluded":
      return "internetIncluded";
    case "internetIncluded":
      return "anyOtherUtilities";
    case "anyOtherUtilities":
      return draft.hasOtherUtilities ? "otherUtilityName" : "stoveProvided";
    case "otherUtilityName":
      return "addAnotherUtility";
    case "addAnotherUtility":
      return draft.addAnotherUtility ? "otherUtilityName" : "stoveProvided";

    // ── Appliances ──
    case "stoveProvided":
      return "refrigeratorProvided";
    case "refrigeratorProvided":
      return "dishwasherProvided";
    case "dishwasherProvided":
      return "garbageDisposalProvided";
    case "garbageDisposalProvided":
      return "washerProvided";
    case "washerProvided":
      return "dryerProvided";
    case "dryerProvided":
      return "microwaveProvided";
    case "microwaveProvided":
      return "trashCompactorProvided";
    case "trashCompactorProvided":
      return "anyOtherAppliances";
    case "anyOtherAppliances":
      return draft.hasOtherAppliances
        ? "otherApplianceName"
        : "additionalTerms";
    case "otherApplianceName":
      return "addAnotherAppliance";
    case "addAnotherAppliance":
      return draft.addAnotherAppliance
        ? "otherApplianceName"
        : "additionalTerms";

    // ── Additional ──
    case "additionalTerms":
      return "review";

    // ── Review (terminal) ──
    case "review":
      return null;

    default:
      return null;
  }
}
