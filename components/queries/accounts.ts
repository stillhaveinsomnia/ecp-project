import {
  AccountId,
  accountIdFromAccountSecret,
  AccountSecret,
  AccountSecretSchema,
  DeviceId,
  deviceIdFromDeviceSecret,
  generateDeviceSecret,
} from "../cryptography/cryptography";
import { AppStoredData } from "../storage/AppStorage";
import { EcpMutation, EcpQuery } from "../store/feApi";
import { groupBy, maxBy } from "./helpers";
import { nowTimestamp } from "./Timestamp";

export const addAccount: EcpMutation<{
  accountSecret: AccountSecret;
  name: string;
}> =
  ({ accountSecret, name }) =>
  async ({ appStorage }) => {
    const accountId = accountIdFromAccountSecret(accountSecret);
    const deviceSecret = generateDeviceSecret();
    const deviceId = deviceIdFromDeviceSecret(deviceSecret);
    await appStorage.write((current) => {
      return {
        ...current,
        deviceSettings: {
          ...current.deviceSettings,
          cryptoPrivateKeys: {
            ...current.deviceSettings.cryptoPrivateKeys,
            [accountSecret]: deviceSecret,
          },
        },
        data: [
          ...current.data,
          {
            type: "ContactUpdate",
            accountId,
            contactId: accountId,
            name,
            deleted: false,
            timestamp: nowTimestamp(),
            deviceId,
          },
        ],
      };
    });
  };

// TODO remove all data related to the account, not just the crypto keys
export const removeAccount: EcpMutation<{ accountId: AccountId }> =
  ({ accountId }) =>
  async ({ appStorage }) => {
    await appStorage.write((current) => {
      const newCryptoPrivateKeys = Object.fromEntries(
        Object.entries(current.deviceSettings.cryptoPrivateKeys).filter(
          ([accountSecret, _]) => {
            const currentAccountId = accountIdFromAccountSecret(
              accountSecret as AccountSecret,
            );
            return currentAccountId !== accountId;
          },
        ),
      );
      const deviceId = getDeviceIdByAccountId(accountId, current);
      return {
        ...current,
        deviceSettings: {
          ...current.deviceSettings,
          cryptoPrivateKeys: newCryptoPrivateKeys,
        },
        data: [
          ...current.data,
          {
            type: "ContactUpdate",
            accountId,
            contactId: accountId,
            name: "",
            deleted: true,
            timestamp: nowTimestamp(),
            deviceId,
          },
        ],
      };
    });
  };

export const getDeviceId: EcpQuery<
  { accountId: AccountId | undefined },
  DeviceId | undefined
> =
  ({ accountId }) =>
  async ({ appStorage }) => {
    if (!accountId) return undefined;
    const current = await appStorage.read();
    try {
      return getDeviceIdByAccountId(accountId, current);
    } catch {
      return undefined;
    }
  };

export function getDeviceIdByAccountId(
  accountId: AccountId,
  current: AppStoredData,
): DeviceId {
  const deviceSecret = Object.entries(
    current.deviceSettings.cryptoPrivateKeys,
  ).find(([accountSecret]) => {
    const currentAccountId = accountIdFromAccountSecret(
      accountSecret as AccountSecret,
    );
    return currentAccountId === accountId;
  })?.[1];
  if (!deviceSecret) {
    throw new Error(`No device secret found for accountId ${accountId}`);
  }
  return deviceIdFromDeviceSecret(deviceSecret);
}

export const getAccountSecret: EcpQuery<
  { accountId: AccountId },
  AccountSecret | undefined
> =
  ({ accountId }) =>
  async ({ appStorage }) => {
    const current = await appStorage.read();
    const accountSecret = Object.keys(
      current.deviceSettings.cryptoPrivateKeys,
    ).find((candidateAccountSecret) => {
      const currentAccountId = accountIdFromAccountSecret(
        candidateAccountSecret as AccountSecret,
      );
      return currentAccountId === accountId;
    });
    if (accountSecret) {
      return AccountSecretSchema.parse(accountSecret);
    }
  };

export const getAccounts: EcpQuery<
  void,
  Array<{ accountId: AccountId; name: string }>
> =
  () =>
  async ({ appStorage }) => {
    const current = await appStorage.read();
    const all = current.data;
    return groupBy(
      all
        .filter((item) => item.type === "ContactUpdate")
        .filter((update) => update.accountId === update.contactId),
      (update) => [update.accountId],
      (updates) => maxBy(updates, (update) => update.timestamp),
    )
      .filter((update) => !update.deleted)
      .map((update) => ({ accountId: update.accountId, name: update.name }));
  };
