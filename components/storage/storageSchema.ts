import * as z from "zod";
import {
  AccountSecretSchema,
  DeviceSecretSchema,
} from "../cryptography/cryptography";
import { languages } from "../i18n/languages";

// TODO migration scripts when app updates
// TODO protect data with password or biometric auth
// TODO what to do when data is corrupted?

export const LanguageSchema = z.enum(languages);
export type Language = z.infer<typeof LanguageSchema>;

export const themes = ["light", "dark"] as const;
export const ThemeSchema = z.enum(themes);
export type Theme = z.infer<typeof ThemeSchema>;

export const StoredDeviceSettingsDataSchema = z.object({
  cryptoPrivateKeys: z.record(AccountSecretSchema, DeviceSecretSchema),
  language: LanguageSchema.optional(),
  theme: ThemeSchema.optional(),
});
