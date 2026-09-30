import axios from 'axios';

const NETWORK = 'No se pudo conectar con el servidor. Intente nuevamente.';
const RATE_LIMIT = 'Demasiados intentos. Espere un minuto e intente nuevamente.';

export function getLoginErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) return NETWORK;
    switch (error.response.status) {
      case 401:
        return 'Credenciales inválidas';
      case 403:
        return 'Tu cuenta aún no fue aprobada por un administrador.';
      case 400:
        return 'Datos de inicio de sesión inválidos';
      case 429:
        return RATE_LIMIT;
    }
  }
  return 'No se pudo iniciar sesión. Intente nuevamente.';
}

export function getSignupErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) return NETWORK;
    switch (error.response.status) {
      case 409:
        return 'Ya existe una cuenta con ese correo electrónico.';
      case 400: {
        const msg = (error.response.data as { message?: string | string[] } | undefined)?.message;
        const text = Array.isArray(msg) ? msg.join('. ') : msg;
        return text || 'Los datos ingresados no son válidos.';
      }
      case 429:
        return RATE_LIMIT;
    }
  }
  return 'No se pudo crear la cuenta. Intente nuevamente.';
}
