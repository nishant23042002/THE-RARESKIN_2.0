/**
 * India PIN code → state resolution.
 *
 * Isomorphic (no DB, no secrets): the checkout form uses it to auto-fill the
 * state as the shopper types a PIN; the server uses the resolved GST state code
 * to decide CGST+SGST vs IGST. This is a *prefix* table keyed on the first two
 * digits of the PIN — the postal circle — which is enough to name the state and
 * pick its two-digit GST state code. It is not a delivery-time or exact-locality
 * lookup; that (and city auto-fill) comes with a real pincode dataset later.
 *
 * Source: India Post postal-circle numbering + the CBIC GST state code list.
 */

export interface PincodeRegion {
  /** two-digit GST state code, e.g. "27" for Maharashtra */
  stateCode: string;
  /** display name, e.g. "Maharashtra" */
  state: string;
}

/** First two PIN digits → region. A few circles span two leading pairs. */
const PREFIX_TO_REGION: Record<string, PincodeRegion> = {
  // Delhi
  "11": { stateCode: "07", state: "Delhi" },
  // Haryana
  "12": { stateCode: "06", state: "Haryana" },
  "13": { stateCode: "06", state: "Haryana" },
  // Punjab
  "14": { stateCode: "03", state: "Punjab" },
  "15": { stateCode: "03", state: "Punjab" },
  // Himachal Pradesh
  "16": { stateCode: "02", state: "Himachal Pradesh" },
  // Jammu & Kashmir / Ladakh
  "18": { stateCode: "01", state: "Jammu & Kashmir" },
  "19": { stateCode: "01", state: "Jammu & Kashmir" },
  // Uttar Pradesh / Uttarakhand
  "20": { stateCode: "09", state: "Uttar Pradesh" },
  "21": { stateCode: "09", state: "Uttar Pradesh" },
  "22": { stateCode: "09", state: "Uttar Pradesh" },
  "23": { stateCode: "09", state: "Uttar Pradesh" },
  "24": { stateCode: "09", state: "Uttar Pradesh" },
  "25": { stateCode: "09", state: "Uttar Pradesh" },
  "26": { stateCode: "09", state: "Uttar Pradesh" },
  "27": { stateCode: "09", state: "Uttar Pradesh" },
  "28": { stateCode: "09", state: "Uttar Pradesh" },
  // Rajasthan
  "30": { stateCode: "08", state: "Rajasthan" },
  "31": { stateCode: "08", state: "Rajasthan" },
  "32": { stateCode: "08", state: "Rajasthan" },
  "33": { stateCode: "08", state: "Rajasthan" },
  "34": { stateCode: "08", state: "Rajasthan" },
  // Gujarat / Dadra & Nagar Haveli / Daman & Diu
  "36": { stateCode: "24", state: "Gujarat" },
  "37": { stateCode: "24", state: "Gujarat" },
  "38": { stateCode: "24", state: "Gujarat" },
  "39": { stateCode: "24", state: "Gujarat" },
  // Maharashtra / Goa
  "40": { stateCode: "27", state: "Maharashtra" },
  "41": { stateCode: "27", state: "Maharashtra" },
  "42": { stateCode: "27", state: "Maharashtra" },
  "43": { stateCode: "27", state: "Maharashtra" },
  "44": { stateCode: "27", state: "Maharashtra" },
  "45": { stateCode: "23", state: "Madhya Pradesh" },
  "46": { stateCode: "23", state: "Madhya Pradesh" },
  "47": { stateCode: "23", state: "Madhya Pradesh" },
  "48": { stateCode: "23", state: "Madhya Pradesh" },
  "49": { stateCode: "22", state: "Chhattisgarh" },
  // (Goa carves out of the 403xxx block — handled in resolvePincode)
  // Andhra Pradesh / Telangana
  "50": { stateCode: "36", state: "Telangana" },
  "51": { stateCode: "37", state: "Andhra Pradesh" },
  "52": { stateCode: "37", state: "Andhra Pradesh" },
  "53": { stateCode: "37", state: "Andhra Pradesh" },
  // Karnataka
  "56": { stateCode: "29", state: "Karnataka" },
  "57": { stateCode: "29", state: "Karnataka" },
  "58": { stateCode: "29", state: "Karnataka" },
  "59": { stateCode: "29", state: "Karnataka" },
  // Tamil Nadu / Puducherry
  "60": { stateCode: "33", state: "Tamil Nadu" },
  "61": { stateCode: "33", state: "Tamil Nadu" },
  "62": { stateCode: "33", state: "Tamil Nadu" },
  "63": { stateCode: "33", state: "Tamil Nadu" },
  "64": { stateCode: "33", state: "Tamil Nadu" },
  // Kerala / Lakshadweep
  "67": { stateCode: "32", state: "Kerala" },
  "68": { stateCode: "32", state: "Kerala" },
  "69": { stateCode: "32", state: "Kerala" },
  // West Bengal / Andaman & Nicobar / Sikkim
  "70": { stateCode: "19", state: "West Bengal" },
  "71": { stateCode: "19", state: "West Bengal" },
  "72": { stateCode: "19", state: "West Bengal" },
  "73": { stateCode: "19", state: "West Bengal" },
  "74": { stateCode: "19", state: "West Bengal" },
  // Odisha
  "75": { stateCode: "21", state: "Odisha" },
  "76": { stateCode: "21", state: "Odisha" },
  "77": { stateCode: "21", state: "Odisha" },
  // Assam / North-East
  "78": { stateCode: "18", state: "Assam" },
  "79": { stateCode: "18", state: "Arunachal Pradesh / North-East" },
  // Bihar / Jharkhand
  "80": { stateCode: "10", state: "Bihar" },
  "81": { stateCode: "10", state: "Bihar" },
  "82": { stateCode: "10", state: "Bihar" },
  "83": { stateCode: "20", state: "Jharkhand" },
  "84": { stateCode: "10", state: "Bihar" },
  "85": { stateCode: "20", state: "Jharkhand" },
};

