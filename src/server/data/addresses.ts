import "server-only";

import { dbConnect } from "@/server/db";
import { User, type UserDoc } from "@/server/models";
import { resolvePincode, stateCodeFromName } from "@/lib/pincode";
import { address as addressSchema } from "@/lib/validation/user";
import type { AddressInput } from "@/lib/validation/user";

/**
 * The account address book. Addresses live as a subdocument array on the user;
 * these helpers keep the "exactly one default" invariant and are shared by the
 * account UI and the checkout form.
 */

export interface AddressView {
  id: string;
  label: string | null;
  name: string;
  phone: string;
  email: string | null;
  line1: string;
  line2: string | null;
  landmark: string | null;
  city: string;
  state: string;
  stateCode: string | null;
  pincode: string;
  isDefault: boolean;
}

function toView(a: UserDoc["addresses"][number]): AddressView {
  return {
    id: String(a._id),
    label: a.label ?? null,
    name: a.name,
    phone: a.phone,
    email: a.email ?? null,
    line1: a.line1,
    line2: a.line2 ?? null,
    landmark: a.landmark ?? null,
    city: a.city,
    state: a.state,
    stateCode:
      resolvePincode(a.pincode)?.stateCode ?? stateCodeFromName(a.state),
    pincode: a.pincode,
    isDefault: a.isDefault,
  };
}

export async function listAddresses(userId: string): Promise<AddressView[]> {
  await dbConnect();
  const user = await User.findById(userId).select("addresses").lean<
    Pick<UserDoc, "addresses"> | null
  >();
  if (!user) return [];
  return [...user.addresses]
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
    .map(toView);
}

export async function addAddress(
  userId: string,
  input: AddressInput,
): Promise<AddressView> {
  await dbConnect();
  const parsed = addressSchema.parse(input);
  const user = await User.findById(userId);
  if (!user) throw new Error("account not found");

  const makeDefault = user.addresses.length === 0 || parsed.isDefault;
  if (makeDefault) user.addresses.forEach((a) => (a.isDefault = false));
  user.addresses.push({
    ...parsed,
    isDefault: makeDefault,
  } as UserDoc["addresses"][number]);
  await user.save();
  return toView(user.addresses[user.addresses.length - 1]!);
}

export async function updateAddress(
  userId: string,
  addressId: string,
  patch: Partial<AddressInput>,
): Promise<AddressView | null> {
  await dbConnect();
  const user = await User.findById(userId);
  if (!user) return null;
  const addr = user.addresses.find((a) => String(a._id) === addressId);
  if (!addr) return null;

  const merged = addressSchema.parse({
    label: addr.label,
    name: addr.name,
    phone: addr.phone,
    email: addr.email,
    line1: addr.line1,
    line2: addr.line2,
    landmark: addr.landmark,
    city: addr.city,
    state: addr.state,
    pincode: addr.pincode,
    isDefault: addr.isDefault,
    ...patch,
  });

  Object.assign(addr, merged);
  if (merged.isDefault) {
    user.addresses.forEach((a) => {
      if (String(a._id) !== addressId) a.isDefault = false;
    });
  }
  // never leave zero defaults
  if (!user.addresses.some((a) => a.isDefault) && user.addresses[0]) {
    user.addresses[0].isDefault = true;
  }
  await user.save();
  return toView(addr);
}

export async function deleteAddress(
  userId: string,
  addressId: string,
): Promise<boolean> {
  await dbConnect();
  const user = await User.findById(userId);
  if (!user) return false;
  const before = user.addresses.length;
  const wasDefault = user.addresses.find(
    (a) => String(a._id) === addressId,
  )?.isDefault;
  user.addresses = user.addresses.filter(
    (a) => String(a._id) !== addressId,
  ) as UserDoc["addresses"];
  if (user.addresses.length === before) return false;
  if (wasDefault && user.addresses[0]) user.addresses[0].isDefault = true;
  await user.save();
  return true;
}
