"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { SignInModal } from "./sign-in-modal";

/**
 * Mounts the sign-in modal at the layout root, driven by `AuthProvider` state.
 * Kept separate from the provider so the provider never imports the modal (and
 * its form, which reads `useAuth`) — no import cycle.
 */
export function SignInModalMount() {
  const { signIn, closeSignIn } = useAuth();
  return (
    <SignInModal
      open={signIn.open}
      next={signIn.next}
      authError={signIn.error}
      onClose={closeSignIn}
    />
  );
}
