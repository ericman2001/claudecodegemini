import nextJest from 'next/jest.js';

// Point next/jest at the app root so it can load next.config.mjs and .env files
// and wire up the SWC-based transform for TypeScript/JSX.
const createJestConfig = nextJest({ dir: './' });

/** @type {import('jest').Config} */
const config = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};

export default createJestConfig(config);
