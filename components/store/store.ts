import * as z from "zod";
import {
  AccountId,
  AccountIdSchema,
  AccountSecret,
  DeviceId,
  deviceIdFromDeviceSecret,
  DeviceSecret,
} from "../cryptography/cryptography";
import {
  openMessage,
  sealMessage,
  SealedEnvelope,
} from "../cryptography/e2ee";
import { ShouldSendProps } from "../queries/shouldSend";

// ARCHITECTURE: Account/Device/Replication Model
// Each app instance manages one or more accounts.
// Each account has a single deviceId tied to its DHT identity (derived from account secret).
// Replicated data is authored with (accountId, deviceId) pair:
//   - accountId: the author's account
//   - deviceId: the device from which the author authored this data
// At networking/store level, a device connection can carry data from multiple accounts
// (e.g., peer's device may authenticate as peer1's deviceId but carry peer2's messages).
// At app level currently, each account strictly uses its own deviceId (1:1 mapping).
// The store filters replication using shouldSend(thisAccountId, otherAccountId, storeItem)
// which determines if data authored by otherAccountId should be shared to thisAccountId
// across a device connection between devices that may manage multiple accounts each.

type StoreInInterface<StoreItem> = {
  parse(item: unknown): StoreItem;
  onAdd(item: StoreItem): Promise<void>;
  storage: StorageInterface<StoreItem>;
  networkFactory: NetworkFactory;
  shouldSend(props: ShouldSendProps<StoreItem>): boolean;
  getDeviceByAccounts(): Promise<Map<AccountId, DeviceSecret>>;
  getContacts(accountId: AccountId): Promise<Array<AccountId>>;
  getAccountSecrets(): Promise<Map<AccountId, AccountSecret>>;
};

export type StoreOutInterface<StoreItem> = {
  add(item: StoreItem): Promise<void>;
  all(): Promise<Array<StoreItem>>;
  getContactConnectedDevices(contactId: AccountId): Promise<Array<DeviceId>>;
  stop(): Promise<void>;
};

type StorageInterface<StoreItem> = {
  add(item: StoreItem): Promise<boolean>;
  all(): Promise<Array<StoreItem>>;
};

export type NetworkInInterface = {
  received(
    deviceId: DeviceId,
    fromDeviceId: DeviceId,
    message: unknown,
  ): Promise<void>;
  connected(deviceId: DeviceId, otherDeviceId: DeviceId): Promise<void>;
};

export type NetworkOutInterface = {
  start(deviceSecret: DeviceSecret): Promise<void>;
  stop(deviceId: DeviceId): Promise<void>;
  send(
    deviceId: DeviceId,
    toDeviceId: DeviceId,
    message: unknown,
  ): Promise<void>;
  getStartedDevices(): Promise<Array<DeviceId>>;
  getConnectedDevices(deviceId: DeviceId): Promise<Array<DeviceId>>;
  join(deviceId: DeviceId, topic: AccountId): Promise<void>;
  leave(deviceId: DeviceId, topic: AccountId): Promise<void>;
};

export type NetworkFactory = (out: NetworkInInterface) => NetworkOutInterface;

// TODO implement close method for network

