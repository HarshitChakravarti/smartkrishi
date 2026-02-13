function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

export function Card({ children, className }) {
  return (
    <div
      className={cn(
        'bg-agri-card rounded-2xl border border-black/10 shadow-sm',
        'p-4 sm:p-5',
        className
      )}
    >
      {children}
    </div>
  )
}

export function BigActionButton({
  to,
  onClick,
  icon,
  title,
  subtitle,
  color = 'green',
}) {
  const base =
    'w-full text-left rounded-3xl p-4 sm:p-5 bg-white/95 shadow-[0_10px_30px_rgba(0,0,0,0.12)]' +
    ' flex items-center gap-3 sm:gap-4 transition-transform hover:-translate-y-0.5 active:scale-[0.99]'

  const iconBg =
    color === 'yellow'
      ? 'bg-amber-400'
      : color === 'blue'
      ? 'bg-sky-500'
      : 'bg-agri-light-green'

  const iconRing =
    color === 'yellow'
      ? 'ring-amber-300'
      : color === 'blue'
      ? 'ring-sky-300'
      : 'ring-emerald-300'

  const Comp = to ? 'a' : 'button'
  const props = to ? { href: to } : { onClick, type: 'button' }

  return (
    <Comp className={base} {...props}>
      <div
        className={cn(
          'h-12 w-12 sm:h-14 sm:w-14 rounded-2xl flex items-center justify-center text-2xl text-white',
          iconBg,
          'ring-4',
          iconRing
        )}
      >
        <span aria-hidden="true">{icon}</span>
      </div>
      <div className="min-w-0">
        <div className="text-base sm:text-lg font-semibold text-gray-500 uppercase tracking-wide">
          {subtitle}
        </div>
        <div className="mt-1 text-xl sm:text-2xl font-extrabold text-gray-900">
          {title}
        </div>
      </div>
    </Comp>
  )
}

export function PrimaryButton({ children, onClick, type = 'button', disabled }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full rounded-2xl py-5 px-6 text-xl sm:text-2xl font-extrabold',
        'bg-agri-light-green text-white shadow-sm',
        'hover:bg-agri-green transition active:scale-[0.99]',
        'disabled:opacity-50 disabled:cursor-not-allowed'
      )}
    >
      {children}
    </button>
  )
}

export function SecondaryButton({ children, onClick, type = 'button' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={cn(
        'w-full rounded-2xl py-5 px-6 text-xl sm:text-2xl font-extrabold',
        'bg-agri-card text-agri-ink border border-black/10 shadow-sm',
        'hover:bg-agri-muted transition active:scale-[0.99]'
      )}
    >
      {children}
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
            'h-2.5 w-2.5 rounded-full',
            idx === step ? 'bg-agri-light-green' : 'bg-black/15'
          )}
        />
      ))}
    </div>
  )
}
