// Validacion inline de formularios. Antes cada pagina solo avisaba al
// enviar, asi que el usuario descubria el error despues de rellenar todo.
//
// Marca el campo con aria-invalid y enlaza el mensaje con aria-describedby,
// para que un lector de pantalla anuncie el error al enfocar el campo.

/** Devuelve null si el valor es valido, o el mensaje de error si no lo es. */
export type Validador = (valor: string) => string | null;

interface OpcionesCampo {
  input: HTMLInputElement | HTMLTextAreaElement;
  /** Donde se escribe el mensaje. Debe tener un id para aria-describedby. */
  errorEl: HTMLElement;
  validar: Validador;
  /** Se llama cada vez que cambia el estado, para recalcular el formulario. */
  alCambiar?: () => void;
}

export interface CampoValidado {
  esValido: () => boolean;
}

/**
 * Conecta un campo con su validador.
 *
 * El error no aparece mientras se escribe por primera vez: regañar a alguien
 * por un campo "incompleto" que apenas empezo a llenar es ruido. Se muestra
 * al salir del campo (blur) y, a partir de ahi, se actualiza en vivo.
 */
export function validarCampo({ input, errorEl, validar, alCambiar }: OpcionesCampo): CampoValidado {
  let yaSalio = false;

  if (errorEl.id) input.setAttribute('aria-describedby', errorEl.id);
  errorEl.setAttribute('role', 'alert');

  const aplicar = (mostrar: boolean) => {
    const mensaje = validar(input.value);

    if (mensaje !== null && mostrar) {
      input.classList.add('is-invalid');
      input.setAttribute('aria-invalid', 'true');
      errorEl.textContent = mensaje;
      errorEl.classList.remove('hidden');
    } else {
      input.classList.remove('is-invalid');
      input.removeAttribute('aria-invalid');
      errorEl.classList.add('hidden');
    }
    alCambiar?.();
  };

  input.addEventListener('blur', () => {
    yaSalio = true;
    aplicar(true);
  });
  input.addEventListener('input', () => aplicar(yaSalio));

  // Estado inicial: sin mensaje, pero el formulario ya sabe si falta algo.
  aplicar(false);

  return { esValido: () => validar(input.value) === null };
}

/**
 * Deshabilita un boton mientras cualquiera de los campos sea invalido.
 *
 * Hace falta un coordinador: si cada campo tocara el boton por su cuenta, el
 * ultimo en evaluarse lo habilitaria aunque otro siguiera mal.
 */
export function bloquearHastaValido(boton: HTMLButtonElement, campos: CampoValidado[]): () => void {
  const revisar = () => {
    boton.disabled = campos.some((c) => !c.esValido());
  };
  revisar();
  return revisar;
}

// ─── Validadores reutilizables ────────────────────────────────────────────

export const codigoCuceiValido: Validador = (valor) => {
  const v = valor.trim();
  if (!v) return 'Escribe tu código CUCEI.';
  if (!/^\d+$/.test(v)) return 'El código solo lleva números.';
  if (v.length !== 9) return `El código debe tener 9 dígitos (llevas ${v.length}).`;
  return null;
};

export const semestreValido: Validador = (valor) => {
  const v = valor.trim();
  if (!v) return null; // opcional
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1 || n > 12) return 'El semestre debe estar entre 1 y 12.';
  return null;
};

export const urlValida: Validador = (valor) => {
  const v = valor.trim();
  if (!v) return null; // opcional
  try {
    const u = new URL(v);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return 'La dirección debe empezar con http:// o https://';
    }
    return null;
  } catch {
    return 'No parece una dirección válida. Ej. https://github.com/tu-usuario';
  }
};

/** Cuenta palabras como lo hace el backend: separando por espacios. */
export function contarPalabras(texto: string): number {
  const limpio = texto.trim();
  return limpio ? limpio.split(/\s+/).length : 0;
}

export function maximoPalabras(limite: number, campo: string): Validador {
  return (valor) => {
    const n = contarPalabras(valor);
    if (n > limite) return `${campo} no debe pasar de ${limite} palabras (llevas ${n}).`;
    return null;
  };
}
