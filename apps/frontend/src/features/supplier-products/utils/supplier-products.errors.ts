import axios from 'axios';

export interface ParsedSupplierProductApiError {
  message: string;
  fieldErrors?: Record<string, string>;
  isConflict?: boolean;
}

export function parseSupplierProductApiError(error: unknown): ParsedSupplierProductApiError {
  if (axios.isAxiosError(error) && error.response) {
    const status = error.response.status;
    const data = error.response.data;

    if (status === 409) {
      return {
        message:
          typeof data?.message === 'string'
            ? data.message
            : 'Conflicto: Ya existe un registro con estos datos.',
        isConflict: true,
      };
    }

    if (status === 400) {
      if (Array.isArray(data?.message)) {
        return {
          message: data.message.join('. '),
        };
      }
      if (typeof data?.message === 'string') {
        return {
          message: data.message,
        };
      }
    }

    if (status === 404) {
      return {
        message:
          typeof data?.message === 'string'
            ? data.message
            : 'El recurso solicitado no fue encontrado.',
      };
    }

    if (status === 403) {
      return {
        message: 'No tienes permisos de administrador para realizar esta acción.',
      };
    }

    if (typeof data?.message === 'string') {
      return {
        message: data.message,
      };
    }
  }

  return {
    message: 'Ocurrió un error inesperado al procesar el catálogo del proveedor.',
  };
}
