import { type BuildConfig, defineBuildConfig } from 'unbuild';
import typegpu from 'unplugin-typegpu/rollup';

const Config: BuildConfig[] = defineBuildConfig({
  hooks: {
    'rollup:options': (_options, config) => {
      config.plugins.push(typegpu({}));
    },
  },
  failOnWarn: false,
});

export default Config;
