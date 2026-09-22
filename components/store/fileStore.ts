import { blake3 } from "@noble/hashes/blake3.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import { Directory, File, Paths } from "expo-file-system";
import { unzipSync } from "fflate";
import { parse as parseToml } from "smol-toml";
import * as z from "zod";
import { memoizeSimple } from "../memoization";

export const ContentAddressSchema = z.string().brand("ContentAddress");
export type ContentAddress = z.infer<typeof ContentAddressSchema>;

// TODO this is naive and sync, will need proper mangment on async writes and reads

export async function storeFile(data: Uint8Array): Promise<ContentAddress> {
  const hash = bytesToHex(blake3(data, { dkLen: 32 }));
  const file = new File(Paths.document, hash);
  if (!file.exists) file.create();
  file.write(data);
  return ContentAddressSchema.parse(hash);
}

async function doGetFileUri(address: ContentAddress): Promise<string> {
  const file = new File(Paths.document, address);
  if (!file.exists) throw new Error("File not found: " + address);
  return file.uri;
}
export const getFileUri = memoizeSimple(doGetFileUri);

async function doLoadFileMagicBytes(
  address: ContentAddress,
): Promise<Uint8Array> {
  const file = new File(Paths.document, address);
  if (!file.exists) throw new Error("File not found: " + address);
  const handle = file.open();
  const magicBytes = handle.readBytes(16);
  return magicBytes;
}
export const loadFileMagicBytes = memoizeSimple(doLoadFileMagicBytes);

async function doLoadFile(address: ContentAddress): Promise<Uint8Array> {
  const file = new File(Paths.document, address);
  if (!file.exists) throw new Error("File not found: " + address);
  return file.bytesSync();
}
const loadFile = memoizeSimple(doLoadFile);

export type WebxdcApp = {
  indexUri: string;
  dirUri: string;
  name: string | undefined;
  iconUri: string | undefined;
};

// TODO very basic: extracts every time the cache dir doesn't already exist,
// doesn't validate the manifest, doesn't enforce any size limits
async function doLoadWebxdcApp(address: ContentAddress): Promise<WebxdcApp> {
  const dir = new Directory(Paths.cache, "webxdc", address);
  const indexFile = new File(dir, "index.html");
  if (!indexFile.exists) {
    const bytes = await loadFile(address);
    const entries = unzipSync(bytes);
    dir.create({ intermediates: true, idempotent: true });
    for (const [path, content] of Object.entries(entries)) {
      if (path.endsWith("/")) continue; // directory entry
      const file = new File(dir, ...path.split("/"));
      file.create({ intermediates: true, overwrite: true });
      file.write(content);
    }
    if (!indexFile.exists) {
      throw new Error("webxdc archive is missing an index.html");
    }
  }

  let name: string | undefined;
  const manifestFile = new File(dir, "manifest.toml");
  if (manifestFile.exists) {
    const manifest = parseToml(manifestFile.textSync());
    if (typeof manifest.name === "string") name = manifest.name;
  }
  const iconFile = [new File(dir, "icon.png"), new File(dir, "icon.jpg")].find(
    (file) => file.exists,
  );
  const iconUri = iconFile?.uri;

  return { indexUri: indexFile.uri, dirUri: dir.uri, name, iconUri };
}
export const loadWebxdcApp = memoizeSimple(doLoadWebxdcApp);

// export async function deleteAllFiles(): Promise<void> {
//   const dir = new Directory(Paths.document);
//   for (const item of dir.list()) {
//     item.delete();
//   }
// }