export function createStore<StoreItem>({
  parse,
  onAdd,
  storage,
  networkFactory,
  shouldSend,
  getDeviceByAccounts,
  getContacts,
  getAccountSecrets,
}: StoreInInterface<StoreItem>): StoreOutInterface<StoreItem> {
  const SealedEnvelopeSchema = z.object({
    ephemeralPubKey: z.string(),
    nonce: z.string(),
    ciphertext: z.string(),
  });

  const ProtocolMessageSchema = z.discriminatedUnion("type", [
    z.object({
      type: z.literal("data"),
      data: z.unknown().transform((value, ctx) => {
        try {
          return parse(value);
        } catch (err) {
          ctx.addIssue({
            code: "custom",
            message: err instanceof Error ? err.message : "Parsing failed",
          });
          return z.NEVER;
        }
      }),
    }),
    z.object({
      type: z.literal("encrypted_data"),
      receiverId: AccountIdSchema,
      envelope: SealedEnvelopeSchema,
    }),
    z.object({
      type: z.literal("accountHeartbeat"),
      accountId: AccountIdSchema,
    }),
  ]);
  // type ProtocolMessage = z.infer<typeof ProtocolMessageSchema>;

  const heartbeats = makeHeartbeatRepository();

  const getOwnedAccountsByDevice = async () => {
    const accountByDevice = new Map<DeviceId, Array<AccountId>>();
    const deviceByAccounts = await getDeviceByAccounts();
    for (const [accountId, deviceSecret] of deviceByAccounts) {
      const deviceId = deviceIdFromDeviceSecret(deviceSecret);
      if (!accountByDevice.has(deviceId)) {
        accountByDevice.set(deviceId, []);
      }
      accountByDevice.get(deviceId)!.push(accountId);
    }
    return accountByDevice;
  };

  const shouldSendForDevicePair = ({
    storeItem,
    thisAccountIds,
    otherAccountIds,
  }: {
    storeItem: StoreItem;
    thisAccountIds: Array<AccountId>;
    otherAccountIds: Array<AccountId>;
  }) => {
    for (const thisAccountId of thisAccountIds) {
      for (const otherAccountId of otherAccountIds) {
        if (shouldSend({ thisAccountId, otherAccountId, storeItem })) {
          return true;
        }
      }
    }
    return false;
  };

  const inferAccountIdsFromStoreItem = (storeItem: StoreItem) => {
    const accountIds = new Set<AccountId>();
    if (typeof storeItem !== "object" || storeItem === null) {
      return [] as Array<AccountId>;
    }
    const candidate = storeItem as Record<string, unknown>;

    // For DirectMessageUpdate, only include the recipient, not the sender.
    // The sender is likely local; we want to reach the recipient (other account).
    if (candidate.type === "DirectMessageUpdate") {
      const receiverId = candidate.receiverId;
      if (typeof receiverId === "string") {
        accountIds.add(receiverId as AccountId);
      }
      return Array.from(accountIds);
    }

    // For other types, collect all account-like fields as fallback.
    const possibleKeys = ["accountId", "contactId", "senderId", "receiverId"];
    for (const key of possibleKeys) {
      const value = candidate[key];
      if (typeof value === "string") {
        accountIds.add(value as AccountId);
      }
    }
    return Array.from(accountIds);
  };

  const getOtherAccountIdsForDevice = ({
    otherDeviceId,
    storeItem,
  }: {
    otherDeviceId: DeviceId;
    storeItem: StoreItem;
  }) => {
    const fromHeartbeats = heartbeats.getDeviceConnectedAccounts(otherDeviceId);
    if (fromHeartbeats.length > 0) {
      return fromHeartbeats;
    }
    return inferAccountIdsFromStoreItem(storeItem);
  };

  const sendItemToDevice = async (
    deviceId: DeviceId,
    toDeviceId: DeviceId,
    item: StoreItem,
    recipientAccountId?: AccountId,
  ) => {
    if (recipientAccountId) {
      // E2EE: encrypt the item for the specific recipient account
      const envelope = await sealMessage(item, recipientAccountId);
      await network.send(deviceId, toDeviceId, {
        type: "encrypted_data",
        receiverId: recipientAccountId,
        envelope,
      });
    } else {
      // Fallback: send unencrypted (should not happen in production)
      await network.send(deviceId, toDeviceId, { type: "data", data: item });
    }
  };

  const syncExistingItemsToDevice = async (
    deviceId: DeviceId,
    toDeviceId: DeviceId,
  ) => {
    const all = await storage.all();
    const ownedAccountsByDevice = await getOwnedAccountsByDevice();
    const thisAccountIds = ownedAccountsByDevice.get(deviceId) ?? [];

    if (thisAccountIds.length === 0) {
      return;
    }

    const itemsToSend: Array<{ item: StoreItem; recipientAccountId: AccountId | undefined }> = [];
    for (const item of all) {
      const otherAccountIds = getOtherAccountIdsForDevice({
        otherDeviceId: toDeviceId,
        storeItem: item,
      });
      if (otherAccountIds.length === 0) {
        continue;
      }
      if (
        shouldSendForDevicePair({
          storeItem: item,
          thisAccountIds,
          otherAccountIds,
        })
      ) {
        // Pick the first matching other account as the encryption target
        itemsToSend.push({ item, recipientAccountId: otherAccountIds[0] });
      }
    }

    await Promise.all(
      itemsToSend.map(({ item, recipientAccountId }) =>
        sendItemToDevice(deviceId, toDeviceId, item, recipientAccountId),
      ),
    );
  };

  const network = networkFactory({
    async received(deviceId, fromDeviceId, data) {
      const parsed = ProtocolMessageSchema.parse(data);
      switch (parsed.type) {
        case "data": {
          const item = parsed.data;
          const didAdd = await storage.add(item);
          if (didAdd) {
            await onAdd(item);
          }
          break;
        }
        case "encrypted_data": {
          // E2EE: try to decrypt with our account secrets
          const secrets = await getAccountSecrets();
          const accountSecret = secrets.get(parsed.receiverId);
          if (!accountSecret) {
            // Not for us — we don't own this receiverId
            break;
          }
          try {
            const decrypted = await openMessage(
              parsed.envelope as SealedEnvelope,
              parsed.receiverId,
              accountSecret,
            );
            const item = parse(decrypted);
            const didAdd = await storage.add(item);
            if (didAdd) {
              await onAdd(item);
            }
          } catch {
            // Decryption failed — corrupted or not for us
            console.warn("E2EE decryption failed, dropping message");
          }
          break;
        }
        case "accountHeartbeat": {
          // Just register the heartbeat, don't send anything.
          // Syncing happens via the connected() callback when first connecting,
          // and via fanout in add() when new items are created.
          heartbeats.add(parsed.accountId, fromDeviceId);
          break;
        }
      }
    },
    async connected(deviceId, otherDeviceId) {
      await syncExistingItemsToDevice(deviceId, otherDeviceId);
    },
  });

  let isStopped = false;
  const pendingSleeps = new Map<ReturnType<typeof setTimeout>, () => void>();

  async function sleep(ms: number) {
    if (isStopped) return;
    await new Promise<void>((resolve) => {
      const timeoutId = setTimeout(() => {
        pendingSleeps.delete(timeoutId);
        resolve();
      }, ms);
      pendingSleeps.set(timeoutId, resolve);
    });
  }

  async function startStopDevices() {
    if (isStopped) return;
    const deviceByAccounts = await getDeviceByAccounts();
    const devicesToActivateSecrets = new Set(deviceByAccounts.values());
    const devicesToActivatateIds = new Set(
      Array.from(devicesToActivateSecrets).map((deviceSecret) =>
        deviceIdFromDeviceSecret(deviceSecret),
      ),
    );
    for (const deviceId of await network.getStartedDevices()) {
      if (!devicesToActivatateIds.has(deviceId)) {
        await network.stop(deviceId);
      }
    }
    for (const deviceSecret of devicesToActivateSecrets) {
      await network.start(deviceSecret);
    }
    await sleep(1000);
    await startStopDevices();
  }
  const startStopDevicesLoop = startStopDevices();

  async function heartbeat() {
    if (isStopped) return;
    const deviceByAccounts = await getDeviceByAccounts();
    for (const [accountId, deviceSecret] of deviceByAccounts) {
      const deviceId = deviceIdFromDeviceSecret(deviceSecret);
      for (const toDeviceId of await network.getConnectedDevices(deviceId)) {
        await network.send(deviceId, toDeviceId, {
          type: "accountHeartbeat",
          accountId,
        });
      }
    }
    await sleep(1000);
    await heartbeat();
  }
  const heartbeatLoop = heartbeat();

  // TODO leave topics
  async function joinLeaveTopics() {
    if (isStopped) return;
    const deviceByAccounts = await getDeviceByAccounts();
    for (const [accountId, deviceSecret] of deviceByAccounts) {
      const deviceId = deviceIdFromDeviceSecret(deviceSecret);
      await network.join(deviceId, accountId);
      const contacts = await getContacts(accountId);
      for (const contactId of contacts) {
        await network.join(deviceId, contactId);
      }
    }
    await sleep(1000);
    await joinLeaveTopics();
  }
  const joinLeaveTopicsLoop = joinLeaveTopics();

  const fanoutNewItem = async (item: StoreItem) => {
    const ownedAccountsByDevice = await getOwnedAccountsByDevice();
    for (const deviceId of await network.getStartedDevices()) {
      const thisAccountIds = ownedAccountsByDevice.get(deviceId) ?? [];
      if (thisAccountIds.length === 0) {
        continue;
      }
      for (const toDeviceId of await network.getConnectedDevices(deviceId)) {
        const otherAccountIds = getOtherAccountIdsForDevice({
          otherDeviceId: toDeviceId,
          storeItem: item,
        });
        if (otherAccountIds.length === 0) {
          continue;
        }
        if (
          shouldSendForDevicePair({
            thisAccountIds,
            otherAccountIds,
            storeItem: item,
          })
        ) {
          // Encrypt for the first matching recipient account
          await sendItemToDevice(deviceId, toDeviceId, item, otherAccountIds[0]);
        }
      }
    }
  };

  return {
    async add(item) {
      const didAdd = await storage.add(item);
      if (didAdd) {
        await onAdd(item);
        void fanoutNewItem(item);
      }
    },
    async all() {
      return await storage.all();
    },
    async getContactConnectedDevices(contactId: AccountId) {
      return heartbeats.getAccountConnectedDevices(contactId);
    },
    async stop() {
      isStopped = true;
      for (const [timeoutId, resolve] of pendingSleeps) {
        clearTimeout(timeoutId);
        resolve();
      }
      pendingSleeps.clear();
      await Promise.all([
        startStopDevicesLoop,
        heartbeatLoop,
        joinLeaveTopicsLoop,
      ]);
      await Promise.all(
        (await network.getStartedDevices()).map((deviceId) =>
          network.stop(deviceId),
        ),
      );
    },
  };
}

