import {
  QueuedStorageInterface,
  TypedStorageInterface,
} from "./StorageInteraface";

// TODO this will be refactored to proper database access in future

export function createQueuedStorage<T>(
  typedStorage: TypedStorageInterface<T>,
): QueuedStorageInterface<T> {
  let last = Promise.resolve();
  function queue<T>(action: () => Promise<T>): Promise<T> {
    const result = last.then(action);
    last = result.then(
      () => {},
      () => {},
    );
    return result;
  }
  return {
    async read() {
      return await queue(async () => {
        return await typedStorage.read();
      });
    },
    async write(update) {
      return await queue(async () => {
        await typedStorage.write(update(await typedStorage.read()));
      });
    },
  };
}
