import * as z from "zod";

export const TimestampSchema = z.number().brand("Timestamp");

/** milliseconds epoch for now */
export type Timestamp = z.infer<typeof TimestampSchema>;

export function nowTimestamp(): Timestamp {
  return TimestampSchema.parse(Date.now());
}
