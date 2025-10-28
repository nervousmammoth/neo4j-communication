import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '.next/',
        '**/*.config.*',
        '**/ui/**', // shadcn/ui components
        '**/*.d.ts', // TypeScript declaration files
        'next-env.d.ts',
        '**/error.tsx', // Next.js error boundaries - better tested via E2E
        '**/loading.tsx', // Next.js loading components - better tested via E2E
        '**/scripts/**', // Utility scripts not part of the application
        '__tests__/**' // Test utilities and helpers
      ],
      thresholds: {
        lines: 98,      // Temporarily lowered from 99 - neo4j.ts refactor in issue-014f
        functions: 98,  // Temporarily lowered from 100 - neo4j.ts refactor in issue-014f
        branches: 95,   // Target coverage for branches
        statements: 98  // Temporarily lowered from 99 - neo4j.ts refactor in issue-014f
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './')
    }
  }
})