import "server-only";

import { dbConnect } from "@/server/db";
import {
  ContactMessage,
  User,
  type ContactMessageDoc,
  type UserDoc,
} from "@/server/models";
import { maskPhone } from "@/lib/auth";

/**
 * Customer-enquiry reads for `/admin/messages`. Not cached.
 */

export interface AdminMessageRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  topic: string | null;
  status: "new" | "handled";
  account: { id: string; phone: string } | null;
  handledBy: string | null;
  handledAt: string | null;
  note: string;
  createdAt: string;
}

export interface AdminMessageList {
  rows: AdminMessageRow[];
  total: number;
  page: number;
  pages: number;
  counts: { new: number; handled: number };
}

export async function listContactMessages(params: {
  status?: "new" | "handled" | "all";
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<AdminMessageList> {
  await dbConnect();
  const pageSize = Math.min(Math.max(params.pageSize ?? 25, 1), 100);
  const page = Math.max(params.page ?? 1, 1);

  const filter: Record<string, unknown> = {};
  if (params.status && params.status !== "all") filter.status = params.status;
  const q = params.q?.trim();
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: rx }, { email: rx }, { message: rx }];
  }

  const [total, docs, newCount, handledCount] = await Promise.all([
    ContactMessage.countDocuments(filter),
    ContactMessage.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean<ContactMessageDoc[]>(),
    ContactMessage.countDocuments({ status: "new" }),
    ContactMessage.countDocuments({ status: "handled" }),
  ]);

  const staffIds = [
    ...new Set(docs.map((d) => d.handledBy).filter(Boolean).map(String)),
  ];
  const userIds = [
    ...new Set(docs.map((d) => d.userId).filter(Boolean).map(String)),
  ];
  const [staff, accounts] = await Promise.all([
    User.find({ _id: { $in: staffIds } })
      .select("name")
      .lean<Pick<UserDoc, "_id" | "name">[]>(),
    User.find({ _id: { $in: userIds } })
      .select("phone")
      .lean<Pick<UserDoc, "_id" | "phone">[]>(),
  ]);
  const staffName = new Map(staff.map((s) => [String(s._id), s.name]));
  const acctPhone = new Map(accounts.map((a) => [String(a._id), a.phone]));

  return {
    rows: docs.map((d) => ({
      id: String(d._id),
      name: d.name,
      email: d.email,
      phone: d.phone,
      message: d.message,
      topic: d.topic,
      status: d.status,
      account: d.userId
        ? {
            id: String(d.userId),
            phone: acctPhone.has(String(d.userId))
              ? maskPhone(acctPhone.get(String(d.userId))!)
              : "—",
          }
        : null,
      handledBy: d.handledBy ? (staffName.get(String(d.handledBy)) ?? "—") : null,
      handledAt: d.handledAt ? d.handledAt.toISOString() : null,
      note: d.note,
      createdAt: d.createdAt.toISOString(),
    })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / pageSize)),
    counts: { new: newCount, handled: handledCount },
  };
}
