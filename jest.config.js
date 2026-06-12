/**
 * Jest configuration using next/jest, which wires up Next.js's SWC compiler
 * so the suite can import both CommonJS lib code and ESM route handlers.
 */
const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

module.exports = createJestConfig({
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: ['lib/**/*.js', 'app/api/**/*.js']
});
