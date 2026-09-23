import { StorageInterface, TypedStorageInterface } from "./StorageInteraface";

export function createTypedStorage<T>({
  storage,
  initial,
  encode,
  decode,
}: {
  storage: StorageInterface;
  initial: T;
  decode(stored: unknown): T;
  encode(data: T): unknown;
}): TypedStorageInterface<T> {
  return {
    async read() {
      const loaded = await storage.read();
      if (loaded) return decode(loaded);
      return initial;
    },
    async write(data) {
      await storage.write(encode(data));
    },
  };
}
