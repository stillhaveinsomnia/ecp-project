import * as z from "zod";
import { DataItemSchema } from "../queries/Queries";
import { createQueuedStorage } from "./QueuedStorage";
import { StorageInterface } from "./StorageInteraface";
import { StoredDeviceSettingsDataSchema } from "./storageSchema";
import { createTypedStorage } from "./TypedStorage";

const AppStoredDataSchema = z.object({
  deviceSettings: StoredDeviceSettingsDataSchema,
  data: z.array(DataItemSchema),
});

export type AppStoredData = z.infer<typeof AppStoredDataSchema>;

export function createAppStorage({ storage }: { storage: StorageInterface }) {
  const typedStorage = createTypedStorage<AppStoredData>({
    storage,
    initial: { deviceSettings: { cryptoPrivateKeys: {} }, data: [] },
    encode: AppStoredDataSchema.parse,
    decode: AppStoredDataSchema.parse,
  });
  const queuedStorage = createQueuedStorage(typedStorage);
  return queuedStorage;
}
