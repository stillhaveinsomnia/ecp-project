export type StorageInterface = {
  read(): Promise<unknown>;
  write(data: unknown): Promise<void>;
};

export type TypedStorageInterface<T> = {
  read(): Promise<T>;
  write(data: T): Promise<void>;
};

export type QueuedStorageInterface<T> = {
  read(): Promise<T>;
  write(update: (current: T) => T): Promise<void>;
};
