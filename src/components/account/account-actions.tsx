"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useAuth } from "@/components/providers/auth-provider";

export function AccountActions() {
  const router = useRouter();
  const { signOut, refresh } = useAuth();
  const [busy, setBusy] = useState<null | "one" | "all">(null);

  async function out() {
    setBusy("one");
    await signOut();
    router.replace("/");
  }

  async function outEverywhere() {
    setBusy("all");
    try {
      await fetch("/api/auth/sessions/revoke-all", { method: "POST" });
    } finally {
      await refresh();
      router.replace("/");
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Button
        onClick={out}
        variant="ghost"
        size="sm"
        className="!px-4"
      >
        <Icon name="logout" className="size-[15px]" />
        {busy === "one" ? "Signing out…" : "Sign out"}
      </Button>
      <Button
        onClick={outEverywhere}
        variant="ghost"
        size="sm"
        className="!px-4"
      >
        {busy === "all" ? "Working…" : "Sign out of all devices"}
      </Button>
    </div>
  );
}
