module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      "@lingui/babel-plugin-lingui-macro", // must be first
    ],
    env: { test: { plugins: ["babel-plugin-dynamic-import-node"] } },
  };
};
