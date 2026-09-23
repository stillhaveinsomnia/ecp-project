// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
const typescriptEslint = require("@typescript-eslint/eslint-plugin");
const typescriptParser = require("@typescript-eslint/parser");
const pluginLingui = require("eslint-plugin-lingui");

module.exports = defineConfig([
  { ignores: ["components/i18n/locales/**/*.js"] },
  expoConfig,
  {
    ignores: ["dist/*"],
    plugins: { "@typescript-eslint": typescriptEslint },
    languageOptions: {
      parser: typescriptParser,
      parserOptions: { project: "./tsconfig.json" },
    },
    rules: {
      "@typescript-eslint/array-type": ["error", { default: "generic" }],
      "@typescript-eslint/no-floating-promises": "error",
      // eslint-config-expo bundles its own copy of eslint-import-resolver-typescript,
      // whose exported interface currently crashes eslint-module-utils ("typescript
      // with invalid interface loaded as resolver") for any rule that resolves
      // imports. Disable those rules until that gets fixed upstream.
      "import/namespace": "off",
      "import/no-unresolved": "off",
      "import/named": "off",
      "import/default": "off",
      "import/no-named-as-default": "off",
      "import/no-named-as-default-member": "off",
      "import/no-cycle": "off",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
    },
  },
  pluginLingui.configs["flat/recommended"],
]);