function makeHeartbeatRepository() {
  const byAccountId = new Map<AccountId, Map<DeviceId, number>>();
  const byDeviceId = new Map<DeviceId, Map<AccountId, number>>();
  const add = (accountId: AccountId, deviceId: DeviceId) => {
    const now = Date.now();
    if (!byAccountId.has(accountId)) {
      byAccountId.set(accountId, new Map());
    }
    if (!byDeviceId.has(deviceId)) {
      byDeviceId.set(deviceId, new Map());
    }
    byAccountId.get(accountId)!.set(deviceId, now);
    byDeviceId.get(deviceId)!.set(accountId, now);
  };
  const getAccountConnectedDevices = (accountId: AccountId) => {
    const now = Date.now();
    return Array.from(
      Array.from(
        (byAccountId.get(accountId) ?? new Map<DeviceId, number>()).entries(),
      )
        .filter(([_, timestamp]) => now - timestamp < 4000)
        .map(([deviceId, _]) => deviceId),
    );
  };
  const getDeviceConnectedAccounts = (deviceId: DeviceId) => {
    const now = Date.now();
    return Array.from(
      Array.from(
        (byDeviceId.get(deviceId) ?? new Map<AccountId, number>()).entries(),
      )
        .filter(([_, timestamp]) => now - timestamp < 4000)
        .map(([accountId, _]) => accountId),
    );
  };
  return { add, getAccountConnectedDevices, getDeviceConnectedAccounts };
}
