import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-sm font-medium text-text-secondary">{label}</label>
        )}
        <input
          ref={ref}
          className={`rounded-lg border border-border-default bg-bg-elevated px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 ${className}`}
          {...props}
        />
      </div>
    );
  }
);
Input.displayName = 'Input';
