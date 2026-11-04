import type { InputHTMLAttributes, Ref } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
  ref?: Ref<HTMLInputElement>
}

export function Input({ label, error, id, name, className = '', ref, ...rest }: InputProps) {
  const inputId = id ?? name ?? label.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-sm font-medium text-ink">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        name={name}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className={`rounded-lg border border-muted-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand ${className}`}
        {...rest}
      />
      {error && (
        <p id={`${inputId}-error`} role="alert" className="text-sm text-expense">
          {error}
        </p>
      )}
    </div>
  )
}
