import { AccountIdSchema } from "../../components/cryptography/cryptography";
import {
  MessageAttachmentSchema,
  MessageReactionUpdateSchema,
  messageReactions,
  QuotedTextSchema,
} from "../../components/queries/messageFeatures";
import { getGroupMessages } from "../../components/queries/groupMessages";
import { DataItemSchema } from "../../components/queries/Queries";
import { shouldSend } from "../../components/queries/shouldSend";

const directTarget = {
  type: "direct" as const,
  senderId: AccountIdSchema.parse("sender"),
  receiverId: AccountIdSchema.parse("receiver"),
  createdAt: 10,
};

test("reactions project latest per-actor state and aggregate by emoji", () => {
  const events = [
    { actorId: "alice", emoji: "👍", active: true, timestamp: 1 },
    { actorId: "bob", emoji: "👍", active: true, timestamp: 2 },
    { actorId: "alice", emoji: "👍", active: false, timestamp: 3 },
    { actorId: "alice", emoji: "❤️", active: true, timestamp: 4 },
  ].map((event) =>
    MessageReactionUpdateSchema.parse({
      type: "MessageReactionUpdate",
      target: directTarget,
      ...event,
    }),
  );

  expect(messageReactions(directTarget)(events)).toEqual([
    { emoji: "❤️", actorIds: ["alice"] },
    { emoji: "👍", actorIds: ["bob"] },
  ]);
});

test("attachment schema accepts legacy file refs and validates locations and size", () => {
  expect(
    MessageAttachmentSchema.safeParse({ name: "photo.jpg", hash: "abc" })
      .success,
  ).toBe(true);
  expect(
    MessageAttachmentSchema.safeParse({
      name: "Location",
      hash: "location-hash",
      type: "static-location",
      location: { latitude: 51.5, longitude: -0.1 },
    }).success,
  ).toBe(true);
  expect(
    MessageAttachmentSchema.safeParse({
      name: "Location",
      hash: "location-hash",
      type: "static-location",
    }).success,
  ).toBe(false);
  expect(
    MessageAttachmentSchema.safeParse({
      name: "Huge file",
      hash: "large-hash",
      sizeBytes: 50 * 1024 * 1024 + 1,
    }).success,
  ).toBe(false);
});

test("quoted text range must have positive length", () => {
  expect(
    QuotedTextSchema.safeParse({ text: "quoted", start: 2, end: 4 }).success,
  ).toBe(true);
  expect(
    QuotedTextSchema.safeParse({ text: "quoted", start: 4, end: 4 }).success,
  ).toBe(false);
});

test("direct reaction events route only between the message participants", () => {
  const senderId = AccountIdSchema.parse("sender");
  const receiverId = AccountIdSchema.parse("receiver");
  const outsiderId = AccountIdSchema.parse("outsider");
  const reaction = MessageReactionUpdateSchema.parse({
    type: "MessageReactionUpdate",
    actorId: receiverId,
    target: directTarget,
    emoji: "👍",
    active: true,
    timestamp: 11,
  });

  expect(
    shouldSend({
      thisAccountId: senderId,
      otherAccountId: receiverId,
      storeItem: reaction,
    }),
  ).toBe(true);
  expect(
    shouldSend({
      thisAccountId: senderId,
      otherAccountId: outsiderId,
      storeItem: reaction,
    }),
  ).toBe(false);
});

test("group messages with attachments remain visible without text", async () => {
  const accountId = AccountIdSchema.parse("reader");
  const groupId = "group-1";
  const message = DataItemSchema.parse({
    type: "GroupMessageUpdate",
    senderId: AccountIdSchema.parse("sender"),
    groupId,
    createdAt: 10,
    content: "",
    attachments: [{ name: "file.txt", hash: "file-hash", type: "file" }],
    timestamp: 11,
  });
  const result = await getGroupMessages({ accountId, groupId })({
    appStorage: { read: async () => ({ data: [message] }) },
  } as never);

  expect(result).toHaveLength(1);
  expect(result[0]?.attachments[0]?.name).toBe("file.txt");
});
