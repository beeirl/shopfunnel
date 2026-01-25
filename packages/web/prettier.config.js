import baseConfig from '../../prettier.config.js'

/**
 * @type {import("prettier").Config}
 */
export default {
  ...baseConfig,
  plugins: [...baseConfig.plugins, 'prettier-plugin-tailwindcss'],
  tailwindStylesheet: './src/styles/index.css',
}
