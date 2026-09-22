import { useColorScheme } from "react-native";
import { Theme, ThemeSchema } from "./storage/storageSchema";
import { useEcpQuery } from "./store/dataApi";
import { EcpMutation, EcpQuery } from "./store/feApi";

export const getTheme: EcpQuery<void, Theme | undefined> =
  () =>
  async ({ appStorage }) => {
    const current = await appStorage.read();
    return current.deviceSettings.theme;
  };

export const setTheme: EcpMutation<Theme | undefined> =
  (theme) =>
  async ({ appStorage }) => {
    await appStorage.write((current) => {
      return {
        ...current,
        deviceSettings: { ...current.deviceSettings, theme },
      };
    });
  };

export function useSystemTheme() {
  const systemColorScheme = useColorScheme();
  return ThemeSchema.parse(systemColorScheme === "light" ? "light" : "dark");
}

type ThemeProps = typeof darkTheme;

const baseTheme = {
  fontSize: 16,
  lineHeight: 18,
  overlayBackgroundColor: "#000000cc",
};

const darkTheme = {
  backgroundColor: "#1d1d1d",
  backgroundBackColor: "#131313",
  textColor: "#e9e9e9",
  secondaryTextColor: "#939393",
  separatorColor: "#4a4a4a",
  borderColor: "#4a4a4a",
  linkTextColor: "#60a0ff",
  pressedBackgroundColor: "#2a2a2a",
  activeActionBackgroundColor: "#1a2332",
  validationErrorTextColor: "#d56514",
  selectedItemBackgroundColor: "#353344",
};

const lightTheme: ThemeProps = {
  backgroundColor: "#fbfbfb",
  backgroundBackColor: "#e1e1e1",
  textColor: "#191919",
  secondaryTextColor: "#838383",
  separatorColor: "#cecece",
  borderColor: "#cecece",
  linkTextColor: "#2d74df",
  pressedBackgroundColor: "#d0d0d0",
  activeActionBackgroundColor: "#9bb7e2",
  validationErrorTextColor: "#dd7569",
  selectedItemBackgroundColor: "#cdc6f6",
};

export function useTheme() {
  const themeFromStorage = useEcpQuery(getTheme, undefined);
  const systemColorScheme = useSystemTheme();
  const colorScheme = themeFromStorage ?? systemColorScheme;
  const themeProps = colorScheme === "light" ? lightTheme : darkTheme;
  const textStyle = [
    baseTheme,
    {
      ...baseTheme,
      color: themeProps.textColor,
      fontFamily: "sans-serif",
      includeFontPadding: false, // Android only, ignored on web
    },
  ];
  const secondaryTextStyle = [
    textStyle,
    { color: themeProps.secondaryTextColor },
  ];
  const validationErrorTextStyle = [
    textStyle,
    { color: themeProps.validationErrorTextColor },
  ];
  const linkTextStyle = [textStyle, { color: themeProps.linkTextColor }];
  const baseTextInputStyle = [
    textStyle,
    {
      borderColor: themeProps.linkTextColor,
      borderBottomWidth: 1,
      borderTopWidth: 0,
      borderLeftWidth: 0,
      borderRightWidth: 0,
      outline: "none" as const,
      padding: 0,
    },
  ];
  const formFieldContainerStyle = {
    gap: 2,
    paddingHorizontal: 16,
    paddingVertical: 8,
  };
  return {
    ...baseTheme,
    ...themeProps,
    textStyle,
    secondaryTextStyle,
    validationErrorTextStyle,
    linkTextStyle,
    formFieldContainerStyle,
    textInputStyle(value: string) {
      return [
        baseTextInputStyle,
        { color: value ? themeProps.textColor : themeProps.secondaryTextColor },
      ];
    },
  };
}
