import * as z from "zod";
import { AccountId, AccountIdSchema } from "../cryptography/cryptography";
import { EcpMutation, EcpQuery } from "../store/feApi";
import { nowTimestamp, Timestamp, TimestampSchema } from "./Timestamp";
import { contactList } from "./contacts";
import { groupBy, maxBy } from "./helpers";

export const ArticleUpdateSchema = z.object({
  type: z.literal("ArticleUpdate"),
  accountId: AccountIdSchema,
  createdAt: TimestampSchema,
  date: z
    .object({ timestamp: TimestampSchema, duration: z.number() })
    .optional(),
  content: z.string(),
  timestamp: TimestampSchema,
});

export const updateArticle: EcpMutation<{
  accountId: AccountId;
  createdAt: Timestamp;
  date: { timestamp: Timestamp; duration: number } | undefined;
  content: string;
}> =
  ({ accountId, createdAt, date, content }) =>
  async ({ appStorage }) => {
    await appStorage.write((current) => {
      return {
        ...current,
        data: [
          ...current.data,
          {
            type: "ArticleUpdate",
            accountId,
            createdAt,
            date,
            content,
            timestamp: nowTimestamp(),
          },
        ],
      };
    });
  };

export const getArticle: EcpQuery<
  { accountId: AccountId; createdAt: Timestamp | undefined },
  | {
      date: { timestamp: Timestamp; duration: number } | undefined;
      content: string;
    }
  | undefined
> =
  ({ accountId, createdAt }) =>
  async ({ appStorage }) => {
    const current = await appStorage.read();
    const all = current.data;
    const updates = all
      .filter((item) => item.type === "ArticleUpdate")
      .filter(
        (update) =>
          update.accountId === accountId && update.createdAt === createdAt,
      );
    if (updates.length) {
      const latestUpdate = maxBy(updates, (update) => update.timestamp);
      return { date: latestUpdate.date, content: latestUpdate.content };
    }
  };

export const getArticles: EcpQuery<
  { accountId: AccountId },
  Array<{
    contactId: AccountId;
    contactName: string;
    createdAt: Timestamp;
    date: { timestamp: Timestamp; duration: number } | undefined;
    content: string;
  }>
> =
  ({ accountId }) =>
  async ({ appStorage }) => {
    const current = await appStorage.read();
    const all = current.data;
    return contactList({ accountId })(all).flatMap((contact) => {
      return groupBy(
        all
          .filter((item) => item.type === "ArticleUpdate")
          .filter((update) => update.accountId === contact.contactId),
        (update) => [update.accountId, update.createdAt],
        (updates) => maxBy(updates, (update) => update.timestamp),
      )
        .filter((update) => update.content !== "")
        .map((update) => ({
          contactId: contact.contactId,
          contactName: contact.name,
          createdAt: update.createdAt,
          date: update.date,
          content: update.content,
        }));
    });
  };
