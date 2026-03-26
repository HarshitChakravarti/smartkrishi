import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function MinistryNavbar() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const activeLanguage = i18n.resolvedLanguage || i18n.language || 'hi'
  const isHindi = activeLanguage.startsWith('hi')
  const isEnglish = activeLanguage.startsWith('en')

  const switchLanguage = (lang) => {
    i18n.changeLanguage(lang)
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#1a3a2a] green-pattern">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="min-w-0">
          <p className="font-heading truncate text-xl font-bold text-white sm:text-2xl">🌾 SmartKrishi AI</p>
          <p className={[isHindi ? 'text-sm sm:text-[15px]' : 'text-xs sm:text-sm', 'truncate font-medium tracking-wide text-[#d8e4dc]'].join(' ')}>
            {t('navbar.subtitle')}
          </p>
        </div>

        <button
          type="button"
          className="min-h-11 min-w-11 rounded-md border border-white/25 px-3 py-2 text-white md:hidden"
          onClick={() => setMobileOpen((open) => !open)}
          aria-label={t('navbar.toggleMenu')}
        >
          ☰
        </button>

        <div className="hidden items-center gap-3 md:flex">
          <button
            type="button"
            onClick={() => switchLanguage('en')}
            className={[
              'min-h-11 rounded-full border px-4 py-1.5 font-semibold transition duration-200 hover:scale-[1.03]',
              isHindi ? 'text-base' : 'text-sm',
              isEnglish
                ? 'border-white bg-white/10 text-white'
                : 'border-transparent text-[#d7dfd8] hover:border-white/60 hover:text-white',
            ].join(' ')}
          >
            {t('navbar.english')}
          </button>
          <span className="text-[#d7dfd8]">|</span>
          <button
            type="button"
            onClick={() => switchLanguage('hi')}
            className={[
              'min-h-11 rounded-full border px-4 py-1.5 font-semibold transition duration-200 hover:scale-[1.03]',
              isHindi ? 'text-base' : 'text-sm',
              isHindi
                ? 'border-white bg-white/10 text-white'
                : 'border-transparent text-[#d7dfd8] hover:border-white/60 hover:text-white',
            ].join(' ')}
          >
            {t('navbar.hindi')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/predict')}
            className={[
              'min-h-11 rounded-full bg-[#d4a843] px-5 py-2 font-bold text-[#1b2e22] transition duration-200 hover:scale-[1.03] hover:bg-[#e1b95d]',
              isHindi ? 'text-base' : 'text-sm',
            ].join(' ')}
          >
            {t('navbar.startPlanning')}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="border-t border-white/10 px-4 pb-4 md:hidden">
          <div className="flex items-center gap-2 pt-3">
            <button
              type="button"
              onClick={() => switchLanguage('en')}
              className={[
                'min-h-11 rounded-full border px-4 py-1.5 font-semibold',
                isHindi ? 'text-base' : 'text-sm',
                isEnglish
                  ? 'border-white bg-white/10 text-white'
                  : 'border-transparent text-[#d7dfd8]',
              ].join(' ')}
            >
              {t('navbar.english')}
            </button>
            <span className="text-[#d7dfd8]">|</span>
            <button
              type="button"
              onClick={() => switchLanguage('hi')}
              className={[
                'min-h-11 rounded-full border px-4 py-1.5 font-semibold',
                isHindi ? 'text-base' : 'text-sm',
                isHindi
                  ? 'border-white bg-white/10 text-white'
                  : 'border-transparent text-[#d7dfd8]',
              ].join(' ')}
            >
              {t('navbar.hindi')}
            </button>
          </div>
          <button
            type="button"
            onClick={() => navigate('/predict')}
            className={[
              'mt-3 min-h-11 w-full rounded-full bg-[#d4a843] px-5 py-2.5 font-bold text-[#1b2e22]',
              isHindi ? 'text-base' : 'text-sm',
            ].join(' ')}
          >
            {t('navbar.startPlanning')}
          </button>
        </div>
      ) : null}
    </header>
  )
}
