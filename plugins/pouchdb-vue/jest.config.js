module.exports = {
  preset: 'ts-jest',
  globals: {
    'ts-jest': {
      isolatedModules: true
    }
  },
  "globalSetup": "jest-browser/setup",
  "globalTeardown": "jest-browser/teardown",
  "testEnvironment": "jest-browser"
};