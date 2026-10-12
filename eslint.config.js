import globals from "globals";

// Only catch names that are not defined anywhere. The tests miss some code
// paths, and refactors that move code between modules can leave a stray
// reference behind. Formatting is Prettier's job.
export default [
  { ignores: ["dist/**", "node_modules/**"] },
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.browser },
    },
    rules: { "no-undef": "error" },
  },
  {
    files: ["tests/**", "scripts/**", "*.config.js"],
    languageOptions: { globals: { ...globals.node } },
  },
];
