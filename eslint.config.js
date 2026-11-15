const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  { ignores: ['tests/fixtures/'] },
  js.configs.recommended,
  {
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.webextensions,
        $: 'readonly',
      },
    },
  },
];
