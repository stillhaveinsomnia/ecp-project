import { blake3 } from "@noble/hashes/blake3.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import * as z from "zod";

// TODO this is naive and sync, will need proper mangment on async writes and reads

export const ContentAddressSchema = z.string().brand("ContentAddress");
export type ContentAddress = z.infer<typeof ContentAddressSchema>;

export async function storeFile(data: Uint8Array): Promise<ContentAddress> {
  const hash = bytesToHex(blake3(data, { dkLen: 32 }));
  const fileHandle = await (
    await navigator.storage.getDirectory()
  ).getFileHandle(hash, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(data.buffer as ArrayBuffer); // Uint8Array.buffer typed as ArrayBufferLike in TS 5.9+
  await writable.close();
  return ContentAddressSchema.parse(hash);
}

/** ⚠️ caller must call URL.revokeObjectURL() when done */
async function doGetFileUri(address: ContentAddress): Promise<string> {
  const fileHandle = await (
    await navigator.storage.getDirectory()
  ).getFileHandle(address);
  const file = await fileHandle.getFile();
  return URL.createObjectURL(file);
}
export const getFileUri = naiveMemoize(doGetFileUri);

async function doLoadFileMagicBytes(
  address: ContentAddress,
): Promise<Uint8Array> {
  const fileHandle = await (
    await navigator.storage.getDirectory()
  ).getFileHandle(address);
  const file = await fileHandle.getFile();
  const buffer = await file.slice(0, 16).arrayBuffer();
  return new Uint8Array(buffer);
}
export const loadFileMagicBytes = naiveMemoize(doLoadFileMagicBytes);

export async function deleteAllFiles(): Promise<void> {
  const root = await navigator.storage.getDirectory();
  for await (const [name] of root.entries()) {
    await root.removeEntry(name, { recursive: true });
  }
}

function naiveMemoize<A extends string, R>(callback: (arg: A) => Promise<R>) {
  const cache = new Map<A, Promise<R>>();
  return (arg: A): Promise<R> => {
    if (cache.has(arg)) return cache.get(arg)!;
    const result = callback(arg);
    cache.set(arg, result);
    return result;
  };
}
