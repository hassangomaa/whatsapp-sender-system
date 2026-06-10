module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@whatsapp-sender/database$': '<rootDir>/../../../packages/database/dist/src/index.js',
    '^@whatsapp-sender/contracts$': '<rootDir>/../../../packages/contracts/dist/index.js',
  },
};
