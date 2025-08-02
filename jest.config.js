module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  transform: {
    '^.+\.(ts|tsx)$': 'ts-jest',
    '^.+\.(js|jsx)$': 'babel-jest',
  },
  // mime 라이브러리가 ESM으로 작성되어 있어, jest가 변환할 수 있도록 ignore 목록에서 제외합니다.
  transformIgnorePatterns: [
    '/node_modules/(?!mime)',
  ],
  moduleNameMapper: {
    '\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
};