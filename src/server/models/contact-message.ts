import { Schema, model, models, type Model, type Types } from "mongoose";

/**
 * A customer enquiry from the storefront `/contact` form. Persisted so staff can
 * actually work it (`/admin/messages`) rather than the old fire-and-forget stub.
 * A `notification` (`customer.message`) is raised alongside each new row.
 */
export interface ContactMessageDoc {
  _id: Types.ObjectId;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  topic: string | null;
  /** set when the sender is a signed-in account */
  userId: Types.ObjectId | null;
  status: "new" | "handled";
  handledBy: Types.ObjectId | null;
  handledAt: Date | null;
  note: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const contactMessageSchema = new Schema<ContactMessageDoc>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, default: null },
    message: { type: String, required: true },
    topic: { type: String, default: null },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    status: { type: String, enum: ["new", "handled"], default: "new" },
    handledBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    handledAt: { type: Date, default: null },
    note: { type: String, default: "" },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
  },
  { timestamps: true },
);

contactMessageSchema.index(
  { status: 1, createdAt: -1 },
  { name: "status_created" },
);
contactMessageSchema.index(
  { email: 1, createdAt: -1 },
  { name: "email_created" },
);

export const ContactMessage: Model<ContactMessageDoc> =
  (models.ContactMessage as Model<ContactMessageDoc>) ??
  model<ContactMessageDoc>("ContactMessage", contactMessageSchema);
