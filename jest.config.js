/**
 * Jest configuration.
 *
 * `jest-expo` is the preset Expo itself tests with: it wires the React Native
 * transform, the haste/asset stubs and — importantly — reads `tsconfig.json`
 * and turns its `paths` into `moduleNameMapper`, so `@/schema/question`
 * resolves in tests exactly as it does in Metro. No babel module-resolver
 * plugin is involved.
 *
 * Note: because the generated mapping registers `@/*` before `@/assets/*`,
 * asset imports (a shadowed pattern) should stay relative for now.
 *
 * @type {import('jest').Config}
 */
module.exports = {
  preset: 'jest-expo',
  /** Tests must not leak mocks into each other. */
  clearMocks: true,
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts', '!src/**/*.test.{ts,tsx}'],
};