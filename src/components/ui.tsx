import { Loader2 } from 'lucide-react'
import {
  forwardRef,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { cx } from '@/lib/cx'


// ---- Button ----

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const variantClass: Record<Variant, string> = {
  primary:
    'bg-accent text-accent-ink hover:bg-accent-deep active:translate-y-px disabled:hover:bg-accent',
  secondary:
    'bg-paper border border-rule-2 text-ink hover:bg-paper-2 active:translate-y-px disabled:hover:bg-paper',
  ghost: 'text-ink-2 hover:bg-paper-2 active:translate-y-px disabled:hover:bg-transparent',
  danger:
    'border border-rule-2 text-error hover:bg-error-soft active:translate-y-px disabled:hover:bg-transparent',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'sm' | 'md'
  loading?: boolean
  icon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', loading = false, icon, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        'inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-control font-medium transition-[background-color,transform] duration-(--dur-micro) ease-(--ease-out) disabled:cursor-not-allowed disabled:opacity-55',
        size === 'md' ? 'h-11 px-4 text-[0.925rem]' : 'h-9 px-3 text-sm',
        variantClass[variant],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  )
})

// ---- Field wrapper ----

export function Field({
  label,
  htmlFor,
  helper,
  error,
  required,
  children,
  className,
}: {
  label: string
  htmlFor?: string
  helper?: string
  error?: string
  required?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink-2">
        {label}
        {required && (
          <span className="ml-1 text-accent" aria-hidden>
            *
          </span>
        )}
      </label>
      {children}
      <p
        className={cx('min-h-[1lh] text-xs', error ? 'text-error' : 'text-neutral')}
        role={error ? 'alert' : undefined}
      >
        {error ?? helper}
      </p>
    </div>
  )
}

const controlBase =
  'w-full rounded-control border border-rule-2 bg-paper text-ink placeholder:text-neutral transition-[background-color] duration-(--dur-micro) hover:bg-paper-2 focus-visible:outline-offset-1 disabled:cursor-not-allowed disabled:opacity-55 aria-invalid:border-error'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...rest },
  ref,
) {
  return <input ref={ref} className={cx(controlBase, 'h-11 px-3.5 text-[0.95rem]', className)} {...rest} />
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        className={cx(controlBase, 'min-h-28 resize-y px-3.5 py-2.5 text-[0.95rem] leading-relaxed', className)}
        {...rest}
      />
    )
  },
)

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, ...rest },
  ref,
) {
  return <select ref={ref} className={cx(controlBase, 'h-11 px-3 text-[0.95rem]', className)} {...rest} />
})

// ---- Segmented control ----

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T
  onChange: (v: T) => void
  options: Array<{ value: T; label: string }>
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-control border border-rule-2 bg-paper p-0.5">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cx(
              'h-9 rounded-[6px] px-3 text-sm font-medium transition-[background-color,color] duration-(--dur-micro)',
              active ? 'bg-ink text-paper' : 'text-ink-2 hover:bg-paper-2',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

// ---- Badge / Chip ----

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warn' | 'error'

const badgeTone: Record<BadgeTone, string> = {
  neutral: 'bg-paper-2 text-ink-2',
  accent: 'bg-accent-soft text-accent-deep',
  success: 'bg-success-soft text-success',
  warn: 'bg-warn-soft text-warn',
  error: 'bg-error-soft text-error',
}

export function Badge({
  tone = 'neutral',
  children,
  className,
  style,
}: {
  tone?: BadgeTone
  children: ReactNode
  className?: string
  style?: CSSProperties
}) {
  return (
    <span
      style={style}
      className={cx('inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-xs font-medium whitespace-nowrap', badgeTone[tone], className)}
    >
      {children}
    </span>
  )
}

export function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-pill border border-rule px-2 py-0.5 text-xs text-muted whitespace-nowrap">
      #{children}
    </span>
  )
}

// ---- Card / Section ----

export function Card({ children, className, as: Tag = 'div' }: { children: ReactNode; className?: string; as?: 'div' | 'section' | 'article' }) {
  return <Tag className={cx('rounded-card border border-rule bg-paper shadow-card', className)}>{children}</Tag>
}

export function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cx('text-sm font-semibold tracking-wide text-muted', className)}>{children}</h2>
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="rounded-card border border-dashed border-rule-2 px-6 py-14 text-center">
      <p className="text-base font-semibold text-ink">{title}</p>
      {body && <p className="mx-auto mt-1.5 max-w-prose text-sm text-muted">{body}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}
