import { useEffect } from "react";
import { Platform } from "react-native";
import { useTheme } from "../Theme";

export function GlobalWebScrollbarStyle() {
  const theme = useTheme();

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const styleId = "ecp-global-scrollbar-style";
    const style =
      (document.getElementById(styleId) as HTMLStyleElement | null) ??
      document.head.appendChild(
        Object.assign(document.createElement("style"), { id: styleId }),
      );
    style.textContent = `
      * {
          scrollbar-color: ${theme.separatorColor} ${theme.backgroundColor};
      }
      *::-webkit-scrollbar {
        width: 10px;
        height: 10px;
      }
      *::-webkit-scrollbar-track {
        background: ${theme.backgroundColor};
      }
      *::-webkit-scrollbar-thumb {
        background-color: ${theme.separatorColor};
        border-radius: 8px;
        border: 2px solid ${theme.backgroundColor};
      }
      *::-webkit-scrollbar-button {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
      }
    `;
  }, [theme.separatorColor, theme.backgroundColor]);

  return null;
}
