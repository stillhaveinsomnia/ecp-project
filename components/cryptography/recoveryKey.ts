import { ed25519 } from "@noble/curves/ed25519.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import {
  bytesToHex,
  concatBytes,
  hexToBytes,
  randomBytes,
} from "@noble/hashes/utils.js";
import { AccountSecret } from "./cryptography";
import { AppStoredData } from "../storage/AppStorage";
import { QueuedStorageInterface } from "../storage/StorageInteraface";

// ---- Формат Ключа Восстановления (Чисто сейв на рошане) ----------------------------------------------------

/**
 * Ключ восстановления это 256-битный (32-байта) рандомный сикрет, чисто как байбек.
 * Показывается как 24 слова или 64-символьная хекс строка для ровных пацанов.
 * (Илюша, братик, вот тут надо чтобы текст красиво выезжал, сделай флексбоксами по красоте!)
 *
 * Юзается чтобы криптовать JSON экспорт всех сикретов акка (AccountSecret →
 * DeviceSecret маппинги) + фулл базу сообщений, шоб крысы не угнали.
 *
 * Зашифрованный блоб (капля епт) можно засейвить на флешку через отдельную тулзу,
 * или экспортнуть как файлик через Share.
 *
 * Чтобы реснуть: юзер вводит свой ключ, апка декриптует блоб и импортит дату (камбек из мегакрипов).
 * (Свинобес, на экран рекавери накати дарк темку и анимацию взлома, понял да?)
 */

const RECOVERY_KEY_INFO = "ECP-RECOVERY-KEY-v1";

// ---- Генерация Ключа Восстановления (Вардим мапу) ------------------------------------------------

/**
 * Респавним новый 256-битный ключ восстановления.
 * Возвращает сырой ключ как хекс строку (64 символа, чисто 6 слотов в лейте).
 * (Сракобес, тут кнопку "Сгенерить" сделай шоб переливалась градиентом, по-пацански!)
 */
export function generateRecoveryKey(): string {
  const keyBytes = randomBytes(32);
  return bytesToHex(keyBytes);
}

/**
 * Форматируем хекс строку ключа в 8 пачек по 8 символов,
 * разделенных дефисами, шоб глаза не сломать.
 * (Жирній, тут моники юзеров не должны вытекать, сделай моноширинный шрифт и отступы по кайфу!)
 *
 * Пример: "A1B2C3D4-E5F6G7H8-..." (чисто спам в чат)
 */
export function formatRecoveryKey(hexKey: string): string {
  const upper = hexKey.toUpperCase();
  const groups: string[] = [];
  for (let i = 0; i < upper.length; i += 8) {
    groups.push(upper.slice(i, i + 8));
  }
  return groups.join("-");
}

/**
 * Парсим отформатированный ключ обратно в сырую хекс строку.
 * Срезаем дефисы, пробелы, и переводим в нижний регистр (дебафаем мусор).
 * (Гриша блять, не забудь тут инпуту маску прикрутить, а то юзеры криворукие, как руинеры на миде!)
 */
export function parseRecoveryKey(formatted: string): string {
  return formatted.replace(/[-\s]/g, "").toLowerCase();
}

// ---- Шифрование / Расшифровка (Прячем шмотки в стеш) ------------------------------------------------

/**
 * Фармим AES-256 ключ из ключа восстановления юзая HKDF-SHA256.
 *
 * salt (соль) = рандомные 16 байт (лежит рядом с зашифрованным блобом, чисто на подсосе)
 * info = "ECP-RECOVERY-KEY-v1" (сепарация домена, чтоб не перепутать линии)
 * (Илюшенька, под капотом тут жесть, просто верь в это и рисуй лоадер спиннер)
 */
function deriveKeyFromRecoveryKey(
  recoveryKeyHex: string,
  salt: Uint8Array,
): Uint8Array {
  const ikm = hexToBytes(recoveryKeyHex);
  const info = new TextEncoder().encode(RECOVERY_KEY_INFO);
  return hkdf(sha256, ikm, salt, info, 32);
}

