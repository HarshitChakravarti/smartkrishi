import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import en from './locales/en.json'
import hi from './locales/hi.json'

const initialLanguage =
  typeof window !== 'undefined'
    ? (window.localStorage.getItem('i18nextLng') || 'hi').split('-')[0]
    : 'hi'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
    },
    supportedLngs: ['en', 'hi'],
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    lng: initialLanguage,
    fallbackLng: ['hi', 'en'],
    detection: {
      order: ['localStorage', 'htmlTag'],
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  })

export default i18n
