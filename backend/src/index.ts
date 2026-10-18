// Punto de arranque. La app vive en app.ts para que las pruebas puedan
// montarla con supertest sin abrir un puerto.
import app from './app.js';

const PORT = parseInt(process.env.PORT ?? '4000', 10);
app.listen(PORT, () => {
  console.log(`SIAE-Modular backend corriendo en http://localhost:${PORT}`);
});

export default app;
