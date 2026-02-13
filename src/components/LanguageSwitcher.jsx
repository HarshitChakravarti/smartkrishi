import { useTranslation } from 'react-i18next'

const SUPPORTED_LANGS = ['en', 'hi', 'ta', 'te', 'gu']

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()

  const handleChange = (e) => {
    i18n.changeLanguage(e.target.value)
  }

  const currentLang = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0]
  const selectedLang = SUPPORTED_LANGS.includes(currentLang) ? currentLang : 'en'

  return (
    <select
      onChange={handleChange}
      value={selectedLang}
      className="shrink-0 rounded-2xl border border-black/10 bg-agri-muted px-3 py-2 text-sm font-semibold text-gray-800"
    >
      <option value="en">English</option>
      <option value="hi">हिंदी</option>
      <option value="ta">தமிழ்</option>
      <option value="te">తెలుగు</option>
      <option value="gu">ગુજરાતી</option>
    </select>
  )
}
