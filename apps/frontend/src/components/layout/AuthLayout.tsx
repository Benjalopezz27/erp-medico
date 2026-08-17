import React from 'react';
import { Outlet } from '@tanstack/react-router';
import { HeartPulse } from 'lucide-react';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 sm:p-6">
      {/* Brand Watermark */}
      <div className="mb-6 text-center space-y-2">
        <div className="inline-flex items-center justify-center p-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-600/30">
          <HeartPulse className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          ERP Distribuidora Médica
        </h1>
        <p className="text-xs text-slate-400 font-mono tracking-wider">
          ACCESO AL SISTEMA DE GESTIÓN
        </p>
      </div>

      {/* Auth Card Container */}
      <div className="w-full max-w-md">
        <Outlet />
      </div>

      <div className="mt-8 text-center text-xs text-slate-500">
        © 2026 ERP Distribuidora Médica • Todos los derechos reservados.
      </div>
    </div>
  );
};
