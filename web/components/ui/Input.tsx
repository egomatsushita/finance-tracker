import { forwardRef, type InputHTMLAttributes } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, name, className = '', ...rest }, ref) => {
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
          className={`rounded-lg border border-muted-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand ${className}`}
          {...rest}
        />
        {error && <p className="text-sm text-expense">{error}</p>}
      </div>
    )
  },
)
Input.displayName = 'Input'
