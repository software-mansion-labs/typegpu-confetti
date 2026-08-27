module.exports = (api) => {
  api.cache(true);
  const workletsPluginOptions = {
    bundleMode: true,
    strictGlobal: true,
    importForwarding: {
      moduleNames: ['typegpu', '@typegpu/noise', 'typegpu-confetti'],
      relativePaths: ['packages/typegpu-confetti/src', 'apps/test-app'],
    },
  };
  return {
    presets: ['babel-preset-expo'],
    plugins: ['unplugin-typegpu/babel', ['react-native-worklets/plugin', workletsPluginOptions]],
  };
};
