'use client'

import { ChevronDown } from 'lucide-react'
import { useEffect, useId, useRef, useState, type KeyboardEvent, type Ref } from 'react'
import { createPortal } from 'react-dom'

type SelectOption = { value: string; label: string }

type SelectProps = {
  label: string
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  error?: string
  disabled?: boolean
  id?: string
  name?: string
  className?: string
  ref?: Ref<HTMLButtonElement>
}

export function Select({
  label,
  options,
  value,
  onChange,
  onBlur,
  error,
  disabled,
  id,
  name,
  className = '',
  ref,
}: SelectProps) {
  const generatedId = useId()
  const selectId = id ?? name ?? generatedId
  const listboxId = `${selectId}-listbox`
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [listboxRect, setListboxRect] = useState<{ top: number; left: number; width: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listboxRef = useRef<HTMLUListElement>(null)

  const selectedOption = options.find((option) => option.value === value)
  const selectedIndex = options.findIndex((option) => option.value === value)

  useEffect(() => {
    if (!isOpen) return

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      if (!containerRef.current?.contains(target) && !listboxRef.current?.contains(target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    function updatePosition() {
      const rect = buttonRef.current?.getBoundingClientRect()
      if (!rect) return
      setListboxRect({ top: rect.bottom, left: rect.left, width: rect.width })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [isOpen])

  function open() {
    if (disabled) return
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0)
    setIsOpen(true)
  }

  function close() {
    setIsOpen(false)
  }

  function selectOption(option: SelectOption) {
    onChange(option.value)
    close()
    buttonRef.current?.focus()
  }

  function handleButtonKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return

    if (!isOpen) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
        event.preventDefault()
        open()
      }
      return
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, options.length - 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, 0))
        break
      case 'Enter':
      case ' ': {
        event.preventDefault()
        const option = options[activeIndex]
        if (option) selectOption(option)
        break
      }
      case 'Escape':
        event.preventDefault()
        close()
        break
      case 'Home':
        event.preventDefault()
        setActiveIndex(0)
        break
      case 'End':
        event.preventDefault()
        setActiveIndex(options.length - 1)
        break
    }
  }

  return (
    <div className="flex flex-col gap-1" ref={containerRef}>
      <label htmlFor={selectId} className="text-sm font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        <button
          type="button"
          id={selectId}
          name={name}
          ref={(node) => {
            buttonRef.current = node
            if (typeof ref === 'function') ref(node)
            else if (ref) ref.current = node
          }}
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-invalid={!!error}
          aria-describedby={error ? `${selectId}-error` : undefined}
          disabled={disabled}
          onClick={() => (isOpen ? close() : open())}
          onBlur={() => onBlur?.()}
          onKeyDown={handleButtonKeyDown}
          className={`flex w-full cursor-pointer items-center justify-between rounded-lg border border-muted-border bg-surface py-2 pl-3 pr-8 text-left text-base text-ink outline-none focus:border-brand disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
        >
          <span className="truncate">{selectedOption?.label ?? ''}</span>
        </button>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-text"
        />
        {isOpen &&
          listboxRect &&
          createPortal(
            <ul
              ref={listboxRef}
              role="listbox"
              id={listboxId}
              aria-labelledby={selectId}
              tabIndex={-1}
              style={{ top: listboxRect.top, left: listboxRect.left, width: listboxRect.width }}
              className="fixed z-50 mt-1 max-h-60 overflow-auto rounded-lg border border-muted-border bg-surface py-1 text-base shadow-md"
            >
              {options.map((option, index) => (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={option.value === value}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => selectOption(option)}
                  className={`cursor-pointer px-3 py-2 text-ink ${index === activeIndex ? 'bg-brand/10' : ''}`}
                >
                  {option.label}
                </li>
              ))}
            </ul>,
            document.body,
          )}
      </div>
      {error && (
        <p id={`${selectId}-error`} role="alert" className="text-sm text-expense">
          {error}
        </p>
      )}
    </div>
  )
}
