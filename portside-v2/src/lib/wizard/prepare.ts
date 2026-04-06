import type { LeaseDraft } from "./types";

/**
 * Side-effects applied to the draft BEFORE advancing to the next step.
 * Commits pending data into arrays, auto-sets derived values, etc.
 * Returns a new draft (does not mutate the input).
 */
export function applyPrepare(stepId: string, draft: LeaseDraft): LeaseDraft {
  const d = { ...draft };

  switch (stepId) {
    // Commit pending tenant name into the tenants array
    case "tenantName": {
      const name = d.pendingTenantName.trim();
      if (name) {
        d.tenants = [...d.tenants, name];
        d.pendingTenantName = "";
      }
      break;
    }

    // Reset the addAnotherTenant flag so it's fresh if we loop back
    case "addAnotherTenant": {
      if (d.addAnotherTenant) {
        d.addAnotherTenant = null;
      }
      break;
    }

    // Auto-set security deposit to match rent
    case "securityDepositMatchesRent": {
      if (d.securityDepositMatchesRent) {
        d.securityDeposit = d.monthlyRent;
      }
      break;
    }

    // Clear extra items if user said "no"
    case "anyExtraItems": {
      if (!d.hasExtraItems) {
        d.extraItems = [];
        d.extraItemName = "";
        d.extraItemQuantity = "";
      }
      break;
    }

    // Commit pending extra item into the array
    case "extraItemQuantity": {
      const name = d.extraItemName.trim();
      const qty = parseInt(d.extraItemQuantity, 10);
      if (name && !isNaN(qty) && qty >= 0) {
        d.extraItems = [
          ...d.extraItems,
          { id: crypto.randomUUID(), name, quantity: qty },
        ];
        d.extraItemName = "";
        d.extraItemQuantity = "";
      }
      break;
    }

    // Reset add-another flag for extra items
    case "addAnotherExtraItem": {
      if (d.addAnotherExtraItem) {
        d.addAnotherExtraItem = null;
      }
      break;
    }

    // Clear pet fields if user said "no pets"
    case "anyPets": {
      if (!d.hasPets) {
        d.petDeposit = "";
        d.petRent = "";
      }
      break;
    }

    // Clear other utilities if user said "no"
    case "anyOtherUtilities": {
      if (!d.hasOtherUtilities) {
        d.otherUtilities = [];
        d.otherUtilityName = "";
      }
      break;
    }

    // Commit pending utility name into the array
    case "otherUtilityName": {
      const name = d.otherUtilityName.trim();
      if (name) {
        d.otherUtilities = [...d.otherUtilities, name];
        d.otherUtilityName = "";
      }
      break;
    }

    // Reset add-another flag for utilities
    case "addAnotherUtility": {
      if (d.addAnotherUtility) {
        d.addAnotherUtility = null;
      }
      break;
    }

    // Clear other appliances if user said "no"
    case "anyOtherAppliances": {
      if (!d.hasOtherAppliances) {
        d.otherAppliances = [];
        d.otherApplianceName = "";
      }
      break;
    }

    // Commit pending appliance name into the array
    case "otherApplianceName": {
      const name = d.otherApplianceName.trim();
      if (name) {
        d.otherAppliances = [...d.otherAppliances, name];
        d.otherApplianceName = "";
      }
      break;
    }

    // Reset add-another flag for appliances
    case "addAnotherAppliance": {
      if (d.addAnotherAppliance) {
        d.addAnotherAppliance = null;
      }
      break;
    }
  }

  return d;
}
