import React from 'react';
import { Activity, CheckCircle2, Layers, Server, ShieldCheck, Database } from 'lucide-react';

export const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-800">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-sm border border-slate-200 p-8 space-y-6">
        <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <Activity className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              ERP Distribuidora Médica
            </h1>
            <p className="text-sm text-slate-500">
              Frontend Application Scaffold — Sprint 0 (S0-T07)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-start space-x-3 p-4 rounded-lg bg-slate-50 border border-slate-100">
            <Layers className="w-5 h-5 text-blue-500 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900">React 19 + Vite</h3>
              <p className="text-xs text-slate-500">Modern single-page application bundling</p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-4 rounded-lg bg-slate-50 border border-slate-100">
            <ShieldCheck className="w-5 h-5 text-emerald-500 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900">TanStack Router & Query</h3>
              <p className="text-xs text-slate-500">Type-safe routing & server-state management</p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-4 rounded-lg bg-slate-50 border border-slate-100">
            <Server className="w-5 h-5 text-indigo-500 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Tailwind & shadcn/ui</h3>
              <p className="text-xs text-slate-500">Accessible design system & tokens</p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-4 rounded-lg bg-slate-50 border border-slate-100">
            <Database className="w-5 h-5 text-amber-500 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Backend Integration</h3>
              <p className="text-xs text-slate-500">NestJS API & PostgreSQL 16 ready</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-sm">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>Frontend environment scaffolded and ready for App Shell (S0-T08).</span>
          </div>
          <span className="font-mono text-xs bg-emerald-100 text-emerald-900 px-2.5 py-1 rounded-md font-medium">
            v0.1.0
          </span>
        </div>
      </div>
    </div>
  );
};

export default App;
