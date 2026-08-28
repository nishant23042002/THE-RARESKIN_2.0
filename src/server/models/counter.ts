import { Schema, model, models, type Model } from "mongoose";

/**
 * Atomic named sequence generator.
 *
 * Used for human-facing serial numbers — order numbers, invoice numbers —
 * where a race between two concurrent orders must never hand out the same
 * value. `findOneAndUpdate` with `$inc` and `upsert` is atomic at the document
 * level, which is all we need.
 */
export interface CounterDoc {
  _id: string; // the sequence name, e.g. "order-2026"
  seq: number;
}

const counterSchema = new Schema<CounterDoc>(
  {
    _id: { type: String, required: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { versionKey: false },
);

export const Counter: Model<CounterDoc> =
  (models.Counter as Model<CounterDoc>) ??
  model<CounterDoc>("Counter", counterSchema);

/** Return the next value in the named sequence, creating it at 1 on first use. */
export async function nextSequence(name: string): Promise<number> {
  const doc = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { returnDocument: "after", upsert: true, setDefaultsOnInsert: true },
  ).lean();
  return doc!.seq;
}
