import { I18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import * as Localization from "expo-localization";
import { use, useLayoutEffect, useState } from "react";
import { memoizeSimple } from "../memoization";
import { Language, LanguageSchema } from "../storage/storageSchema";
import { useEcpQuery } from "../store/dataApi";
import { EcpMutation, EcpQuery } from "../store/feApi";
import { languages } from "./languages";

export const getLanguage: EcpQuery<void, Language | undefined> =
  () =>
  async ({ appStorage }) => {
    const current = await appStorage.read();
    return current.deviceSettings.language;
  };

export const setLanguage: EcpMutation<Language | undefined> =
  (language) =>
  async ({ appStorage }) => {
    await appStorage.write((current) => {
      return {
        ...current,
        deviceSettings: { ...current.deviceSettings, language },
      };
    });
  };

export const systemLanguage = LanguageSchema.parse(
  Localization.getLocales().find((l) =>
    languages.includes(l.languageCode as any),
  )?.languageCode ?? "en",
);

export function EcpI18n({
  i18n,
  children,
}: {
  i18n: I18n;
  children: React.ReactNode;
}) {
  const languageFromStorage = useEcpQuery(getLanguage, undefined);
  const currentLanguage = languageFromStorage ?? systemLanguage;
  const messages = use(loadMessages(currentLanguage));
  const [isActivated, setIsActivated] = useState(false);
  useLayoutEffect(() => {
    i18n.loadAndActivate({ locale: currentLanguage, messages });
    setIsActivated(true);
  }, [currentLanguage, i18n, messages]);
  if (!isActivated) return null;
  return <I18nProvider i18n={i18n}>{children}</I18nProvider>;
}

const loadMessages = memoizeSimple(async (language: Language) => {
  switch (language) {
    case "en":
      return (await import("./locales/en/messages")).messages;
    case "zh":
      return (await import("./locales/zh/messages")).messages;
    // case "es":
    //   return (await import("./locales/es/messages")).messages;
    // case "hi":
    //   return (await import("./locales/hi/messages")).messages;
    // case "bn":
    //   return (await import("./locales/bn/messages")).messages;
    // case "pt":
    //   return (await import("./locales/pt/messages")).messages;
    // case "ru":
    //   return (await import("./locales/ru/messages")).messages;
    // case "ja":
    //   return (await import("./locales/ja/messages")).messages;
    // case "vi":
    //   return (await import("./locales/vi/messages")).messages;
    // case "tr":
    //   return (await import("./locales/tr/messages")).messages;
    // case "mr":
    //   return (await import("./locales/mr/messages")).messages;
    // case "te":
    //   return (await import("./locales/te/messages")).messages;
    // case "ko":
    //   return (await import("./locales/ko/messages")).messages;
    // case "fr":
    //   return (await import("./locales/fr/messages")).messages;
    // case "ta":
    //   return (await import("./locales/ta/messages")).messages;
    // case "ar":
    //   return (await import("./locales/ar/messages")).messages;
    // case "de":
    //   return (await import("./locales/de/messages")).messages;
    // case "ur":
    //   return (await import("./locales/ur/messages")).messages;
    // case "jv":
    //   return (await import("./locales/jv/messages")).messages;
    case "it":
      return (await import("./locales/it/messages")).messages;
    // case "th":
    //   return (await import("./locales/th/messages")).messages;
    // case "gu":
    //   return (await import("./locales/gu/messages")).messages;
    // case "ha":
    //   return (await import("./locales/ha/messages")).messages;
    // case "kn":
    //   return (await import("./locales/kn/messages")).messages;
    // case "fa":
    //   return (await import("./locales/fa/messages")).messages;
    // case "pl":
    //   return (await import("./locales/pl/messages")).messages;
    // case "id":
    //   return (await import("./locales/id/messages")).messages;
    // case "sw":
    //   return (await import("./locales/sw/messages")).messages;
  }
});
