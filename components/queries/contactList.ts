import * as z from "zod";
import {
  AccountId,
  AccountIdSchema,
  DeviceIdSchema,
} from "../cryptography/cryptography";
import { EcpMutation, EcpQuery } from "../store/feApi";
import { getDeviceIdByAccountId } from "./accounts";
import { groupBy, maxBy } from "./helpers";
import { DataItem } from "./Queries";
import { nowTimestamp, Timestamp, TimestampSchema } from "./Timestamp";

export const ContactListUpdateSchema = z.object({
  type: z.literal("ContactListUpdate"),
  accountId: AccountIdSchema,
  createdAt: TimestampSchema,
  name: z.string(),
  deleted: z.boolean(),
  timestamp: TimestampSchema,
  deviceId: DeviceIdSchema,
});

function contactListLatest({
  accountId,
  createdAt,
}: {
  accountId: AccountId;
  createdAt: Timestamp;
}) {
  return (all: Array<DataItem>) => {
    const updates = all
      .filter((item) => item.type === "ContactListUpdate")
      .filter(
        (update) =>
          update.accountId === accountId && update.createdAt === createdAt,
      );
    if (updates.length) {
      const latestUpdate = maxBy(updates, (update) => update.timestamp);
      if (!latestUpdate.deleted) return { createdAt, name: latestUpdate.name };
    }
  };
}

function contactListsForAccount({ accountId }: { accountId: AccountId }) {
  return (all: Array<DataItem>) => {
    return groupBy(
      all
        .filter((item) => item.type === "ContactListUpdate")
        .filter((update) => update.accountId === accountId),
      (update) => [update.accountId, update.createdAt],
      (updates) => maxBy(updates, (update) => update.timestamp),
    )
      .filter((update) => !update.deleted)
      .map((update) => ({ createdAt: update.createdAt, name: update.name }));
  };
}

export const getContactLists: EcpQuery<
  { accountId: AccountId },
  Array<{ createdAt: Timestamp; name: string }>
> =
  ({ accountId }) =>
  async ({ appStorage }) => {
    const current = await appStorage.read();
    const all = current.data;
    return contactListsForAccount({ accountId })(all);
  };

export const getContactList: EcpQuery<
  { accountId: AccountId | undefined; createdAt: Timestamp | undefined },
  { createdAt: Timestamp; name: string } | undefined
> =
  ({ accountId, createdAt }) =>
  async ({ appStorage }) => {
    const current = await appStorage.read();
    const all = current.data;
    return contactListLatest({ accountId: accountId!, createdAt: createdAt! })(
      all,
    );
  };

export const updateContactList: EcpMutation<{
  accountId: AccountId;
  createdAt: Timestamp;
  name: string;
  deleted: boolean;
}> =
  ({ accountId, createdAt, name, deleted }) =>
  async ({ appStorage }) => {
    await appStorage.write((current) => {
      const deviceId = getDeviceIdByAccountId(accountId, current);
      return {
        ...current,
        data: [
          ...current.data,
          {
            type: "ContactListUpdate" as const,
            accountId,
            createdAt,
            name,
            deleted,
            timestamp: nowTimestamp(),
            deviceId,
          },
        ],
      };
    });
  };

export const ContactListMembershipUpdateSchema = z.object({
  type: z.literal("ContactListUpdateMembership"),
  accountId: AccountIdSchema,
  createdAt: TimestampSchema,
  contactId: AccountIdSchema,
  isMember: z.boolean(),
  timestamp: TimestampSchema,
  deviceId: DeviceIdSchema,
});

function contactListMembers({
  accountId,
  createdAt,
}: {
  accountId: AccountId;
  createdAt: Timestamp;
}) {
  return (all: Array<DataItem>) => {
    return groupBy(
      all
        .filter((item) => item.type === "ContactListUpdateMembership")
        .filter(
          (update) =>
            update.accountId === accountId && update.createdAt === createdAt,
        ),
      (update) => [update.contactId],
      (updates) => maxBy(updates, (update) => update.timestamp),
    )
      .filter((update) => update.isMember)
      .map((update) => update.contactId);
  };
}

export const getContactListMembers: EcpQuery<
  { accountId: AccountId | undefined; createdAt: Timestamp | undefined },
  Array<AccountId>
> =
  ({ accountId, createdAt }) =>
  async ({ appStorage }) => {
    if (!accountId || createdAt === undefined) return [];
    const current = await appStorage.read();
    const all = current.data;
    return contactListMembers({ accountId, createdAt })(all);
  };

export const getContactListsForContact: EcpQuery<
  { accountId: AccountId | undefined; contactId: AccountId | undefined },
  Array<{ createdAt: Timestamp; name: string; isMember: boolean }>
> =
  ({ accountId, contactId }) =>
  async ({ appStorage }) => {
    if (!accountId || !contactId) return [];
    const current = await appStorage.read();
    const all = current.data;

    const lists = contactListsForAccount({ accountId })(all);
    const membershipByList = new Map(
      groupBy(
        all
          .filter((item) => item.type === "ContactListUpdateMembership")
          .filter(
            (update) =>
              update.accountId === accountId && update.contactId === contactId,
          ),
        (update) => [update.createdAt],
        (updates) => maxBy(updates, (update) => update.timestamp),
      ).map((update) => [update.createdAt, update.isMember]),
    );

    return lists.map((list) => ({
      ...list,
      isMember: membershipByList.get(list.createdAt) ?? false,
    }));
  };

export const updateContactListMembership: EcpMutation<{
  accountId: AccountId;
  createdAt: Timestamp;
  contactId: AccountId;
  isMember: boolean;
}> =
  ({ accountId, createdAt, contactId, isMember }) =>
  async ({ appStorage }) => {
    await appStorage.write((current) => {
      const deviceId = getDeviceIdByAccountId(accountId, current);
      return {
        ...current,
        data: [
          ...current.data,
          {
            type: "ContactListUpdateMembership" as const,
            accountId,
            createdAt,
            contactId,
            isMember,
            timestamp: nowTimestamp(),
            deviceId,
          },
        ],
      };
    });
  };
