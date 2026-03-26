import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useWeather } from '../hooks/useWeather'
import MinistryNavbar from '../components/MinistryNavbar'

function FarmConditionMetric({ label, value, unit, colorClass }) {
  return (
    <div className="rounded-xl bg-[#faf8f2] px-4 py-3">
      <p className="text-sm font-semibold text-[#4b5b54]">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[#1a3a2a]">
        {value}
        {unit}
      </p>
      <div className={`mt-3 h-1.5 rounded-full ${colorClass}`} />
    </div>
  )
}

function FarmConditionsCard({ weather, weatherLoading, weatherError, refetchWeather, className = '', t }) {
  const temp = weather?.temperature != null ? Math.round(weather.temperature) : '—'
  const humidity = weather?.humidity != null ? Math.round(weather.humidity) : '—'
  const rainfall = weather?.precipitation != null ? Math.round(weather.precipitation) : '—'
  const location = weather?.locationLabel || t('home.weather.localLabel')

  return (
    <div className={`rounded-2xl border border-[#e6dfd0] bg-white p-6 shadow-[0_18px_45px_rgba(26,58,42,0.08)] ${className}`}>
      <h3 className="text-xl font-semibold text-[#1a3a2a]">{t('landing.liveCard.title')}</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <FarmConditionMetric label={t('landing.liveCard.temperature')} value={temp} unit={temp === '—' ? '' : '°C'} colorClass="bg-[#d6802f]" />
        <FarmConditionMetric label={t('landing.liveCard.humidity')} value={humidity} unit={humidity === '—' ? '' : '%'} colorClass="bg-[#3f7f4f]" />
        <FarmConditionMetric label={t('landing.liveCard.rainfall')} value={rainfall} unit={rainfall === '—' ? '' : 'mm'} colorClass="bg-[#2f74c0]" />
      </div>
      <p className="mt-4 text-sm text-[#6b6f69]">
        {weatherLoading ? t('home.weather.loading') : t('landing.liveCard.lastUpdatedLine', { location, time: new Date().toLocaleTimeString() })}
      </p>
      {weatherError ? (
        <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-800">
          <p>{t('home.weather.unavailable')}</p>
          <button type="button" onClick={refetchWeather} className="mt-2 min-h-11 rounded-lg border border-amber-500 px-3 py-2 font-semibold">
            {t('home.weather.retry')}
          </button>
        </div>
      ) : null}
    </div>
  )
}

function FeaturePoint({ text }) {
  return (
    <li className="border-l-4 border-[#d4a843] bg-[#faf8f2] px-4 py-3 text-[16px] text-[#2b3a2f] shadow-sm">
      <span className="mr-2 font-bold text-[#2f7d47]">✓</span>
      <span className="font-semibold">{text}</span>
    </li>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const { data: weather, loading: weatherLoading, error: weatherError, refetch: refetchWeather } = useWeather()
  const { t, i18n } = useTranslation()

  const isHindi = (i18n.resolvedLanguage || i18n.language || 'hi').startsWith('hi')

  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll('.reveal-on-scroll'))
    if (!nodes.length) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
          }
        })
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
    )

    nodes.forEach((node) => observer.observe(node))

    return () => observer.disconnect()
  }, [])

  const features = [
    t('landing.provides.feature1'),
    t('landing.provides.feature2'),
    t('landing.provides.feature3'),
    t('landing.provides.feature4'),
    t('landing.provides.feature5'),
    t('landing.provides.feature6'),
  ]

  return (
    <div className={[isHindi ? 'lang-hi' : '', 'bg-[#faf8f2] text-[#1f2f24]'].join(' ')}>
      <MinistryNavbar />

      <main>
        <section className="reveal-on-scroll bg-[#faf8f2]">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8 lg:py-20">
            <div>
              <h1 className="font-heading text-4xl font-bold leading-tight text-[#1a3a2a] sm:text-5xl lg:text-6xl">
                {t('landing.hero.title')}
              </h1>
              <p className="mt-6 max-w-2xl text-[16px] leading-8 text-[#465248]">{t('landing.hero.subtitle')}</p>
              <div className="mt-8 flex flex-wrap gap-4">
                <button
                  type="button"
                  onClick={() => navigate('/predict')}
                  className="min-h-11 rounded-full bg-[#1a3a2a] px-6 py-3 text-[16px] font-semibold text-white transition duration-200 hover:scale-[1.03] hover:bg-[#24513a]"
                >
                  {t('landing.hero.primaryCta')}
                </button>
                <a
                  href="#how-it-works"
                  className="min-h-11 rounded-full border-2 border-[#1a3a2a] px-6 py-3 text-[16px] font-semibold text-[#1a3a2a] transition duration-200 hover:scale-[1.03] hover:bg-[#edf3ef]"
                >
                  {t('landing.hero.secondaryCta')}
                </a>
              </div>
            </div>
            <FarmConditionsCard
              weather={weather}
              weatherLoading={weatherLoading}
              weatherError={weatherError}
              refetchWeather={refetchWeather}
              t={t}
            />
          </div>
        </section>

        <section className="reveal-on-scroll border-y-2 border-[#d4a843] bg-[#f4e7c4] py-10">
          <div className="mx-auto max-w-6xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="font-heading text-3xl font-bold text-[#1a3a2a]">{t('landing.trust.title')}</h2>
            <div className="mt-5 flex flex-col items-center justify-center gap-3 text-[16px] text-[#2b4a37] md:flex-row md:gap-8">
              <p>✓ {t('landing.trust.point1')}</p>
              <p>✓ {t('landing.trust.point2')}</p>
              <p>✓ {t('landing.trust.point3')}</p>
            </div>
            <div className="mx-auto mt-6 max-w-md rounded-full border border-[#caa34a] bg-white/85 px-5 py-2 text-sm font-semibold text-[#365643] shadow-sm">
              <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#b5c6ba] text-[12px] text-[#1a3a2a]">
                24
              </span>
              {t('landing.trust.badge')}
            </div>
          </div>
        </section>

        <section className="reveal-on-scroll bg-white py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <h2 className="font-heading text-center text-4xl font-bold text-[#1a3a2a]">{t('landing.conditions.title')}</h2>
            <div className="mx-auto mt-10 max-w-4xl">
              <FarmConditionsCard
                weather={weather}
                weatherLoading={weatherLoading}
                weatherError={weatherError}
                refetchWeather={refetchWeather}
                className="p-7 sm:p-9"
                t={t}
              />
            </div>
          </div>
        </section>

        <section id="how-it-works" className="reveal-on-scroll bg-[#faf8f2] py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <h2 className="font-heading text-center text-4xl font-bold text-[#1a3a2a]">{t('landing.how.title')}</h2>
            <div className="mt-12 grid gap-6 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center">
              <div className="rounded-2xl border border-[#dde5df] bg-white px-5 py-6 text-center shadow-sm">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#274734] text-2xl text-white">📋</div>
                <h3 className="mt-4 text-xl font-bold text-[#1a3a2a]">{t('landing.how.step1Title')}</h3>
                <p className="mt-2 text-[16px] text-[#4f5d53]">{t('landing.how.step1Sub')}</p>
              </div>
              <div className="hidden text-center text-3xl text-[#65846e] md:block">→</div>
              <div className="rounded-2xl border border-[#dde5df] bg-white px-5 py-6 text-center shadow-sm">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#274734] text-2xl text-white">🤖</div>
                <h3 className="mt-4 text-xl font-bold text-[#1a3a2a]">{t('landing.how.step2Title')}</h3>
                <p className="mt-2 text-[16px] text-[#4f5d53]">{t('landing.how.step2Sub')}</p>
              </div>
              <div className="text-center text-3xl text-[#65846e] md:hidden">↓</div>
              <div className="hidden text-center text-3xl text-[#65846e] md:block">→</div>
              <div className="rounded-2xl border border-[#dde5df] bg-white px-5 py-6 text-center shadow-sm">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#274734] text-2xl text-white">🌱</div>
                <h3 className="mt-4 text-xl font-bold text-[#1a3a2a]">{t('landing.how.step3Title')}</h3>
                <p className="mt-2 text-[16px] text-[#4f5d53]">{t('landing.how.step3Sub')}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="reveal-on-scroll bg-white py-16">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:items-start lg:px-8">
            <div>
              <h2 className="font-heading text-4xl font-bold text-[#1a3a2a]">{t('landing.provides.title')}</h2>
              <p className="mt-4 text-[16px] leading-8 text-[#4b5a50]">{t('landing.provides.subtitle')}</p>
            </div>
            <ul className="space-y-3">
              {features.map((feature) => (
                <FeaturePoint key={feature} text={feature} />
              ))}
            </ul>
          </div>
        </section>

        <section className="reveal-on-scroll border-t-4 border-[#1a3a2a] bg-[#faf8f2] py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <h2 className="font-heading text-center text-4xl font-bold italic text-[#1a3a2a]">{t('landing.india.title')}</h2>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              <article className="rounded-2xl border border-[#d8dfd9] border-l-4 border-l-[#1a3a2a] bg-white p-6 shadow-sm">
                <h3 className="text-xl font-bold text-[#1a3a2a]">{t('landing.india.card1Title')}</h3>
                <p className="mt-3 text-[16px] leading-7 text-[#4f5f54]">{t('landing.india.card1Body')}</p>
              </article>
              <article className="rounded-2xl border border-[#d8dfd9] border-l-4 border-l-[#1a3a2a] bg-white p-6 shadow-sm">
                <h3 className="text-xl font-bold text-[#1a3a2a]">{t('landing.india.card2Title')}</h3>
                <p className="mt-3 text-[16px] leading-7 text-[#4f5f54]">{t('landing.india.card2Body')}</p>
              </article>
              <article className="rounded-2xl border border-[#d8dfd9] border-l-4 border-l-[#1a3a2a] bg-white p-6 shadow-sm">
                <h3 className="text-xl font-bold text-[#1a3a2a]">{t('landing.india.card3Title')}</h3>
                <p className="mt-3 text-[16px] leading-7 text-[#4f5f54]">{t('landing.india.card3Body')}</p>
              </article>
            </div>
            <p className="mx-auto mt-8 max-w-4xl rounded-xl border border-[#d3d9d3] bg-white px-4 py-3 text-center text-sm font-medium text-[#355240]">
              {t('landing.india.note')}
            </p>
          </div>
        </section>

        <section className="reveal-on-scroll bg-[#1a3a2a] py-16 text-center text-white green-pattern">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <h2 className="font-heading text-4xl font-bold">{t('landing.cta.title')}</h2>
            <p className="mt-4 text-[16px] text-[#d7e3db]">{t('landing.cta.subtitle')}</p>
            <button
              type="button"
              onClick={() => navigate('/predict')}
              className="mt-8 min-h-11 rounded-full bg-[#d4a843] px-9 py-4 text-[16px] font-bold text-[#1a2d22] transition duration-200 hover:scale-[1.03] hover:bg-[#e2bc66]"
            >
              {t('landing.cta.button')}
            </button>
          </div>
        </section>
      </main>

      <footer className="bg-[#0f2518] text-[#dbe7df]">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
          <div>
            <h3 className="font-heading text-2xl font-bold text-white">🌾 SmartKrishi AI</h3>
            <p className="mt-3 text-sm leading-7 text-[#c6d6cd]">{t('landing.footer.brandDescription')}</p>
            <span className="mt-4 inline-flex items-center rounded-full border border-[#587a68] px-3 py-1 text-xs font-semibold text-[#d4e4dc]">
              {t('landing.footer.brandBadge')}
            </span>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-white">{t('landing.footer.aboutTitle')}</h4>
            <ul className="mt-4 space-y-2 text-sm">
              <li><a href="#" className="transition hover:text-white">{t('landing.footer.aboutMission')}</a></li>
              <li><a href="#how-it-works" className="transition hover:text-white">{t('landing.footer.aboutHow')}</a></li>
              <li><a href="#" className="transition hover:text-white">{t('landing.footer.aboutTeam')}</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-white">{t('landing.footer.supportTitle')}</h4>
            <ul className="mt-4 space-y-2 text-sm">
              <li><a href="#" className="transition hover:text-white">{t('landing.footer.supportContact')}</a></li>
              <li><a href="#" className="transition hover:text-white">{t('landing.footer.supportFaq')}</a></li>
              <li><a href="#" className="transition hover:text-white">{t('landing.footer.supportDocs')}</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-white">{t('landing.footer.legalTitle')}</h4>
            <ul className="mt-4 space-y-2 text-sm">
              <li><a href="#" className="transition hover:text-white">{t('landing.footer.legalPrivacy')}</a></li>
              <li><a href="#" className="transition hover:text-white">{t('landing.footer.legalTerms')}</a></li>
              <li><a href="#" className="transition hover:text-white">{t('landing.footer.legalDisclaimer')}</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 px-4 py-5 text-sm text-[#bfd1c7]">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 text-center sm:px-2 md:flex-row md:items-center md:justify-between md:text-left">
            <p>{t('landing.footer.copyright')}</p>
            <p>{t('landing.footer.madeWith')}</p>
          </div>
          <p className="mx-auto mt-3 max-w-7xl text-xs leading-6 text-[#aac0b4] sm:px-2">{t('landing.footer.note')}</p>
        </div>
      </footer>

      <button
        type="button"
        className="fixed bottom-5 right-4 z-40 min-h-11 rounded-full bg-[#1a3a2a] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(8,32,20,0.28)] transition duration-200 hover:scale-[1.03] hover:bg-[#214a35]"
      >
        {t('landing.helpButton')}
      </button>
    </div>
  )
}