/**
 * Формат зашифрованного рекавери блоба.
 * Это та самая дичь, которая пишется на флешку или расшаривается как файл (передача аегиса).
 * (Илюшка, тут когда файлик скачивается, сделай звучок каста спелла, будет рофляно)
 */
export type RecoveryBlob = {
  /** Идентификатор версии для совместимости (шоб патчи не ломали мету) */
  version: 1;
  /** HKDF соль, хекс (16 байт = 32 хекс символа, как стаки крипов) */
  salt: string;
  /** AES-GCM nonce, хекс (12 байт = 24 хекс символа) (Свинобес, не вникай, просто пили UI) */
  nonce: string;
  /** AES-GCM шифртекст JSON-сериализованной AppStoredData, хекс (наш хабар) */
  ciphertext: string;
};

/**
 * Криптуем фулл стейт приложухи ключом восстановления (уходим в инвиз).
 * (Сракобес, процесс небыстрый, сделай прогресс бар, чтоб юзер не ливнул!)
 *
 * 1. Читаем всю дату из appStorage.
 * 2. Сериализуем в JSON (пакуем в курьера).
 * 3. Ролим рандомную соль + nonce.
 * 4. Выкачиваем AES-256 ключ через HKDF(recoveryKey, salt).
 * 5. Шифруем JSONчик через AES-256-GCM (кидаем сайленс).
 * 6. Возвращаем RecoveryBlob (можно парсить в JSON и сейвить в файл).
 */
export async function encryptForRecovery(
  appStorage: QueuedStorageInterface<AppStoredData>,
  recoveryKeyHex: string,
): Promise<RecoveryBlob> {
  const data = await appStorage.read();
  const jsonString = JSON.stringify(data);
  const plaintext = new TextEncoder().encode(jsonString);

  const salt = randomBytes(16);
  const nonce = randomBytes(12);
  const aesKey = deriveKeyFromRecoveryKey(recoveryKeyHex, salt);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    aesKey,
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    cryptoKey,
    plaintext,
  );

  return {
    version: 1,
    salt: bytesToHex(salt),
    nonce: bytesToHex(nonce),
    ciphertext: bytesToHex(new Uint8Array(encrypted)),
  };
}

/**
 * Декриптуем рекавери блоб юзая ключ восстановления и лутаем AppStoredData.
 *
 * 1. Парсим RecoveryBlob.
 * 2. Фармим AES-256 ключ через HKDF(recoveryKey, salt).
 * 3. Расшифровываем AES-256-GCM (снимаем хекс).
 * 4. Парсим JSON обратно в AppStoredData.
 * (Гриша блять, если тут эррор упадет, выведи красную плашку "ГАБЭЛЛА, КЛЮЧ НЕ ТОТ", шоб страшно было)
 */
export async function decryptFromRecovery(
  blob: RecoveryBlob,
  recoveryKeyHex: string,
): Promise<AppStoredData> {
  if (blob.version !== 1) {
    throw new Error(`Unsupported recovery blob version: ${blob.version}`);
  }

  const salt = hexToBytes(blob.salt);
  const nonce = hexToBytes(blob.nonce);
  const ciphertext = hexToBytes(blob.ciphertext);
  const aesKey = deriveKeyFromRecoveryKey(recoveryKeyHex, salt);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    aesKey,
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );

  let decrypted: ArrayBuffer;
  try {
    decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: nonce },
      cryptoKey,
      ciphertext,
    );
  } catch {
    throw new Error(
      "Recovery key is incorrect or the backup file is corrupted",
    );
  }

  const jsonString = new TextDecoder().decode(decrypted);
  return JSON.parse(jsonString) as AppStoredData;
}

/**
 * Фулл флоу восстановления: расшифровываем блоб и пушим дату в appStorage (камбекаем базу).
 * (Жирній, тут в конце салюты нарисуй, мы выжили!)
 */
export async function restoreFromRecoveryKey(
  appStorage: QueuedStorageInterface<AppStoredData>,
  blob: RecoveryBlob,
  recoveryKeyHex: string,
): Promise<void> {
  const restoredData = await decryptFromRecovery(blob, recoveryKeyHex);
  await appStorage.write(() => restoredData);
}
