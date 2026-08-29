import "server-only";

import { resolvePincode, type PincodeRegion } from "@/lib/pincode";
import type { SiteSettingsInput } from "@/lib/validation/site-settings";
import type { PaymentMethod } from "@/lib/validation/commerce";

/**
 * Pincode serviceability + COD eligibility.
 *
 * Rules from Site Settings:
 *  - `blockedPincodes` — never deliver here.
 *  - `serviceablePincodes` — if non-empty, ONLY these deliver; empty = every
 *    well-formed Indian PIN is in-area.
 *  - COD is offered when `cod.enabled` and the order value is within
 *    `cod.maxOrderValuePaise`.
 *
 * The exact per-locality courier check and city auto-fill land with a real
 * pincode dataset (Phase I); this is the settings-driven gate.
 */

export interface ServiceabilityResult {
  pincode: string;
  serviceable: boolean;
  reason: "ok" | "malformed" | "blocked" | "out-of-area";
  region: PincodeRegion | null;
  cod: {
    available: boolean;
    reason: "ok" | "disabled" | "over-limit" | "not-serviceable";
    maxOrderValuePaise: number;
  };
}

export function checkServiceability(
  rawPincode: string,
  settings: SiteSettingsInput,
  orderValuePaise = 0,
): ServiceabilityResult {
  const pincode = rawPincode.replace(/\D/g, "");
  const region = resolvePincode(pincode);

  const codMax = settings.cod.maxOrderValuePaise;
  const baseCod = { available: false, maxOrderValuePaise: codMax } as const;

  if (!/^[1-9]\d{5}$/.test(pincode)) {
    return {
      pincode,
      serviceable: false,
      reason: "malformed",
      region: null,
      cod: { ...baseCod, reason: "not-serviceable" },
    };
  }

  const { serviceablePincodes, blockedPincodes } = settings.shipping;
  if (blockedPincodes.includes(pincode)) {
    return {
      pincode,
      serviceable: false,
      reason: "blocked",
      region,
      cod: { ...baseCod, reason: "not-serviceable" },
    };
  }
  if (
    serviceablePincodes.length > 0 &&
    !serviceablePincodes.includes(pincode)
  ) {
    return {
      pincode,
      serviceable: false,
      reason: "out-of-area",
      region,
      cod: { ...baseCod, reason: "not-serviceable" },
    };
  }

  // Serviceable — evaluate COD.
  let codReason: ServiceabilityResult["cod"]["reason"] = "ok";
  let codAvailable = true;
  if (!settings.cod.enabled || !settings.flags.codEnabled) {
    codAvailable = false;
    codReason = "disabled";
  } else if (orderValuePaise > codMax) {
    codAvailable = false;
    codReason = "over-limit";
  }

  return {
    pincode,
    serviceable: true,
    reason: "ok",
    region,
    cod: {
      available: codAvailable,
      reason: codReason,
      maxOrderValuePaise: codMax,
    },
  };
}

/** Which payment methods are offerable for this order. */
export function availableMethods(
  service: ServiceabilityResult,
  settings: SiteSettingsInput,
): PaymentMethod[] {
  const methods: PaymentMethod[] = ["razorpay"];
  if (service.serviceable && service.cod.available) methods.push("cod");
  void settings;
  return methods;
}
