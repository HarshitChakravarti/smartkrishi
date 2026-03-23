import { useTranslation } from 'react-i18next'

const LANGUAGE_OPTIONS = [
  { value: 'hi', label: 'हिंदी' },
  { value: 'en', label: 'English' },
  { value: 'ta', label: 'தமிழ்' },
  { value: 'te', label: 'తెలుగు' },
  { value: 'gu', label: 'ગુજરાતી' },
]

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()

  const handleChange = (e) => {
    i18n.changeLanguage(e.target.value)
  }

  const currentLang = (i18n.resolvedLanguage || i18n.language || 'hi').split('-')[0]
  const selectedLang = LANGUAGE_OPTIONS.some((option) => option.value === currentLang) ? currentLang : 'hi'

  return (
    <label className="ml-auto flex items-center gap-2 rounded-full border border-white/16 bg-[rgba(255,248,238,0.68)] px-3 py-2 shadow-panel backdrop-blur-md">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-agri-ink-soft">भाषा</span>
      <select
        onChange={handleChange}
        value={selectedLang}
        aria-label="Select language"
        className="bg-transparent text-sm font-semibold text-agri-ink outline-none"
      >
        {LANGUAGE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
