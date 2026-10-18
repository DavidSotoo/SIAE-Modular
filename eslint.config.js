// Configuracion plana de ESLint 9+ compartida por backend y frontend.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', 'stitch_*/**', 'frontend/public/**'],
  },

  js.configs.recommended,
  // Reglas sin informacion de tipos: mucho mas rapidas y suficientes para lo
  // que buscamos aqui. Si mas adelante hace falta detectar promesas sin
  // await, se puede pasar a recommendedTypeChecked.
  ...tseslint.configs.recommended,

  // ─── Backend (Node) ───────────────────────────────────────────────────
  {
    files: ['backend/**/*.ts'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // ─── Frontend (navegador) ─────────────────────────────────────────────
  {
    files: ['frontend/**/*.ts'],
    languageOptions: {
      globals: { ...globals.browser },
    },
  },

  // ─── Ajustes comunes ──────────────────────────────────────────────────
  {
    files: ['**/*.ts'],
    rules: {
      // Los parametros que Express exige por firma (como `next` en el
      // manejador de errores) se marcan con _ y no deben dar error.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
      // `any` es deuda real, pero hay 36 usos heredados: se avisa sin
      // romper el build hasta que se limpien.
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'prefer-const': 'error',
      // Se desactiva porque marca como inutil el ultimo `idx++` de los
      // constructores de consultas SQL, donde el contador se incrementa a
      // proposito para que siga siendo correcto al agregar otro filtro.
      'no-useless-assignment': 'off',
    },
  },

  // En las pruebas conviene poder usar console para depurar.
  {
    files: ['backend/tests/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
);
