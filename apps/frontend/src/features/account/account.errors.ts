import axios from 'axios';

/** Prefers the backend's message for 400s (wrong current password, same password). */
export function getAccountErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) return 'No se pudo conectar con el servidor. Intente nuevamente.';
    if (error.response.status === 429) return 'Demasiados intentos. Espere un minuto.';
    if (error.response.status === 400) {
      const msg = (error.response.data as { message?: string | string[] } | undefined)?.message;
      if (msg === 'Current password is incorrect') return 'La contraseña actual es incorrecta.';
      if (msg === 'No effective changes detected') return 'El nombre no cambió.';
    }
  }
  return fallback;
}
