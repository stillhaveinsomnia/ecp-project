import AsyncStorage from "@react-native-async-storage/async-storage";
import { StorageInterface } from "./StorageInteraface";
import { encryptData, decryptData } from "./dbEncryption";

/**
 * A storage interface that transparently encrypts data at rest using AES-256-GCM
 * with a hardware-backed key from SecureStore.
 */
export function createEncryptedAsyncLocalStorage(): StorageInterface {
  const localStorageKey = "data";
  
  return {
    async read() {
      const loaded = await AsyncStorage.getItem(localStorageKey);
      if (!loaded) return undefined;

      // Migration fallback: if it's plaintext JSON (starts with { or [),
      // read it, but it will be encrypted on the next write().
      if (loaded.startsWith("{") || loaded.startsWith("[")) {
        return JSON.parse(loaded);
      }

      // Base64 to Uint8Array (since AsyncStorage only stores strings)
      const binaryString = atob(loaded);
      const encryptedBytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        encryptedBytes[i] = binaryString.charCodeAt(i);
      }

      const decryptedBytes = await decryptData(encryptedBytes);
      const jsonString = new TextDecoder().decode(decryptedBytes);
      return JSON.parse(jsonString);
    },
    
    async write(data) {
      const jsonString = JSON.stringify(data);
      const plaintext = new TextEncoder().encode(jsonString);
      
      const encryptedBytes = await encryptData(plaintext);
      
      // Uint8Array to Base64
      let binaryString = "";
      for (let i = 0; i < encryptedBytes.byteLength; i++) {
        binaryString += String.fromCharCode(encryptedBytes[i]);
      }
      const base64String = btoa(binaryString);
      
      await AsyncStorage.setItem(localStorageKey, base64String);
    },
  };
}
