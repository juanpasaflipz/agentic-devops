import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'tools/**/*.test.ts'],
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'dist/**',
        'scripts/**',
        'tools/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/*.config.*',
        '**/.eslintrc.*',
        'src/orchestrator.ts',
        'src/agents/**',
        'src/runtime/db.ts',
        'src/runtime/policy.ts',
        'src/runtime/queue.ts',
        'src/runtime/llm.ts',
      ],
      thresholds: {
        lines: 30,
        functions: 30,
        statements: 30,
        branches: 20,
      },
    },
  },
});
