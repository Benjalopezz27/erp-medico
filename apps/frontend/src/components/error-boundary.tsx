import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Error no controlado en render:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <div
          role="alert"
          className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center"
        >
          <h1 className="text-lg font-semibold text-foreground">Ocurrió un error inesperado</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            Esta sección no pudo mostrarse. Podés intentar recargar la página; si el problema
            persiste, contactá a soporte.
          </p>
          <Button onClick={this.handleReload}>Recargar página</Button>
        </div>
      );
    }

    return this.props.children;
  }
}
