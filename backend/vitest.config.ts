import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Las suites comparten la base de datos y encadenan estados del motor
    // (borrador -> pendiente -> validado -> registrado), asi que no pueden
    // correr en paralelo entre archivos ni dentro de un archivo.
    fileParallelism: false,
    sequence: { concurrent: false },
    hookTimeout: 30000,
    testTimeout: 30000,
  },
});
