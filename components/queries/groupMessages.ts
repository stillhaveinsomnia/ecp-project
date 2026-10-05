import * as z from "zod";
import { AccountId, AccountIdSchema } from "../cryptography/cryptography";
import { EcpQuery } from "../store/feApi";
import { DataItem } from "./Queries";
import { nowTimestamp, Timestamp, TimestampSchema } from "./Timestamp";
import { contactLatest } from "./contacts";
import { groupList } from "./groups";
import { groupBy, maxBy, orderBy } from "./helpers";
import {
  groupReactionTarget,
  MessageAttachment,
  MessageAttachmentSchema,
  MessageMetadataSchema,
  messageReactions,
} from "./messageFeatures";

export const GroupMessageUpdateSchema = z.object({
  type: z.literal("GroupMessageUpdate"),
  senderId: AccountIdSchema,
  groupId: z.string(), // TODO use branded type
  createdAt: TimestampSchema,
  content: z.string().max(10000, "Message is too long (max 10000 characters)"),
  attachments: z.array(MessageAttachmentSchema).max(10).default([]),
  ...MessageMetadataSchema.shape,
  timestamp: TimestampSchema,
});

export const updateGroupMessage: EcpQuery<
  {
    senderId: AccountId;
    groupId: string;
    createdAt: Timestamp;
    content: string;
    attachments?: MessageAttachment[];
    replyTo?: Array<{ senderId: AccountId; createdAt: Timestamp }>;
    quotedText?: { text: string; start: number; end: number };
    forwardedFrom?: { senderId: AccountId; createdAt: Timestamp };
  },
  void
> =
  ({
    senderId,
    groupId,
    createdAt,
    content,
    attachments = [],
    replyTo,
    quotedText,
    forwardedFrom,
  }) =>
  async ({ appStorage }) => {
    await appStorage.write((current) => {
      return {
        ...current,
        data: [
          ...current.data,
          {
            type: "GroupMessageUpdate",
            senderId,
            groupId,
            createdAt,
            content,
            attachments,
            replyTo,
            quotedText,
            forwardedFrom,
            timestamp: nowTimestamp(),
          },
        ],
      };
    });
  };

export const getGroupMessagesSummary: EcpQuery<
  { accountId: AccountId },
  Array<{
    groupId: string;
    groupName: string;
    lastMessageCreatedAt: Timestamp | undefined;
  }>
> =
  ({ accountId }) =>
  async ({ appStorage }) => {
    const current = await appStorage.read();
    const all = current.data;
    return orderBy(
      groupList({ accountId })(all).map((group) => {
        const lastMessage = orderBy(
          commonGroupMessagesList({ groupId: group.groupId })(all),
          (update) => update.createdAt,
          "desc",
        )[0];
        return {
          groupId: group.groupId,
          groupName: group.name,
          lastMessageCreatedAt: lastMessage?.createdAt,
        };
      }),
      (update) => update.lastMessageCreatedAt ?? 0,
      "desc",
    );
  };

function commonGroupMessagesList({ groupId }: { groupId: string }) {
  return (all: Array<DataItem>) => {
    return groupBy(
      all
        .filter((item) => item.type === "GroupMessageUpdate")
        .filter((update) => update.groupId === groupId),
      (update) => [update.senderId, update.groupId, update.createdAt],
      (updates) => maxBy(updates, (update) => update.timestamp),
    ).filter(
      (update) => update.content !== "" || update.attachments.length > 0,
    );
  };
}

export const getGroupMessages: EcpQuery<
  { accountId: AccountId; groupId: string },
  Array<{
    senderId: AccountId;
    senderName: string | undefined;
    createdAt: Timestamp;
    content: string;
    attachments: MessageAttachment[];
    replyTo?: Array<{ senderId: AccountId; createdAt: Timestamp }>;
    quotedText?: { text: string; start: number; end: number };
    forwardedFrom?: { senderId: AccountId; createdAt: Timestamp };
    reactions: Array<{ emoji: string; actorIds: AccountId[] }>;
  }>
> =
  ({ accountId, groupId }) =>
  async ({ appStorage }) => {
    const current = await appStorage.read();
    const all = current.data;
    return orderBy(
      commonGroupMessagesList({ groupId })(all),
      (update) => update.createdAt,
      "asc",
    ).map((update) => {
      const contactUpdate = contactLatest({
        accountId,
        contactId: update.senderId,
      })(all);
      return {
        senderId: update.senderId,
        senderName: contactUpdate?.name,
        createdAt: update.createdAt,
        content: update.content,
        attachments: update.attachments,
        replyTo: update.replyTo,
        quotedText: update.quotedText,
        forwardedFrom: update.forwardedFrom,
        reactions: messageReactions(
          groupReactionTarget(
            update.groupId,
            update.senderId,
            update.createdAt,
          ),
        )(all),
      };
    });
  };
