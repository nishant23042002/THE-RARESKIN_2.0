/**
 * Admin notification contracts. A notification is created server-side by
 * `@/server/notifications`; the only thing the client sends back is a
 * "mark these read" request.
 */
import { z } from "zod";

import { objectIdString } from "./primitives";

export const NOTIFICATION_CATEGORIES = [
  "orders",
  "payments",
  "reviews",
  "customers",
  "inventory",
  "system",
] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export const NOTIFICATION_SEVERITIES = [
  "info",
  "success",
  "attention",
  "critical",
] as const;
export type NotificationSeverity = (typeof NOTIFICATION_SEVERITIES)[number];

/** `POST /api/admin/notifications/read` — mark a set read for the caller. */
export const notificationReadInput = z
  .object({
    ids: z.array(objectIdString).max(200).optional(),
    all: z.boolean().optional(),
    category: z.enum(NOTIFICATION_CATEGORIES).optional(),
  })
  .refine((v) => v.all || (v.ids && v.ids.length > 0), {
    message: "Pass `ids` or `all: true`",
  });
export type NotificationReadInput = z.infer<typeof notificationReadInput>;
