import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function FormField({ label, error, id, ...rest }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-xs font-medium text-[var(--color-text-secondary)]"
      >
        {label}
      </label>
      <input id={id} className="input-base" {...rest} />
      {error && <span className="text-xs text-[var(--color-danger)]">{error}</span>}
    </div>
  );
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  children: ReactNode;
}

export function SelectField({
  label,
  error,
  id,
  children,
  ...rest
}: SelectFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-xs font-medium text-[var(--color-text-secondary)]"
      >
        {label}
      </label>
      <select id={id} className="input-base" {...rest}>
        {children}
      </select>
      {error && <span className="text-xs text-[var(--color-danger)]">{error}</span>}
    </div>
  );
}
