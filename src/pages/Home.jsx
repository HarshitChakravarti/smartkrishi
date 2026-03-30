import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useWeather } from '../hooks/useWeather'
import MinistryNavbar from '../components/MinistryNavbar'

const IMAGES = {
  howSoil: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&q=80&auto=format',
  howAi: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80&auto=format',
  howHarvest: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800&q=80&auto=format',
  farmerFeature: 'https://images.unsplash.com/photo-1593691509543-c55fb32d8de5?w=900&q=80&auto=format',
  coverage: 'https://images.unsplash.com/photo-1595508064774-5ff825a07340?w=800&q=80&auto=format',
  cta: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=1400&q=80&auto=format',
}

const HERO_SLIDES = [
  {
    image: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=1920&q=80&auto=format',
    alt: 'Indian wheat field at sunrise',
  },
  {
    image: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1920&q=80&auto=format',
    alt: 'Indian farmer harvesting crops',
  },
  {
    image: 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=1920&q=80&auto=format',
    alt: 'Farmer working in green agricultural field',
  },
  {
    image: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=1920&q=80&auto=format',
    alt: 'Harvest-ready crops in farm land',
  },
]

const CROP_FALLBACK_IMAGE = '/images/home/crop-fallback.svg'

function WeatherItem({ icon, label, value }) {
  return (
    <div className="px-3 py-2 text-center sm:text-left">
      <p className="text-xl font-bold text-[#1a2e1a] sm:text-2xl">
        <span className="mr-1">{icon}</span>
        {value}
      </p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">{label}</p>
    </div>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { data: weather, loading: weatherLoading, error: weatherError, refetch: refetchWeather } = useWeather()
  const [heroSlideIndex, setHeroSlideIndex] = useState(0)
  const isHindi = (i18n.resolvedLanguage || i18n.language || 'hi').startsWith('hi')

  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll('.reveal-on-scroll'))
    if (!nodes.length) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.2, rootMargin: '0px 0px -40px 0px' },
    )

    nodes.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setHeroSlideIndex((prev) => (prev + 1) % HERO_SLIDES.length)
    }, 2200)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  const scrollToHowItWorks = () => {
    const target = document.getElementById('how-it-works')
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const handleImageError = (event) => {
    const img = event.currentTarget
    if (img.dataset.fallbackApplied === 'true') return
    img.dataset.fallbackApplied = 'true'
    img.src = CROP_FALLBACK_IMAGE
  }

  const temperature = weather?.temperature != null ? `${Math.round(weather.temperature)}°C` : '--'
  const humidity = weather?.humidity != null ? `${Math.round(weather.humidity)}%` : '--'
  const rainfall = weather?.precipitation != null ? `${Math.round(weather.precipitation)}mm` : '--'
  const rawLocation = weather?.locationLabel?.trim() || ''
  const isGenericLocalLabel = weather?.source === 'local' || rawLocation.toLowerCase() === 'your farm area'
  const location = isGenericLocalLabel ? '' : (rawLocation || t('landing.locationFallback'))

  const howSteps = [
    {
      id: '01',
      image: IMAGES.howSoil,
      title: t('landing.v2.how.step1.title'),
      description: t('landing.v2.how.step1.description'),
      tags: [t('landing.v2.how.step1.tag1'), t('landing.v2.how.step1.tag2'), t('landing.v2.how.step1.tag3')],
    },
    {
      id: '02',
      image: IMAGES.howAi,
      title: t('landing.v2.how.step2.title'),
      description: t('landing.v2.how.step2.description'),
      tags: [t('landing.v2.how.step2.tag1'), t('landing.v2.how.step2.tag2'), t('landing.v2.how.step2.tag3')],
    },
    {
      id: '03',
      image: IMAGES.howHarvest,
      title: t('landing.v2.how.step3.title'),
      description: t('landing.v2.how.step3.description'),
      tags: [t('landing.v2.how.step3.tag1'), t('landing.v2.how.step3.tag2'), t('landing.v2.how.step3.tag3')],
    },
  ]

  const featureItems = [
    { icon: '📡', title: t('landing.v2.features.item1.title'), desc: t('landing.v2.features.item1.desc') },
    { icon: '🌾', title: t('landing.v2.features.item2.title'), desc: t('landing.v2.features.item2.desc') },
    { icon: '🧪', title: t('landing.v2.features.item3.title'), desc: t('landing.v2.features.item3.desc') },
    { icon: '🗺️', title: t('landing.v2.features.item4.title'), desc: t('landing.v2.features.item4.desc') },
    { icon: '🔄', title: t('landing.v2.features.item5.title'), desc: t('landing.v2.features.item5.desc') },
    { icon: '💰', title: t('landing.v2.features.item6.title'), desc: t('landing.v2.features.item6.desc') },
  ]

  const cropShowcase = [
    {
      name: t('landing.v2.crops.rice.name'),
      detail: t('landing.v2.crops.rice.detail'),
      emoji: '🌾',
      image: 'https://images.unsplash.com/photo-1536304993881-460e2c7f76eb?w=400&q=80&auto=format',
    },
    {
      name: t('landing.v2.crops.wheat.name'),
      detail: t('landing.v2.crops.wheat.detail'),
      emoji: '🌿',
      image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&q=80&auto=format',
    },
    {
      name: t('landing.v2.crops.soybean.name'),
      detail: t('landing.v2.crops.soybean.detail'),
      emoji: '🫘',
      image: 'https://images.unsplash.com/photo-1599420186946-7b6fb4e297f0?w=400&q=80&auto=format',
    },
    {
      name: t('landing.v2.crops.mustard.name'),
      detail: t('landing.v2.crops.mustard.detail'),
      emoji: '🌼',
      image: 'https://images.unsplash.com/photo-1457530378978-8bac673b8062?w=400&q=80&auto=format',
    },
    {
      name: t('landing.v2.crops.cotton.name'),
      detail: t('landing.v2.crops.cotton.detail'),
      emoji: '🌱',
      image: 'https://images.unsplash.com/photo-1605272915927-c0b273f2bcf5?w=400&q=80&auto=format',
    },
    {
      name: t('landing.v2.crops.millet.name'),
      detail: t('landing.v2.crops.millet.detail'),
      emoji: '🌾',
      image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=80&auto=format',
    },
    {
      name: t('landing.v2.crops.chickpea.name'),
      detail: t('landing.v2.crops.chickpea.detail'),
      emoji: '🫘',
      image: 'https://images.unsplash.com/photo-1515543904298-4a9aefdacd7c?w=400&q=80&auto=format',
    },
    {
      name: t('landing.v2.crops.maize.name'),
      detail: t('landing.v2.crops.maize.detail'),
      emoji: '🌽',
      image: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=400&q=80&auto=format',
    },
  ]

  const stateCoverage = [
    t('landing.v2.coverage.row1'),
    t('landing.v2.coverage.row2'),
    t('landing.v2.coverage.row3'),
    t('landing.v2.coverage.row4'),
    t('landing.v2.coverage.row5'),
    t('landing.v2.coverage.row6'),
    t('landing.v2.coverage.row7'),
    t('landing.v2.coverage.row8'),
  ]

  return (
    <div className={[isHindi ? 'lang-hi' : '', 'bg-[#faf8f5] text-[#1f2f24]'].join(' ')}>
      <MinistryNavbar />

      <main className="overflow-x-hidden">
        <section className="relative flex min-h-[600px] items-center justify-center px-4 py-16 text-white sm:px-6 lg:h-[85vh] lg:px-8">
          {HERO_SLIDES.map((slide, index) => (
            <div
              key={slide.image}
              role="img"
              aria-label={slide.alt}
              className={[
                'absolute inset-0 bg-cover bg-center transition-opacity duration-[650ms] ease-out will-change-[opacity]',
                index === heroSlideIndex ? 'opacity-100' : 'opacity-0',
              ].join(' ')}
              style={{ backgroundImage: `url('${slide.image}')` }}
            />
          ))}
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(26,46,26,0.75)_0%,rgba(26,46,26,0.60)_50%,rgba(26,46,26,0.80)_100%)]" />

          <div className="relative z-10 mx-auto max-w-5xl text-center">
            <p className="inline-flex items-center rounded-full border border-white/35 bg-white/10 px-4 py-1.5 text-xs font-medium tracking-[0.08em] text-white/90 backdrop-blur-sm">
              {t('landing.v2.hero.badge')}
            </p>

            <h1 className="mt-6 font-heading text-4xl font-bold leading-[1.15] text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)] sm:text-5xl lg:text-6xl">
              {t('landing.v2.hero.titleLine1')}
              <br />
              {t('landing.v2.hero.titleLine2')}
            </h1>

            <p className="mx-auto mt-6 max-w-3xl text-[17px] leading-8 text-white/85 sm:text-[18px]">
              {t('landing.v2.hero.subtitle')}
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-5">
              <button
                type="button"
                onClick={() => navigate('/predict')}
                className="min-h-[56px] rounded-lg bg-[#FF9933] px-9 py-4 text-[17px] font-semibold text-[#1a1a1a] shadow-[0_4px_14px_rgba(255,153,51,0.4)] transition duration-200 hover:scale-[1.03] hover:bg-[#e88a2d]"
              >
                {t('landing.v2.hero.primaryCta')}
              </button>
              <button
                type="button"
                onClick={scrollToHowItWorks}
                className="min-h-[56px] rounded-lg border-2 border-white/55 px-9 py-4 text-[17px] font-semibold text-white transition duration-200 hover:bg-white/10"
              >
                {t('landing.v2.hero.secondaryCta')}
              </button>
            </div>

            <div className="mx-auto mt-12 grid max-w-3xl grid-cols-3 items-center gap-3 rounded-xl border border-white/20 bg-white/5 px-4 py-4 backdrop-blur-[1px] sm:gap-6 sm:px-8">
              <div>
                <p className="text-2xl font-bold text-[#FF9933] sm:text-3xl">{t('landing.v2.hero.stats.cropsValue')}</p>
                <p className="text-xs uppercase tracking-[0.12em] text-white/75">{t('landing.v2.hero.stats.cropsLabel')}</p>
              </div>
              <div className="border-x border-white/20">
                <p className="text-2xl font-bold text-[#FF9933] sm:text-3xl">{t('landing.v2.hero.stats.statesValue')}</p>
                <p className="text-xs uppercase tracking-[0.12em] text-white/75">{t('landing.v2.hero.stats.statesLabel')}</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[#FF9933] sm:text-3xl">{t('landing.v2.hero.stats.weatherValue')}</p>
                <p className="text-xs uppercase tracking-[0.12em] text-white/75">{t('landing.v2.hero.stats.weatherLabel')}</p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-center gap-2" aria-label="Hero image slideshow controls">
              {HERO_SLIDES.map((slide, index) => (
                <button
                  key={slide.alt}
                  type="button"
                  onClick={() => setHeroSlideIndex(index)}
                  aria-label={`Go to hero slide ${index + 1}`}
                  className={[
                    'h-2.5 rounded-full transition-all duration-300',
                    index === heroSlideIndex ? 'w-8 bg-[#FF9933]' : 'w-2.5 bg-white/55 hover:bg-white/80',
                  ].join(' ')}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="reveal-on-scroll border-y border-[#d6e3d2] bg-[#f0f5eb] py-5">
          <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-medium text-[#2d5016]">
              <p>{t('landing.v2.trust.badge1')}</p>
              <p>{t('landing.v2.trust.badge2')}</p>
              <p>{t('landing.v2.trust.badge3')}</p>
              <p>{t('landing.v2.trust.badge4')}</p>
            </div>
            <p className="mt-3 text-xs italic text-[#6b7280]">
              {t('landing.v2.trust.note')}
            </p>
          </div>
        </section>

        <section className="reveal-on-scroll relative z-20 mx-auto -mt-10 max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-[#dfe8dc] bg-white px-5 py-5 shadow-[0_8px_30px_rgba(0,0,0,0.1)] sm:px-8 sm:py-6">
            <p className="text-sm font-semibold text-[#2d5016]">
              📍 {t('landing.v2.weather.areaLabel')}
              {location ? ` • ${location}` : ''}
            </p>

            {weatherError ? (
              <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <p>{t('home.weather.unavailable')}</p>
                <button type="button" onClick={refetchWeather} className="mt-2 rounded-md border border-amber-500 px-3 py-2 font-semibold">
                  {t('home.weather.retry')}
                </button>
              </div>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-4 sm:divide-x sm:divide-[#e8e0d8]">
                <WeatherItem icon="🌡️" label={t('landing.v2.weather.temperature')} value={weatherLoading ? '...' : temperature} />
                <WeatherItem icon="💧" label={t('landing.v2.weather.humidity')} value={weatherLoading ? '...' : humidity} />
                <WeatherItem icon="🌧️" label={t('landing.v2.weather.rainfall')} value={weatherLoading ? '...' : rainfall} />
                <div className="flex items-center justify-center gap-2 px-3 py-2 sm:justify-start">
                  <span className="relative inline-flex h-3 w-3">
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-[#138808]" />
                  </span>
                  <div>
                    <p className="text-lg font-bold text-[#1a2e1a]">{t('landing.v2.weather.live')}</p>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">{t('landing.v2.weather.updatedNow')}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <section id="how-it-works" className="reveal-on-scroll bg-[#faf8f5] px-4 pb-20 pt-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <p className="text-center text-xs font-bold uppercase tracking-[0.22em] text-[#2d5016]">{t('landing.v2.how.eyebrow')}</p>
            <h2 className="mt-3 text-center font-heading text-4xl font-bold text-[#1a2e1a]">{t('landing.v2.how.title')}</h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-[16px] text-[#6b7280]">
              {t('landing.v2.how.subtitle')}
            </p>

            <div className="mt-12 grid gap-8 lg:grid-cols-3">
              {howSteps.map((step, index) => (
                <article
                  key={step.id}
                  className="group relative overflow-hidden rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)]"
                >
                  <img src={step.image} alt={step.title} loading="lazy" className="h-48 w-full object-cover" />
                  <span className="absolute left-5 top-40 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#2d5016] text-sm font-bold text-white">
                    {step.id}
                  </span>

                  <div className="px-6 pb-6 pt-7">
                    <h3 className="text-xl font-bold text-[#1a2e1a]">{step.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-[#4f5f54]">{step.description}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {step.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-[#eef4ee] px-3 py-1 text-xs font-semibold text-[#2d5016]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {index < howSteps.length - 1 ? (
                    <span className="pointer-events-none absolute -right-4 top-1/2 hidden -translate-y-1/2 text-3xl text-[#2d5016]/30 lg:block">→</span>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="reveal-on-scroll bg-white px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <img
                src={IMAGES.farmerFeature}
                alt="Indian farmer in field"
                loading="lazy"
                className="h-[460px] w-full rounded-2xl border-l-4 border-[#2d5016] object-cover"
              />
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#2d5016]">{t('landing.v2.features.eyebrow')}</p>
              <h2 className="mt-3 font-heading text-4xl font-bold text-[#1a2e1a]">{t('landing.v2.features.title')}</h2>
              <p className="mt-4 text-[16px] leading-8 text-[#58675c]">
                {t('landing.v2.features.subtitle')}
              </p>

              <div className="mt-6 divide-y divide-[#e8e0d8]">
                {featureItems.map((item) => (
                  <article key={item.title} className="group py-4 transition-all duration-200 hover:pl-2">
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#dcfce7] text-sm text-[#166534]">
                        {item.icon}
                      </span>
                      <div>
                        <h3 className="text-base font-semibold text-[#1f2f24]">{item.title}</h3>
                        <p className="mt-1 text-sm text-[#6b7280]">{item.desc}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="reveal-on-scroll bg-[#f0f5eb] px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <p className="text-center text-xs font-bold uppercase tracking-[0.22em] text-[#2d5016]">{t('landing.v2.crops.eyebrow')}</p>
            <h2 className="mt-3 text-center font-heading text-4xl font-bold text-[#1a2e1a]">{t('landing.v2.crops.title')}</h2>
            <p className="mt-3 text-center text-[16px] text-[#6b7280]">{t('landing.v2.crops.subtitle')}</p>

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {cropShowcase.map((crop) => (
                <article key={crop.name} className="overflow-hidden rounded-xl bg-white shadow-[0_2px_6px_rgba(0,0,0,0.06)]">
                  <img
                    src={crop.image}
                    alt={crop.name}
                    loading="lazy"
                    onError={handleImageError}
                    className="h-36 w-full object-cover"
                  />
                  <div className="px-4 py-3">
                    <p className="text-base font-semibold text-[#1f2f24]">
                      {crop.emoji} {crop.name}
                    </p>
                    <p className="mt-1 text-xs text-[#6b7280]">{crop.detail}</p>
                  </div>
                </article>
              ))}
            </div>

            <p className="mt-7 text-center text-sm text-[#6b7280]">
              {t('landing.v2.crops.moreNote')}
            </p>
          </div>
        </section>

        <section className="reveal-on-scroll bg-white px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#2d5016]">{t('landing.v2.coverage.eyebrow')}</p>
              <h2 className="mt-3 font-heading text-4xl font-bold text-[#1a2e1a]">{t('landing.v2.coverage.title')}</h2>
              <p className="mt-4 text-[16px] leading-8 text-[#59695e]">
                {t('landing.v2.coverage.subtitle')}
              </p>

              <div className="mt-7 divide-y divide-[#e8e0d8] rounded-xl border border-[#e7ece8] bg-[#fbfdfb] px-5">
                {stateCoverage.map((row) => (
                  <p key={row} className="py-3 text-sm text-[#2f3d34]">
                    <span className="mr-2 text-[#138808]">✅</span>
                    {row}
                  </p>
                ))}
                <p className="py-3 text-sm text-[#7a6528]">
                  <span className="mr-2">⏳</span>
                  {t('landing.v2.coverage.rowMore')}
                </p>
              </div>
            </div>

            <div>
              <img src={IMAGES.coverage} alt="Indian agriculture aerial view" loading="lazy" className="h-[360px] w-full rounded-2xl object-cover" />
              <div className="mt-4 grid grid-cols-3 divide-x divide-[#e8e0d8] rounded-xl border border-[#e7ece8] bg-white">
                <div className="px-3 py-4 text-center">
                  <p className="text-2xl font-bold text-[#1a2e1a]">8+</p>
                  <p className="text-xs uppercase tracking-[0.13em] text-[#6b7280]">{t('landing.v2.coverage.stats.states')}</p>
                </div>
                <div className="px-3 py-4 text-center">
                  <p className="text-2xl font-bold text-[#1a2e1a]">26</p>
                  <p className="text-xs uppercase tracking-[0.13em] text-[#6b7280]">{t('landing.v2.coverage.stats.crops')}</p>
                </div>
                <div className="px-3 py-4 text-center">
                  <p className="text-2xl font-bold text-[#1a2e1a]">2600+</p>
                  <p className="text-xs uppercase tracking-[0.13em] text-[#6b7280]">{t('landing.v2.coverage.stats.samples')}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="reveal-on-scroll bg-[#1a2e1a] px-4 py-16 text-center text-white sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <p className="text-5xl leading-none text-white/60">❝</p>
            <p className="mt-2 font-heading text-2xl italic leading-10 text-white/95 sm:text-3xl">
              {t('landing.v2.testimonial.quote')}
            </p>
            <p className="mt-5 text-sm text-white/70">{t('landing.v2.testimonial.attribution')}</p>
            <p className="mt-2 text-xs text-white/45">{t('landing.v2.testimonial.disclaimer')}</p>
          </div>
        </section>

        <section className="reveal-on-scroll border-t-[3px] border-transparent bg-[linear-gradient(135deg,#f8f4e8,#f0ebe0)] px-4 py-12 sm:px-6 lg:px-8" style={{ borderImage: 'linear-gradient(to right, #FF9933, #FFFFFF, #138808) 1' }}>
          <div className="mx-auto max-w-6xl text-center">
            <p className="text-3xl">☸️</p>
            <h2 className="mt-3 font-heading text-3xl font-bold text-[#1a2e1a]">{t('landing.v2.banner.title')}</h2>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <article className="rounded-xl border border-[#d4c9a8] bg-white px-4 py-5">
                <p className="text-2xl">🌱</p>
                <p className="mt-2 text-[15px] font-semibold text-[#1f2f24]">{t('landing.v2.banner.card1.title')}</p>
                <p className="mt-1 text-xs text-[#6b7280]">{t('landing.v2.banner.card1.subtitle')}</p>
              </article>
              <article className="rounded-xl border border-[#d4c9a8] bg-white px-4 py-5">
                <p className="text-2xl">🔬</p>
                <p className="mt-2 text-[15px] font-semibold text-[#1f2f24]">{t('landing.v2.banner.card2.title')}</p>
                <p className="mt-1 text-xs text-[#6b7280]">{t('landing.v2.banner.card2.subtitle')}</p>
              </article>
              <article className="rounded-xl border border-[#d4c9a8] bg-white px-4 py-5">
                <p className="text-2xl">📱</p>
                <p className="mt-2 text-[15px] font-semibold text-[#1f2f24]">{t('landing.v2.banner.card3.title')}</p>
                <p className="mt-1 text-xs text-[#6b7280]">{t('landing.v2.banner.card3.subtitle')}</p>
              </article>
            </div>

            <p className="mx-auto mt-6 max-w-3xl text-xs leading-6 text-[#8b8b8b]">
              {t('landing.v2.banner.disclaimer')}
            </p>
          </div>
        </section>

        <section className="reveal-on-scroll relative overflow-hidden px-4 py-24 text-center text-white sm:px-6 lg:px-8">
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${IMAGES.cta}')` }} />
          <div className="absolute inset-0 bg-[rgba(26,46,26,0.85)]" />

          <div className="relative z-10 mx-auto max-w-4xl">
            <h2 className="font-heading text-4xl font-bold sm:text-5xl">{t('landing.v2.finalCta.title')}</h2>
            <p className="mt-4 text-[18px] text-white/85">{t('landing.v2.finalCta.subtitle')}</p>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <span className="rounded-full border border-white/35 px-4 py-2 text-sm text-white/90 backdrop-blur-sm">{t('landing.v2.finalCta.usp1')}</span>
              <span className="rounded-full border border-white/35 px-4 py-2 text-sm text-white/90 backdrop-blur-sm">{t('landing.v2.finalCta.usp2')}</span>
              <span className="rounded-full border border-white/35 px-4 py-2 text-sm text-white/90 backdrop-blur-sm">{t('landing.v2.finalCta.usp3')}</span>
            </div>

            <button
              type="button"
              onClick={() => navigate('/predict')}
              className="mt-9 min-h-[58px] rounded-lg bg-[#FF9933] px-12 py-4 text-[18px] font-semibold text-[#1a1a1a] shadow-[0_4px_20px_rgba(255,153,51,0.4)] transition duration-200 hover:scale-[1.03] hover:bg-[#e88a2d]"
            >
              {t('landing.v2.finalCta.button')}
            </button>

            <p className="mt-3 text-sm text-white/55">{t('landing.v2.finalCta.note')}</p>
          </div>
        </section>
      </main>

      <footer className="bg-[#0f2518] text-[#dbe7df]">
        <div className="h-[3px] bg-[linear-gradient(to_right,#FF9933,#FFFFFF,#138808)]" />

        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
          <div>
            <h3 className="font-heading text-2xl font-bold text-white">🌾 SmartKrishi AI</h3>
            <p className="mt-3 text-sm leading-7 text-[#c6d6cd]">
              {t('landing.footer.brandDescription')}
            </p>
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
            <div className="mt-5 flex items-center gap-3 text-xs text-[#c4d4cb]">
              <a href="#" className="transition hover:text-white">{t('landing.v2.footer.socialTwitter')}</a>
              <a href="#" className="transition hover:text-white">{t('landing.v2.footer.socialGithub')}</a>
              <a href="#" className="transition hover:text-white">{t('landing.v2.footer.socialLinkedin')}</a>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 px-4 py-5 text-sm text-[#bfd1c7]">
          <p className="mx-auto max-w-7xl text-center text-xs text-[#aac0b4]">{t('landing.v2.footer.poweredLine')}</p>
          <div className="mx-auto mt-3 flex max-w-7xl flex-col gap-2 text-center sm:px-2 md:flex-row md:items-center md:justify-between md:text-left">
            <p>{t('landing.v2.footer.copyright')}</p>
            <p>{t('landing.v2.footer.madeWith')}</p>
          </div>
          <p className="mx-auto mt-3 max-w-7xl text-xs leading-6 text-[#aac0b4] sm:px-2">
            {t('landing.v2.footer.note')}
          </p>
        </div>
      </footer>

      <button
        type="button"
        onClick={() => navigate('/predict')}
        className="fixed bottom-6 right-6 z-50 rounded-full bg-[#2d5016] px-5 py-3 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(0,0,0,0.15)] transition duration-200 hover:scale-[1.03] hover:bg-[#274714]"
      >
        {t('landing.helpButton')}
      </button>
    </div>
  )
}
