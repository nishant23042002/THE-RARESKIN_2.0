"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { AvatarUploader } from "./image-uploader";

/**
 * The `/account` profile-photo control. Persists to `/api/account/profile`,
 * which also busts the `reviews` cache tag so the photo shows on this
 * customer's existing reviews.
 */
export function ProfilePhoto({
  initial,
  name,
}: {
  initial: string | null;
  name: string;
}) {
  const router = useRouter();
  const [url, setUrl] = useState(initial);

  async function save(next: string | null) {
    setUrl(next);
    await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ avatarUrl: next }),
    }).catch(() => {});
    router.refresh();
  }

  return <AvatarUploader value={url} name={name} onChange={save} />;
}
