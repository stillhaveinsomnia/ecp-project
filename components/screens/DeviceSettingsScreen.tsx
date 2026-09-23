import { useLingui } from "@lingui/react/macro";
import { Fragment, startTransition } from "react";
import { ScrollView, Text, View } from "react-native";
import { languages, languagesDict } from "../i18n/languages";
import { getLanguage, setLanguage, systemLanguage } from "../i18n/EcpI18n";
import { Language, Theme, themes } from "../storage/storageSchema";
import { useEcpMutation, useEcpQuery } from "../store/dataApi";
import { getTheme, setTheme, useSystemTheme, useTheme } from "../Theme";
import { BackIcon } from "../ui/Icon";
import { ScreenLink } from "../ui/ScreenLink";
import { Select } from "../ui/Select";
import { SelectAccountScreen } from "./SelectAccountScreen";

export function DeviceSettingsScreen() {
  const { t } = useLingui();
  const theme = useTheme();
  const systemTheme = useSystemTheme();

  const savedLanguage = useEcpQuery(getLanguage, undefined);
  const setLanguageMutation = useEcpMutation(setLanguage);

  const savedTheme = useEcpQuery(getTheme, undefined);
  const setThemeMutation = useEcpMutation(setTheme);

  const getLanguageName = (language: Language) => {
    switch (language) {
      case "en":
        return "🇬🇧 English";
      case "zh":
        return "🇨🇳 中文";
      // case "es":
      //   return "🇪🇸 Español";
      // case "hi":
      //   return "🇮🇳 हिन्दी";
      // case "bn":
      //   return "🇧🇩 বাংলা";
      // case "pt":
      //   return "🇵🇹 Português";
      // case "ru":
      //   return "🇷🇺 Русский";
      // case "ja":
      //   return "🇯🇵 日本語";
      // case "vi":
      //   return "🇻🇳 Tiếng Việt";
      // case "tr":
      //   return "🇹🇷 Türkçe";
      // case "mr":
      //   return "🇮🇳 मराठी";
      // case "te":
      //   return "🇮🇳 తెలుగు";
      // case "ko":
      //   return "🇰🇷 한국어";
      // case "fr":
      //   return "🇫🇷 Français";
      // case "ta":
      //   return "🇱🇰 தமிழ்";
      // case "ar":
      //   return "🇸🇦 العربية";
      // case "de":
      //   return "🇩🇪 Deutsch";
      // case "ur":
      //   return "🇵🇰 اردو";
      // case "jv":
      //   return "🇮🇩 Basa Jawa";
      case "it":
        return "🇮🇹 Italiano";
      // case "th":
      //   return "🇹🇭 ไทย";
      // case "gu":
      //   return "🇮🇳 ગુજરાતી";
      // case "ha":
      //   return "🇳🇬 Hausa";
      // case "kn":
      //   return "🇮🇳 ಕನ್ನಡ";
      // case "fa":
      //   return "🇮🇷 فارسی";
      // case "pl":
      //   return "🇵🇱 Polski";
      // case "id":
      //   return "🇮🇩 Bahasa Indonesia";
      // case "sw":
      //   return "🇰🇪 Kiswahili";
    }
  };

  return (
    <Fragment>
      <View style={[{ flexDirection: "row", alignItems: "center" }]}>
        <ScreenLink
          to={<SelectAccountScreen />}
          icon={BackIcon}
          hideLabel
          label={t`Back`}
        />
        <Text style={[theme.textStyle, { fontWeight: "bold", paddingTop: 2 }]}>
          {t`Device Settings`}
        </Text>
      </View>
      <ScrollView>
        <View style={[theme.formFieldContainerStyle]}>
          <Text style={[theme.secondaryTextStyle]}>{t`Language`}</Text>
          <Select
            options={[undefined, ...languages]}
            value={savedLanguage}
            onChange={(language) => {
              startTransition(async () => {
                await setLanguageMutation(language);
              });
            }}
            renderValue={(language) => {
              const languageName = language
                ? getLanguageName(language)
                : getLanguageName(systemLanguage);
              return language
                ? languageName
                : t`System default (${languageName})`;
            }}
            valueSearchableText={(language) =>
              language
                ? `${language} ${languagesDict[language]} ${getLanguageName(language)}`
                : `${t`System default`} ${getLanguageName(systemLanguage)}`
            }
          />
        </View>
        <View style={[theme.formFieldContainerStyle]}>
          <Text style={[theme.secondaryTextStyle]}>{t`Theme`}</Text>
          <Select
            options={[undefined, ...themes]}
            value={savedTheme}
            onChange={(nextTheme) => {
              startTransition(async () => {
                await setThemeMutation(nextTheme);
              });
            }}
            renderValue={(nextTheme) => {
              function getThemeName(nextTheme: Theme) {
                switch (nextTheme) {
                  case "light":
                    return t`Light`;
                  case "dark":
                    return t`Dark`;
                }
              }
              const themeName = nextTheme
                ? getThemeName(nextTheme)
                : getThemeName(systemTheme);
              return nextTheme ? themeName : t`System default (${themeName})`;
            }}
          />
        </View>
      </ScrollView>
    </Fragment>
  );
}
