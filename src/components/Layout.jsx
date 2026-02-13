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
    <div className="min-h-screen bg-agri-bg">
      <header className="sticky top-0 z-20 bg-white border-b border-black/5">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center gap-3">
          {showBack && (
            <button
              onClick={() => navigate(-1)}
              className="shrink-0 h-11 w-11 rounded-2xl bg-agri-muted border border-black/5 flex items-center justify-center text-xl font-bold text-agri-green active:scale-[0.98]"
              aria-label={t('back')}
              title={t('back')}
            >
              ←
            </button>
          )}

          <div className="flex items-center gap-2 min-w-0">
            <LeafIcon className="h-7 w-7 shrink-0 text-agri-light-green" />
            <div className="leading-tight min-w-0">
              <div className="text-lg font-extrabold text-agri-green truncate">
                {headerTitle}
              </div>
              {headerSubtitle ? (
                <div className="text-xs text-gray-600 font-semibold truncate">{headerSubtitle}</div>
              ) : null}
            </div>
          </div>

          <LanguageSwitcher />
        </div>
      </header>

      <main>{children}</main>
    </div>
  )
}

