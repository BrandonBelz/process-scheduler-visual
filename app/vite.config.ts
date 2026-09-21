import react from '@vitejs/plugin-react'
import { coverageConfigDefaults, defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/process-scheduler-visual/',
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      thresholds: {
        lines: 90,
        functions: 80,
        branches: 85,
        statements: 90,
      },
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        ...coverageConfigDefaults.exclude,
        // Type declarations
        '**/*.d.ts',
        'src/**/types/**',
        'src/**/types.ts',
        // Test utilities and test files
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/**/__tests__/**',
        'src/**/__mocks__/**',
        'src/**/test/**',
        'src/**/test-utils/**',
        'src/**/setupTests.{ts,tsx}',
        // Entry files and application shell
        'src/main.tsx',
        'src/index.{ts,tsx}',
        'src/App.tsx',
      ],
    },
  },
})

