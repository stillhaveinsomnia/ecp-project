import { Directory, File, Paths } from "expo-file-system";
import { zip } from "react-native-zip-archive";
import * as Sharing from "expo-sharing";
import { AppStoredData } from "../storage/AppStorage";
import { QueuedStorageInterface } from "../storage/StorageInteraface";

const BACKUP_DB_FILENAME = "ecp-database.json";
const BACKUP_ZIP_FILENAME = "ecp-backup.zip";

/**
 * Creates a full backup of the application data (messages, contacts, crypto keys, files)
 * as a single ZIP archive and opens the native Share sheet for the user to save it.
 *
 * Flow:
 * 1. Serialize the entire AppStoredData (contacts, messages, crypto keys) to JSON.
 * 2. Write the JSON to a temporary file inside Paths.document alongside the media files.
 * 3. Zip the entire Paths.document directory.
 * 4. Remove the temporary JSON file from Paths.document.
 * 5. Open the native share sheet so the user can save/send the ZIP.
 * 6. Clean up the ZIP file from the cache directory.
 */
export async function createBackup(
  appStorage: QueuedStorageInterface<AppStoredData>,
): Promise<void> {
  const dbFile = new File(Paths.document, BACKUP_DB_FILENAME);
  const zipDir = new Directory(Paths.cache, "backup");
  const zipFilePath = `${Paths.cache.uri}/backup/${BACKUP_ZIP_FILENAME}`;

  try {
    // Step 1: Read and serialize all application data
    const data = await appStorage.read();
    const jsonString = JSON.stringify(data);

    // Step 2: Write the JSON database file into the document directory
    // (alongside all the content-addressed media files)
    dbFile.create({ intermediates: true, overwrite: true });
    dbFile.write(jsonString);

    // Step 3: Ensure the backup output directory exists
    zipDir.create({ intermediates: true, idempotent: true });

    // Step 4: Zip the entire document directory
    // The document directory contains:
    //   - Content-addressed media files (blake3 hashes as filenames)
    //   - ecp-database.json (the full application state we just wrote)
    const resultPath = await zip(Paths.document.uri, zipFilePath);

    // Step 5: Remove the temporary database file from the document directory
    // so it doesn't interfere with the normal file store operation
    if (dbFile.exists) {
      dbFile.delete();
    }

    // Step 6: Share the ZIP via the native share sheet
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(resultPath, {
        mimeType: "application/zip",
        dialogTitle: "ECP Backup",
        UTI: "public.zip-archive", // iOS UTI for ZIP files
      });
    } else {
      throw new Error("Sharing is not available on this device");
    }
  } finally {
    // Step 7: Clean up temporary files regardless of success or failure
    try {
      if (dbFile.exists) dbFile.delete();
    } catch (_) {
      // Ignore cleanup errors
    }

    // Clean up the generated ZIP from the cache
    try {
      const zipFile = new File(Paths.cache, "backup", BACKUP_ZIP_FILENAME);
      if (zipFile.exists) zipFile.delete();
    } catch (_) {
      // Ignore cleanup errors
    }
  }
}

/**
 * Restores application data from a backup ZIP archive.
 *
 * Flow:
 * 1. Unzip the archive into a temporary directory.
 * 2. Read and parse the ecp-database.json file.
 * 3. Copy all media files (everything except ecp-database.json) into Paths.document.
 * 4. Write the parsed data into appStorage.
 * 5. Clean up the temporary directory.
 */
export async function restoreBackup(
  appStorage: QueuedStorageInterface<AppStoredData>,
  zipUri: string,
): Promise<void> {
  // Dynamic import to avoid pulling in unzip on the export-only path
  const { unzip } = await import("react-native-zip-archive");

  const restoreDir = new Directory(Paths.cache, "restore");

  try {
    // Step 1: Ensure a clean restore directory
    if (restoreDir.exists) restoreDir.delete();
    restoreDir.create({ intermediates: true, idempotent: true });

    // Step 2: Unzip the backup archive
    await unzip(zipUri, restoreDir.uri);

    // Step 3: Read the database JSON
    const dbFile = new File(restoreDir, BACKUP_DB_FILENAME);
    if (!dbFile.exists) {
      throw new Error(
        "Invalid backup: missing ecp-database.json in the archive",
      );
    }
    const jsonString = dbFile.textSync();
    const restoredData: AppStoredData = JSON.parse(jsonString);

    // Step 4: Copy all media files to the document directory
    for (const item of restoreDir.list()) {
      if (item instanceof File && item.uri !== dbFile.uri) {
        const targetFile = new File(Paths.document, item.uri.split("/").pop()!);
        if (!targetFile.exists) {
          targetFile.create({ intermediates: true, overwrite: true });
          targetFile.write(item.bytesSync());
        }
      }
    }

    // Step 5: Write the restored data into the app storage
    await appStorage.write(() => restoredData);
  } finally {
    // Step 6: Clean up the temporary restore directory
    try {
      if (restoreDir.exists) restoreDir.delete();
    } catch (_) {
      // Ignore cleanup errors
    }
  }
}
