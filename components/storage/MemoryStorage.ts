import { StorageInterface } from "./StorageInteraface";

export function createMemoryStorage(): StorageInterface {
  let cached: string | null = null;
  return {
    async read() {
      if (cached) return JSON.parse(cached);
    },
    async write(data) {
      cached = JSON.stringify(data);
    },
  };
}
