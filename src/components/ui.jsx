import { useState } from 'react'

export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

export function Card({ children, className }) {
  return (
    <div
      className={cn(
        'rounded-3xl border border-white/16 bg-[rgba(255,248,238,0.78)] p-4 shadow-panel backdrop-blur-xl sm:p-5',
        className
      )}
    >
      {children}
    </div>
  )
}

export function SectionHeading({ eyebrow, title, description, action }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow ? (
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-agri-ink-soft">{eyebrow}</div>
        ) : null}
        <h2 className="mt-1 text-xl font-extrabold text-agri-ink sm:text-2xl">{title}</h2>
        {description ? <p className="mt-1 text-sm text-agri-ink-soft">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}

export function Badge({ children, tone = 'neutral', className }) {
  const toneClasses = {
    neutral: 'border-white/16 bg-[rgba(255,248,238,0.62)] text-agri-ink',
    success: 'border-white/18 bg-[rgba(228,234,217,0.78)] text-agri-green-deep',
    soil: 'border-white/18 bg-[rgba(238,224,207,0.8)] text-agri-soil',
    wheat: 'border-white/18 bg-[rgba(244,232,195,0.82)] text-agri-soil',
    alert: 'border-white/16 bg-[rgba(252,238,208,0.85)] text-amber-800',
    danger: 'border-white/16 bg-[rgba(255,237,233,0.86)] text-rose-700',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold',
        toneClasses[tone] || toneClasses.neutral,
        className
      )}
    >
      {children}
    </span>
  )
}

export function MetricTile({ label, value, caption, tone = 'neutral', className }) {
  const toneClasses = {
    neutral: 'bg-[rgba(242,234,219,0.72)]',
    success: 'bg-[rgba(228,234,217,0.82)]',
    soil: 'bg-[rgba(238,224,207,0.84)]',
    wheat: 'bg-[rgba(244,232,195,0.86)]',
  }

  return (
    <div className={cn('rounded-2xl p-4 shadow-inset', toneClasses[tone] || toneClasses.neutral, className)}>
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-agri-ink-soft">{label}</div>
      <div className="mt-2 text-2xl font-extrabold text-agri-ink">{value}</div>
      {caption ? <div className="mt-1 text-sm text-agri-ink-soft">{caption}</div> : null}
    </div>
  )
}

export function FeatureCard({
  icon,
  title,
  description,
  status,
  meta,
  ctaLabel,
  onClick,
  accent = 'green',
}) {
  const accentClasses = {
    green: 'bg-[rgba(228,234,217,0.82)] text-agri-green-deep',
    wheat: 'bg-[rgba(244,232,195,0.86)] text-agri-soil',
    soil: 'bg-[rgba(238,224,207,0.84)] text-agri-soil',
  }

  return (
    <Card className="flex h-full flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className={cn('flex h-12 w-12 items-center justify-center rounded-2xl', accentClasses[accent] || accentClasses.green)}>
          {icon}
        </div>
        {status ? <Badge tone={accent === 'wheat' ? 'wheat' : accent === 'soil' ? 'soil' : 'success'}>{status}</Badge> : null}
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-extrabold text-agri-ink">{title}</h3>
        <p className="text-sm leading-6 text-agri-ink-soft">{description}</p>
      </div>

      {meta ? <div className="rounded-2xl bg-[rgba(242,234,219,0.72)] px-3 py-2 text-sm font-medium text-agri-ink-soft">{meta}</div> : null}

      <div className="mt-auto">
        <PrimaryButton onClick={onClick} className="w-full justify-center">
          {ctaLabel}
        </PrimaryButton>
      </div>
    </Card>
  )
}

export function PrimaryButton({ children, onClick, type = 'button', disabled, className }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition sm:text-base',
        'border border-white/10 bg-agri-green text-white shadow-panel hover:bg-agri-green-deep active:scale-[0.99]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
    >
      {children}
    </button>
  )
}

export function SecondaryButton({ children, onClick, type = 'button', className }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center rounded-2xl border border-white/16 bg-[rgba(255,248,238,0.68)] px-4 py-3 text-sm font-semibold text-agri-ink shadow-panel backdrop-blur-md transition hover:bg-[rgba(255,248,238,0.82)] active:scale-[0.99] sm:text-base',
        className
      )}
    >
      {children}
    </button>
  )
}

export function StepPill({ index, label, active, done, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'min-w-[110px] rounded-2xl border px-3 py-3 text-left transition',
        active
          ? 'border-white/16 bg-[rgba(228,234,217,0.82)]'
          : done
            ? 'border-white/16 bg-[rgba(244,232,195,0.82)]'
            : 'border-white/16 bg-[rgba(255,248,238,0.68)] hover:bg-[rgba(255,248,238,0.8)]'
      )}
    >
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-agri-ink-soft">
        {String(index + 1).padStart(2, '0')}
      </div>
      <div className="mt-1 text-sm font-semibold text-agri-ink">{label}</div>
    </button>
  )
}

export function StepDots({ step, total }) {
  return (
    <div className="flex items-center gap-2" aria-label="Steps">
      {Array.from({ length: total }).map((_, idx) => (
        <span
          key={idx}
          className={cn(
            'h-2.5 w-2.5 rounded-full transition',
            idx === step ? 'bg-agri-green' : idx < step ? 'bg-agri-wheat' : 'bg-agri-border'
          )}
        />
      ))}
    </div>
  )
}

export function SkeletonBlock({ className }) {
  return <div className={cn('skeleton-shimmer animate-pulse rounded-2xl bg-[rgba(255,248,238,0.48)] backdrop-blur-md', className)} aria-hidden="true" />
}

export function AccordionSection({ title, summary, icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="overflow-hidden rounded-3xl border border-white/16 bg-[rgba(255,248,238,0.78)] shadow-panel backdrop-blur-xl">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left sm:px-5"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[rgba(228,234,217,0.82)] text-agri-green-deep">
            {icon}
          </div>
          <div className="min-w-0">
            <div className="text-base font-extrabold text-agri-ink">{title}</div>
            {summary ? <div className="text-sm text-agri-ink-soft">{summary}</div> : null}
          </div>
        </div>
        <span className="text-xl font-bold text-agri-green">{open ? '−' : '+'}</span>
      </button>
      {open ? <div className="border-t border-white/16 px-4 py-4 sm:px-5">{children}</div> : null}
    </div>
  )
}