/**
 * Resolve a 6-digit PIN to its postal circle / GST state. Returns `null` for a
 * malformed PIN or an unmapped prefix (the caller then asks the shopper to pick
 * the state manually rather than guessing).
 */
export function resolvePincode(pin: string): PincodeRegion | null {
  const digits = pin.replace(/\D/g, "");
  if (!/^[1-9]\d{5}$/.test(digits)) return null;

  // Goa carves out of the 403xxx block inside Maharashtra's circle.
  if (digits.startsWith("403")) return { stateCode: "30", state: "Goa" };

  const two = digits.slice(0, 2);
  return PREFIX_TO_REGION[two] ?? null;
}

/** THE RARESKIN ships from Maharashtra — the origin for the CGST/SGST split. */
export const ORIGIN_STATE_CODE = "27";

/**
 * CBIC GST state / UT codes. Drives the checkout state picker and the
 * name → code fallback when a PIN prefix doesn't resolve.
 */
export const GST_STATES: { code: string; name: string }[] = [
  { code: "01", name: "Jammu & Kashmir" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "03", name: "Punjab" },
  { code: "04", name: "Chandigarh" },
  { code: "05", name: "Uttarakhand" },
  { code: "06", name: "Haryana" },
  { code: "07", name: "Delhi" },
  { code: "08", name: "Rajasthan" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "10", name: "Bihar" },
  { code: "11", name: "Sikkim" },
  { code: "12", name: "Arunachal Pradesh" },
  { code: "13", name: "Nagaland" },
  { code: "14", name: "Manipur" },
  { code: "15", name: "Mizoram" },
  { code: "16", name: "Tripura" },
  { code: "17", name: "Meghalaya" },
  { code: "18", name: "Assam" },
  { code: "19", name: "West Bengal" },
  { code: "20", name: "Jharkhand" },
  { code: "21", name: "Odisha" },
  { code: "22", name: "Chhattisgarh" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "24", name: "Gujarat" },
  { code: "26", name: "Dadra & Nagar Haveli and Daman & Diu" },
  { code: "27", name: "Maharashtra" },
  { code: "29", name: "Karnataka" },
  { code: "30", name: "Goa" },
  { code: "31", name: "Lakshadweep" },
  { code: "32", name: "Kerala" },
  { code: "33", name: "Tamil Nadu" },
  { code: "34", name: "Puducherry" },
  { code: "35", name: "Andaman & Nicobar Islands" },
  { code: "36", name: "Telangana" },
  { code: "37", name: "Andhra Pradesh" },
  { code: "38", name: "Ladakh" },
];

/** Loose name → GST code (case-insensitive, ignores punctuation). */
export function stateCodeFromName(name: string): string | null {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
  const target = norm(name);
  if (!target) return null;
  const hit = GST_STATES.find(
    (s) => norm(s.name) === target || norm(s.name).startsWith(target),
  );
  return hit?.code ?? null;
}
