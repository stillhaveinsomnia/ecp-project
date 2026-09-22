import AsyncStorage from "@react-native-async-storage/async-storage";
import { StorageInterface } from "./StorageInteraface";

export function createAsyncLocalStorage(): StorageInterface {
  const localStorageKey = "data";
  return {
    async read() {
      const loaded = await AsyncStorage.getItem(localStorageKey);
      if (loaded) return JSON.parse(loaded);
    },
    async write(data) {
      await AsyncStorage.setItem(localStorageKey, JSON.stringify(data));
    },
  };
}
