module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  transformIgnorePatterns: ['/node_modules/?!@diffx/core'],
  transform: {
    '^.+\.(ts|html)$': 'ts-jest',
    '^.+\.js$': 'babel-jest'
  },
  globals: {
    'ts-jest': {
      isolatedModules: true
    }
  }
};