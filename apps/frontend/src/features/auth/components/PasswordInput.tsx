import * as React from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { Input, type InputProps } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export type PasswordInputProps = Omit<InputProps, 'type'>;

/** Dark auth-form password field with lock icon and show/hide toggle (shared by login and signup). */
export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);
    return (
      <div className="relative">
        <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" aria-hidden="true" />
        <Input
          ref={ref}
          type={visible ? 'text' : 'password'}
          className={cn(
            'pl-9 pr-10 bg-slate-900 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-blue-500',
            className,
          )}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Ocultar clave' : 'Mostrar clave'}
          aria-pressed={visible}
          className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
        >
          {visible ? (
            <EyeOff className="w-4 h-4" aria-hidden="true" />
          ) : (
            <Eye className="w-4 h-4" aria-hidden="true" />
          )}
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = 'PasswordInput';
