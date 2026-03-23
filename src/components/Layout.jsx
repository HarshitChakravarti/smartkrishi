import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from './LanguageSwitcher'

function LeafIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M20 4C12 4 4 9.5 4 17c0 1.657 1.343 3 3 3 7.5 0 13-8 13-16Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M9 19c0-6 6-10 11-12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default function Layout({ children, title, subtitle, showBack = false }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const headerTitle = title != null ? title : t('title')
  const headerSubtitle = subtitle != null ? subtitle : null

  return (
    <div className="relative min-h-screen overflow-hidden text-agri-ink">
      <div className="fixed inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/hero-farm.png')" }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(21,31,18,0.58),rgba(29,40,23,0.44)_18%,rgba(44,53,34,0.3)_40%,rgba(245,238,226,0.48)_72%,rgba(245,239,228,0.68)_100%)]" aria-hidden="true" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,245,220,0.24),transparent_28%)]" aria-hidden="true" />
      </div>

      <div className="relative z-10 min-h-screen">
        <header className="sticky top-0 z-20 border-b border-white/15 bg-[rgba(246,239,228,0.22)] backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
            {showBack && (
              <button
                onClick={() => navigate(-1)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/18 bg-[rgba(255,248,238,0.68)] text-xl font-bold text-agri-green shadow-panel transition active:scale-[0.98]"
                aria-label={t('back')}
                title={t('back')}
              >
                ←
              </button>
            )}

            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/18 bg-[rgba(255,248,238,0.72)] shadow-panel">
                <LeafIcon className="h-7 w-7 text-agri-green" />
              </div>
              <div className="min-w-0 leading-tight">
                <div className="truncate text-lg font-extrabold text-agri-green">
                  {headerTitle}
                </div>
                <div className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-agri-ink-soft">
                  {t('layout.platform')}
                </div>
                {headerSubtitle ? (
                  <div className="truncate text-xs font-medium text-agri-ink-soft">{headerSubtitle}</div>
                ) : null}
              </div>
            </div>

            <LanguageSwitcher />
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-4 pb-10 sm:px-6 sm:py-6">{children}</main>
      </div>
    </div>
  )
}
