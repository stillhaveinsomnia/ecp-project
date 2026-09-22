import { defineConfig } from "@lingui/conf";
import { languages } from "./components/i18n/languages";

export default defineConfig({
  locales: languages,
  sourceLocale: "en",
  catalogs: [
    {
      path: "components/i18n/locales/{locale}/messages",
      include: ["./components"],
    },
  ],
});
