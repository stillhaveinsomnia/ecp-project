import * as z from "zod";
import {
  AccountId,
  AccountIdSchema,
  DeviceId,
  DeviceIdSchema,
} from "../cryptography/cryptography";
import { EcpMutation, EcpQuery } from "../store/feApi";
import { getDeviceIdByAccountId } from "./accounts";
import { groupBy, maxBy } from "./helpers";
import { DataItem } from "./Queries";
import { nowTimestamp, TimestampSchema } from "./Timestamp";

// TODO double signature/encryption, with account secret and device secret

export const ContactUpdateSchema = z.object({
  type: z.literal("ContactUpdate"),
  accountId: AccountIdSchema,
  contactId: AccountIdSchema,
  name: z.string(),
  deleted: z.boolean(),
  timestamp: TimestampSchema,
  deviceId: DeviceIdSchema,
});

export const updateContact: EcpMutation<{
  accountId: AccountId;
  contactId: AccountId;
  name: string;
  deleted: boolean;
}> =
  ({ accountId, contactId, name, deleted }) =>
  async ({ appStorage }) => {
    await appStorage.write((current) => {
      const deviceId = getDeviceIdByAccountId(accountId, current);
      return {
        ...current,
        data: [
          ...current.data,
          {
            type: "ContactUpdate",
            accountId,
            contactId,
            name,
            deleted,
            timestamp: nowTimestamp(),
            deviceId,
          },
        ],
      };
    });
  };

export function contactList({ accountId }: { accountId: AccountId }) {
  return (all: Array<DataItem>) => {
    return groupBy(
      all
        .filter((item) => item.type === "ContactUpdate")
        .filter((update) => update.accountId === accountId),
      (update) => [update.contactId],
      (updates) => maxBy(updates, (update) => update.timestamp),
    )
      .filter((update) => !update.deleted)
      .map((update) => ({ contactId: update.contactId, name: update.name }));
  };
}

export const getContacts: EcpQuery<
  { accountId: AccountId | undefined },
  Array<{ contactId: AccountId; name: string }>
> =
  ({ accountId }) =>
  async ({ appStorage }) => {
    if (!accountId) return [];
    const current = await appStorage.read();
    const all = current.data;
    return contactList({ accountId })(all);
  };

export function contactLatest({
  accountId,
  contactId,
}: {
  accountId: AccountId;
  contactId: AccountId;
}) {
  return (all: Array<DataItem>) => {
    const updates = all
      .filter((item) => item.type === "ContactUpdate")
      .filter(
        (update) =>
          update.accountId === accountId && update.contactId === contactId,
      );
    if (updates.length) {
      const latestUpdate = maxBy(updates, (update) => update.timestamp);
      if (!latestUpdate.deleted) return { name: latestUpdate.name };
    }
  };
}

export const getContactChangesHistory: EcpQuery<
  { accountId: AccountId | undefined; contactId: AccountId | undefined },
  Array<{
    name: string;
    deleted: boolean;
    timestamp: number;
    deviceId: DeviceId;
  }>
> =
  ({ accountId, contactId }) =>
  async ({ appStorage }) => {
    const current = await appStorage.read();
    const all = current.data;
    return all
      .filter((item) => item.type === "ContactUpdate")
      .filter(
        (update) =>
          update.accountId === accountId && update.contactId === contactId,
      )
      .sort((a, b) => b.timestamp - a.timestamp)
      .map((update) => ({
        name: update.name,
        deleted: update.deleted,
        timestamp: update.timestamp,
        deviceId: update.deviceId,
      }));
  };

export const getContact: EcpQuery<
  { accountId: AccountId | undefined; contactId: AccountId | undefined },
  { name: string } | undefined
> =
  ({ accountId, contactId }) =>
  async ({ appStorage }) => {
    const current = await appStorage.read();
    const all = current.data;
    return contactLatest({ accountId: accountId!, contactId: contactId! })(all);
  };

export const getContactConnectedDevices: EcpQuery<
  { contactId: AccountId | undefined },
  Array<DeviceId>
> =
  ({ contactId }) =>
  async ({ store }) => {
    if (!contactId) return [];
    return await store.getContactConnectedDevices(contactId);
  };
