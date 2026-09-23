import * as z from "zod";
import { AccountId, AccountIdSchema } from "../cryptography/cryptography";
import { EcpMutation, EcpQuery } from "../store/feApi";
import { DataItem } from "./Queries";
import { nowTimestamp, TimestampSchema } from "./Timestamp";
import { groupBy, maxBy } from "./helpers";

export const GroupUpdateSchema = z.object({
  type: z.literal("GroupUpdate"),
  accountId: AccountIdSchema,
  groupId: z.string(), // TODO use branded type
  name: z.string(),
  deleted: z.boolean(),
  timestamp: TimestampSchema,
});

export const updateGroup: EcpMutation<{
  accountId: AccountId;
  groupId: string; // TODO use branded type
  name: string;
  deleted: boolean;
}> =
  ({ accountId, groupId, name, deleted }) =>
  async ({ appStorage }) => {
    await appStorage.write((current) => {
      return {
        ...current,
        data: [
          ...current.data,
          {
            type: "GroupUpdate",
            accountId,
            groupId,
            name,
            deleted,
            timestamp: nowTimestamp(),
          },
        ],
      };
    });
  };

export function groupList({ accountId }: { accountId: AccountId }) {
  return (all: Array<DataItem>) => {
    return groupBy(
      all
        .filter((item) => item.type === "GroupUpdate")
        .filter((update) => update.accountId === accountId),
      (update) => [update.groupId],
      (updates) => maxBy(updates, (update) => update.timestamp),
    )
      .filter((update) => !update.deleted)
      .map((update) => ({ groupId: update.groupId, name: update.name }));
  };
}

export const getGroup: EcpQuery<
  { accountId: AccountId; groupId: string },
  { name: string } | undefined
> =
  ({ accountId, groupId }) =>
  async ({ appStorage }) => {
    const current = await appStorage.read();
    const all = current.data;
    const updates = all
      .filter((item) => item.type === "GroupUpdate")
      .filter(
        (update) =>
          update.accountId === accountId && update.groupId === groupId,
      );
    if (updates.length) {
      const latestUpdate = maxBy(updates, (update) => update.timestamp);
      return { name: latestUpdate.name };
    }
  };
