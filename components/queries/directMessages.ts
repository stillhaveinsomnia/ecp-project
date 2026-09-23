import * as z from "zod";
import { AccountId, AccountIdSchema } from "../cryptography/cryptography";
import { EcpMutation, EcpQuery } from "../store/feApi";
import { ContentAddress, ContentAddressSchema } from "../store/fileStore";
import { contactList } from "./contacts";
import { groupBy, maxBy, orderBy } from "./helpers";
import { DataItem } from "./Queries";
import { nowTimestamp, Timestamp, TimestampSchema } from "./Timestamp";

export const DirectMessageUpdateSchema = z.object({
  type: z.literal("DirectMessageUpdate"),
  senderId: AccountIdSchema,
  receiverId: AccountIdSchema,
  createdAt: TimestampSchema,
  content: z.string().max(10000, "Message is too long (max 10000 characters)"),
  attachments: z
    .array(z.object({ name: z.string(), hash: ContentAddressSchema }))
    .max(10, "Too many attachments (max 10)"),
  isDraft: z.boolean(),
  timestamp: TimestampSchema,
});

export const updateDirectMessage: EcpQuery<
  {
    senderId: AccountId;
    receiverId: AccountId;
    createdAt: Timestamp;
    isDraft: boolean;
    content: string;
    attachments: Array<{ name: string; hash: ContentAddress }>;
  },
  void
> =
  ({ senderId, receiverId, createdAt, isDraft, content, attachments }) =>
  async ({ store }) => {
    await store.add({
      type: "DirectMessageUpdate",
      senderId,
      receiverId,
      createdAt,
      isDraft,
      content,
      attachments,
      timestamp: nowTimestamp(),
    });
  };

export function directMessagesSummary({ accountId }: { accountId: AccountId }) {
  return (all: Array<DataItem>) => {
    return contactList({ accountId })(all).map((contact) => {
      const messages = directMessagesList({
        accountId,
        contactId: contact.contactId,
      })(all);
      const lastMesssage = orderBy(
        messages,
        (update) => update.createdAt,
        "desc",
      )[0];
      const unread = messages.filter(
        (message) => message.receiverId === accountId && !message.didRead,
      ).length;
      return {
        contactId: contact.contactId,
        contactName: contact.name,
        lastMesssageCreatedAt: lastMesssage?.createdAt,
        unread,
      };
    });
  };
}

export const getDirectMessagesSummary: EcpQuery<
  { accountId: AccountId },
  Array<{
    contactId: AccountId;
    contactName: string;
    lastMesssageCreatedAt: Timestamp | undefined;
    unread: number;
  }>
> =
  ({ accountId }) =>
  async ({ appStorage }) => {
    const current = await appStorage.read();
    const all = current.data;
    return directMessagesSummary({ accountId })(all);
  };

export function directMessagesList({
  accountId,
  contactId,
}: {
  accountId: AccountId;
  contactId: AccountId;
}) {
  return (all: Array<DataItem>) => {
    return orderBy(
      groupBy(
        all
          .filter((item) => item.type === "DirectMessageUpdate")
          .filter(
            (update) =>
              (update.senderId === accountId &&
                update.receiverId === contactId) ||
              (update.senderId === contactId &&
                update.receiverId === accountId),
          ),
        (update) => [update.senderId, update.receiverId, update.createdAt],
        (updates) => ({
          ...maxBy(updates, (update) => update.timestamp),
          isModified: updates.length > 1,
        }),
      ).filter(
        (update) => update.content !== "" || update.attachments.length > 0,
      ),
      (update) => update.createdAt,
      "asc",
    ).map((messageUpdate) => {
      return {
        senderId: messageUpdate.senderId,
        receiverId: messageUpdate.receiverId,
        createdAt: messageUpdate.createdAt,
        isDraft: messageUpdate.isDraft,
        content: messageUpdate.content,
        attachments: messageUpdate.attachments,
        isModified: messageUpdate.isModified,
        didRead: didReadLatest({
          senderId: messageUpdate.senderId,
          receiverId: messageUpdate.receiverId,
          createdAt: messageUpdate.createdAt,
        })(all),
      };
    });
  };
}

export const getDirectMessages: EcpQuery<
  { accountId: AccountId; contactId: AccountId },
  Array<{
    senderId: AccountId;
    receiverId: AccountId;
    createdAt: Timestamp;
    isDraft: boolean;
    content: string;
    attachments: Array<{ name: string; hash: ContentAddress }>;
    isModified: boolean;
    didRead: boolean;
  }>
> =
  ({ accountId, contactId }) =>
  async ({ appStorage }) => {
    const current = await appStorage.read();
    const all = current.data;
    return directMessagesList({ accountId, contactId })(all);
  };

export const getDirectMessageHistory: EcpQuery<
  { senderId: AccountId; receiverId: AccountId; createdAt: Timestamp },
  Array<{
    content: string;
    attachments: Array<{ name: string; hash: ContentAddress }>;
    isDraft: boolean;
    timestamp: Timestamp;
  }>
> =
  ({ senderId, receiverId, createdAt }) =>
  async ({ appStorage }) => {
    const current = await appStorage.read();
    const all = current.data;
    return orderBy(
      all
        .filter((item) => item.type === "DirectMessageUpdate")
        .filter(
          (update) =>
            update.senderId === senderId &&
            update.receiverId === receiverId &&
            update.createdAt === createdAt,
        ),
      (update) => update.timestamp,
      "asc",
    ).map((update) => ({
      content: update.content,
      attachments: update.attachments,
      isDraft: update.isDraft,
      timestamp: update.timestamp,
    }));
  };

export const DidReadDirectMessageUpdateSchema = z.object({
  type: z.literal("DidReadDirectMessageUpdate"),
  senderId: z.string(),
  receiverId: z.string(),
  createdAt: TimestampSchema,
  didRead: z.boolean(),
  timestamp: TimestampSchema,
});

export const updateDidReadDirectMessage: EcpMutation<{
  senderId: AccountId;
  receiverId: AccountId;
  createdAt: Timestamp;
  didRead: boolean;
}> =
  ({ senderId, receiverId, createdAt, didRead }) =>
  async ({ appStorage }) => {
    await appStorage.write((current) => {
      return {
        ...current,
        data: [
          ...current.data,
          {
            type: "DidReadDirectMessageUpdate",
            senderId,
            receiverId,
            createdAt,
            didRead,
            timestamp: nowTimestamp(),
          },
        ],
      };
    });
  };

function didReadLatest({
  senderId,
  receiverId,
  createdAt,
}: {
  senderId: string;
  receiverId: string;
  createdAt: number;
}) {
  return (all: Array<DataItem>) => {
    const updates = all
      .filter((item) => item.type === "DidReadDirectMessageUpdate")
      .filter(
        (update) =>
          update.senderId === senderId &&
          update.receiverId === receiverId &&
          update.createdAt === createdAt,
      );
    if (updates.length) {
      const latestUpdate = maxBy(updates, (update) => update.timestamp);
      return latestUpdate.didRead;
    }
    return false;
  };
}
