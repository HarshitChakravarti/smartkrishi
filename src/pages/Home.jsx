import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from '../components/Layout'
import {
  Badge,
  Card,
  FeatureCard,
  MetricTile,
  PrimaryButton,
  SectionHeading,
  SkeletonBlock,
} from '../components/ui'
import { useWeather } from '../hooks/useWeather'

function CropIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 20c0-7 0-12 5-16 1 7-1 12-5 16Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 20c0-6-3-10-8-12 0 6 3 10 8 12Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 5v15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function GuideIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M7 5.5A3.5 3.5 0 0 1 10.5 2H19v17h-8.5A3.5 3.5 0 0 0 7 22V5.5Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M7 22H5V6.5A3.5 3.5 0 0 1 8.5 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M11 7h5M11 11h5M11 15h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function ScanIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M8 4H6a2 2 0 0 0-2 2v2M16 4h2a2 2 0 0 1 2 2v2M8 20H6a2 2 0 0 1-2-2v-2M16 20h2a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 8c2.2 0 4 1.8 4 4s-1.8 4-4 4a4 4 0 1 1 0-8Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 10v4M10 12h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function WeatherIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M8 18h8a4 4 0 1 0-.8-7.92A5.5 5.5 0 0 0 5 12.5 3.5 3.5 0 0 0 8 18Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 20.5 7.8 22M13 20.5 11.8 22M17 20.5 15.8 22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function SoilIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M4 16c2.5-1.8 5-2.7 8-2.7S17.5 14.2 20 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M6.5 18.5c1.8-.9 3.7-1.3 5.5-1.3s3.7.4 5.5 1.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 4v7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9 7.5c1.2-1.7 2.1-2.7 3-3.5 1 1 1.8 2 3 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function AlertIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 3 21 19H3L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 9v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function TipIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 3a6 6 0 0 0-3.9 10.56c.82.7 1.4 1.66 1.63 2.71h4.54c.23-1.05.81-2.01 1.63-2.71A6 6 0 0 0 12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9.5 18h5M10 21h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function readStorage(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function getSoilSummary(lastInput, t) {
  if (!lastInput) {
    return {
      headline: t('home.soil.missingTitle'),
      detail: t('home.soil.missing'),
      tone: 'soil',
      metrics: [
        { label: 'pH', value: '--', caption: t('home.soil.capture') },
        { label: 'NPK', value: '--', caption: t('home.soil.capture') },
      ],
    }
  }

  const ph = Number(lastInput.ph)
  const avgNpk = (Number(lastInput.nitrogen) + Number(lastInput.phosphorus) + Number(lastInput.potassium)) / 3

  let headline = t('home.soil.ready')
  let detail = t('home.soil.summary.stable')
  let tone = 'success'

  if (ph < 5.8 || ph > 7.8 || avgNpk < 50) {
    headline = t('home.soil.watchTitle')
    detail = t('home.soil.summary.watch')
    tone = 'soil'
  } else if (avgNpk > 95) {
    detail = t('home.soil.summary.strong')
  }

  return {
    headline,
    detail,
    tone,
    metrics: [
      {
        label: 'pH',
        value: ph.toFixed(1),
        caption: ph >= 6 && ph <= 7.5 ? t('home.soil.phGood') : t('home.soil.phWatch'),
      },
      {
        label: 'NPK',
        value: Math.round(avgNpk).toString(),
        caption: avgNpk >= 70 ? t('home.soil.npkReady') : t('home.soil.npkWatch'),
      },
    ],
  }
}

function buildAlerts(weather, t) {
  if (!weather) return [{ title: t('home.alerts.noneTitle'), body: t('home.alerts.noneBody') }]
  if (Number(weather.precipitation) >= 8) {
    return [{ title: t('home.alerts.rainTitle'), body: t('home.alerts.rainBody') }]
  }
  if (Number(weather.humidity) >= 80) {
    return [{ title: t('home.alerts.humidityTitle'), body: t('home.alerts.humidityBody') }]
  }
  return [{ title: t('home.alerts.clearTitle'), body: t('home.alerts.clearBody') }]
}

function buildTips(lastInput, t) {
  const season = String(lastInput?.season || '').toLowerCase()
  if (season === 'kharif') {
    return [t('home.tips.kharif1'), t('home.tips.kharif2'), t('home.tips.common')]
  }
  if (season === 'rabi') {
    return [t('home.tips.rabi1'), t('home.tips.rabi2'), t('home.tips.common')]
  }
  return [t('home.tips.default1'), t('home.tips.default2'), t('home.tips.common')]
}

function formatSavedAt(timestamp, language) {
  if (!timestamp) return ''
  try {
    const locale = language === 'hi' ? 'hi-IN' : 'en-IN'
    return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(new Date(timestamp))
  } catch {
    return timestamp
  }
}

export default function Home() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { data: weather, loading: weatherLoading, error: weatherError, refetch: refetchWeather } = useWeather()
  const [recentHistory, setRecentHistory] = useState([])
  const [lastInput, setLastInput] = useState(null)

  useEffect(() => {
    setRecentHistory(readStorage('smartkrishiHistory', []))
    setLastInput(readStorage('cropRecommendation', null))
  }, [])

  const soilSummary = getSoilSummary(lastInput, t)
  const alerts = buildAlerts(weather, t)
  const tips = buildTips(lastInput, t)
  const aiConfidence = recentHistory[0]?.confidence || 87
  const hasLatestAssessment = Boolean(lastInput)

  return (
    <Layout>
      <div className="space-y-4">
        <section className="grid gap-4 lg:grid-cols-[1.5fr,1fr]">
          <Card className="panel-grid overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-agri-ink-soft">
                  {t('home.greetingLabel')}
                </div>
                <h1 className="mt-2 font-display text-3xl font-bold text-agri-ink sm:text-4xl">
                  {t('home.greeting')}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-agri-ink-soft sm:text-base">
                  {t('home.subtitle')}
                </p>
              </div>
              <Badge tone="success">{t('home.platformStatus')}</Badge>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Badge tone="success">{t('home.trust.confidence', { value: aiConfidence })}</Badge>
              <Badge tone="wheat">{t('home.trust.basedOn')}</Badge>
              <Badge tone="soil">{t('home.trust.support')}</Badge>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <MetricTile
                label={t('home.snapshot.recommendation')}
                value={recentHistory[0]?.crop || t('home.snapshot.pending')}
                caption={recentHistory[0]?.reason || t('home.snapshot.pendingCaption')}
                tone="success"
              />
              <MetricTile
                label={t('home.snapshot.fieldReadiness')}
                value={soilSummary.headline}
                caption={soilSummary.detail}
                tone={soilSummary.tone}
              />
            </div>
          </Card>

          <Card>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-agri-ink-soft">
                  {t('home.weather.title')}
                </div>
                <div className="mt-1 text-lg font-extrabold text-agri-ink">{weather?.locationLabel || t('home.weather.localLabel')}</div>
                <div className="mt-1 text-sm text-agri-ink-soft">
                  {weather?.source === 'local' ? t('home.weather.sourceLocal') : t('home.weather.sourceFallback')}
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-agri-green-soft text-agri-green-deep">
                <WeatherIcon className="h-6 w-6" />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              {weatherLoading ? (
                <>
                  <SkeletonBlock className="h-24" />
                  <SkeletonBlock className="h-24" />
                  <SkeletonBlock className="h-24" />
                </>
              ) : weatherError ? (
                <div className="col-span-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
                  <div className="font-semibold">{t('home.weather.unavailable')}</div>
                  <button type="button" onClick={refetchWeather} className="mt-2 text-sm font-semibold underline">
                    {t('home.weather.retry')}
                  </button>
                </div>
              ) : (
                <>
                  <MetricTile label={t('home.weather.temp')} value={`${Math.round(weather?.temperature ?? 0)}°C`} caption={t('home.today')} tone="success" />
                  <MetricTile label={t('home.weather.humidity')} value={`${Math.round(weather?.humidity ?? 0)}%`} caption={t('home.weather.humidityHint')} />
                  <MetricTile label={t('home.weather.rain')} value={`${Number(weather?.precipitation ?? 0).toFixed(1)} mm`} caption={t('home.weather.rainHint')} tone="wheat" />
                </>
              )}
            </div>
          </Card>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Card>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-agri-ink-soft">{t('home.soil.title')}</div>
                <div className="mt-1 text-lg font-extrabold text-agri-ink">{soilSummary.headline}</div>
                <div className="mt-1 text-sm text-agri-ink-soft">{soilSummary.detail}</div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-agri-soil-soft text-agri-soil">
                <SoilIcon className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {soilSummary.metrics.map((metric) => (
                <MetricTile
                  key={metric.label}
                  label={metric.label}
                  value={metric.value}
                  caption={metric.caption}
                  tone={soilSummary.tone}
                />
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-agri-ink-soft">{t('home.alerts.title')}</div>
                <div className="mt-1 text-lg font-extrabold text-agri-ink">{alerts[0].title}</div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                <AlertIcon className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {alerts.map((alert) => (
                <div key={alert.title} className="rounded-2xl bg-agri-muted px-4 py-3 text-sm leading-6 text-agri-ink-soft">
                  {alert.body}
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-agri-ink-soft">{t('home.tips.title')}</div>
                <div className="mt-1 text-lg font-extrabold text-agri-ink">{t('home.tips.subtitle')}</div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-agri-green-soft text-agri-green-deep">
                <TipIcon className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {tips.map((tip) => (
                <div key={tip} className="rounded-2xl bg-agri-muted px-4 py-3 text-sm leading-6 text-agri-ink-soft">
                  {tip}
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section className="space-y-4">
          <SectionHeading
            eyebrow={t('home.features.eyebrow')}
            title={t('home.features.title')}
            description={t('home.features.description')}
          />
          <div className="grid gap-4 md:grid-cols-3">
            <FeatureCard
              icon={<CropIcon className="h-6 w-6" />}
              title={t('home.feature.crop.title')}
              description={t('home.feature.crop.description')}
              status={t('home.feature.crop.status')}
              meta={`${t('home.trust.confidence', { value: aiConfidence })} • ${t('home.trust.basedOn')}`}
              ctaLabel={t('common.start')}
              onClick={() => navigate('/predict')}
              accent="green"
            />
            <FeatureCard
              icon={<GuideIcon className="h-6 w-6" />}
              title={t('home.feature.guidance.title')}
              description={t('home.feature.guidance.description')}
              status={hasLatestAssessment ? t('home.feature.guidance.statusReady') : t('home.feature.guidance.statusNew')}
              meta={
                hasLatestAssessment
                  ? `${t('home.feature.guidance.latest')}: ${recentHistory[0]?.crop || t('home.snapshot.pending')}`
                  : t('home.feature.guidance.meta')
              }
              ctaLabel={hasLatestAssessment ? t('common.open') : t('common.start')}
              onClick={() => navigate(hasLatestAssessment ? '/results' : '/predict')}
              accent="wheat"
            />
            <FeatureCard
              icon={<ScanIcon className="h-6 w-6" />}
              title={t('home.feature.disease.title')}
              description={t('home.feature.disease.description')}
              status={t('home.feature.disease.status')}
              meta={t('home.feature.disease.meta')}
              ctaLabel={t('common.checkNow')}
              onClick={() => navigate('/disease')}
              accent="soil"
            />
          </div>
        </section>

        <section className="space-y-4">
          <SectionHeading
            eyebrow={t('home.recent.eyebrow')}
            title={t('home.recent.title')}
            description={t('home.recent.description')}
          />

          {recentHistory.length ? (
            <div className="space-y-3">
              {recentHistory.slice(0, 3).map((entry) => (
                <Card key={`${entry.generatedAt}-${entry.crop}`} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-lg font-extrabold text-agri-ink">{entry.crop}</div>
                      <Badge tone="success">{t('home.trust.confidence', { value: entry.confidence })}</Badge>
                    </div>
                    <div className="mt-1 text-sm text-agri-ink-soft">{entry.reason}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium text-agri-ink-soft">
                      {t('home.recent.savedAt', { date: formatSavedAt(entry.generatedAt, i18n.resolvedLanguage || 'hi') })}
                    </div>
                    {entry.yieldRange ? <Badge tone="wheat">{entry.yieldRange}</Badge> : null}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="text-center">
              <div className="text-lg font-extrabold text-agri-ink">{t('home.recent.emptyTitle')}</div>
              <div className="mt-2 text-sm leading-6 text-agri-ink-soft">{t('home.recent.emptyBody')}</div>
              <div className="mt-4">
                <PrimaryButton onClick={() => navigate('/predict')}>{t('common.start')}</PrimaryButton>
              </div>
            </Card>
          )}
        </section>

        <p className="text-xs leading-6 text-agri-ink-soft">{t('home.trust.disclaimer')}</p>
      </div>
    </Layout>
  )
}
