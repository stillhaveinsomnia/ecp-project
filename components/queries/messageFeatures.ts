import * as z from "zod";
import { AccountId, AccountIdSchema } from "../cryptography/cryptography";
import { EcpQuery } from "../store/feApi";
import { ContentAddressSchema } from "../store/fileStore";
import { nowTimestamp, Timestamp, TimestampSchema } from "./Timestamp";

export const MessageReferenceSchema = z.object({
  senderId: AccountIdSchema,
  createdAt: TimestampSchema,
});

export const QuotedTextSchema = z
  .object({
    text: z.string().max(10000),
    start: z.number().int().nonnegative(),
    end: z.number().int().positive(),
  })
  .refine(({ start, end }) => end > start, "Quote end must follow its start");

export const MessageMetadataSchema = z.object({
  replyTo: z.array(MessageReferenceSchema).max(20).optional(),
  quotedText: QuotedTextSchema.optional(),
  forwardedFrom: MessageReferenceSchema.optional(),
});

export const MessageAttachmentSchema = z
  .object({
    name: z.string().max(255),
    hash: ContentAddressSchema,
    type: z
      .enum([
        "contact",
        "link",
        "file",
        "image",
        "video",
        "audio",
        "static-location",
        "live-location",
        "camera-image",
        "camera-video",
        "audio-recording",
      ])
      .optional(),
    mimeType: z.string().max(255).optional(),
    sizeBytes: z
      .number()
      .int()
      .nonnegative()
      .max(50 * 1024 * 1024)
      .optional(),
    location: z
      .object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        label: z.string().max(300).optional(),
        updatedAt: TimestampSchema.optional(),
      })
      .optional(),
  })
  .superRefine((attachment, context) => {
    if (
      (attachment.type === "static-location" ||
        attachment.type === "live-location") &&
      !attachment.location
    ) {
      context.addIssue({
        code: "custom",
        message: "Location attachments require coordinates",
        path: ["location"],
      });
    }
  });

export const MessageReactionUpdateSchema = z.object({
  type: z.literal("MessageReactionUpdate"),
  actorId: AccountIdSchema,
  target: z.discriminatedUnion("type", [
    z.object({
      type: z.literal("direct"),
      senderId: AccountIdSchema,
      receiverId: AccountIdSchema,
      createdAt: TimestampSchema,
    }),
    z.object({
      type: z.literal("group"),
      groupId: z.string(),
      senderId: AccountIdSchema,
      createdAt: TimestampSchema,
    }),
  ]),
  emoji: z.string().min(1).max(32),
  active: z.boolean(),
  timestamp: TimestampSchema,
});

export type MessageReference = z.infer<typeof MessageReferenceSchema>;
export type MessageAttachment = z.infer<typeof MessageAttachmentSchema>;
export type MessageReactionTarget = z.infer<
  typeof MessageReactionUpdateSchema
>["target"];

export const updateMessageReaction: EcpQuery<
  {
    actorId: AccountId;
    target: MessageReactionTarget;
    emoji: string;
    active: boolean;
  },
  void
> =
  ({ actorId, target, emoji, active }) =>
  async ({ store }) => {
    const update = MessageReactionUpdateSchema.parse({
      type: "MessageReactionUpdate",
      actorId,
      target,
      emoji,
      active,
      timestamp: nowTimestamp(),
    });
    await store.add(update);
  };

export function messageReactions(target: MessageReactionTarget) {
  return (all: unknown[]) => {
    const relevant = all.flatMap((item) => {
      const parsed = MessageReactionUpdateSchema.safeParse(item);
      return parsed.success && sameReactionTarget(parsed.data.target, target)
        ? [parsed.data]
        : [];
    });
    const latestByActorAndEmoji = new Map<string, (typeof relevant)[number]>();

    for (const update of relevant) {
      const key = `${update.actorId}\u0000${update.emoji}`;
      const previous = latestByActorAndEmoji.get(key);
      if (!previous || update.timestamp > previous.timestamp) {
        latestByActorAndEmoji.set(key, update);
      }
    }

    const byEmoji = new Map<string, AccountId[]>();
    for (const update of latestByActorAndEmoji.values()) {
      if (!update.active) continue;
      const actors = byEmoji.get(update.emoji) ?? [];
      actors.push(update.actorId);
      byEmoji.set(update.emoji, actors);
    }

    return [...byEmoji]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([emoji, actorIds]) => ({ emoji, actorIds: actorIds.sort() }));
  };
}

function sameReactionTarget(
  left: MessageReactionTarget,
  right: MessageReactionTarget,
): boolean {
  if (left.type !== right.type || left.createdAt !== right.createdAt) {
    return false;
  }
  if (left.type === "direct" && right.type === "direct") {
    return (
      left.senderId === right.senderId && left.receiverId === right.receiverId
    );
  }
  return (
    left.type === "group" &&
    right.type === "group" &&
    left.groupId === right.groupId &&
    left.senderId === right.senderId
  );
}

export function directReactionTarget(
  senderId: AccountId,
  receiverId: AccountId,
  createdAt: Timestamp,
): MessageReactionTarget {
  return { type: "direct", senderId, receiverId, createdAt };
}

export function groupReactionTarget(
  groupId: string,
  senderId: AccountId,
  createdAt: Timestamp,
): MessageReactionTarget {
  return { type: "group", groupId, senderId, createdAt };
}
