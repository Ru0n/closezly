// Test setup file
import 'dotenv/config'

// Mock environment variables for testing
process.env.GEMINI_API_KEY = 'test-api-key'
process.env.NODE_ENV = 'test'
process.env.LOG_LEVEL = 'ERROR' // Reduce noise in tests

// Mock console methods to reduce test output noise
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}

// Global test timeout
jest.setTimeout(30000)
