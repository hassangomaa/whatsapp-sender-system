module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  roots: ['<rootDir>/src', '<rootDir>/../../packages/contracts/src'],
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  forceExit: true,
  moduleNameMapper: {
    '^@whatsapp-sender/database$': '<rootDir>/../../packages/database/dist/src/index.js',
    '^@whatsapp-sender/contracts$': '<rootDir>/../../packages/contracts/dist/index.js',
  },
};
