// Punto de entrada de la funcion serverless en Vercel. La app de Express es
// ya un manejador (req, res), asi que basta con reexportarla.
//
// Es .js a proposito: `npm run build` deja ESM real en dist/, de modo que aqui
// no hay ninguna ambiguedad de compilacion ni de extensiones.
export { default } from '../dist/app.js';
