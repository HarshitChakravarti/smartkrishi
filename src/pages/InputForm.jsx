import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from '../components/Layout'
import {
  Badge,
  Card,
  MetricTile,
  PrimaryButton,
  SecondaryButton,
  SectionHeading,
  SkeletonBlock,
  StepDots,
  StepPill,
} from '../components/ui'
import { useWeather } from '../hooks/useWeather'

const TOTAL_STEPS = 4

export default function InputForm() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { data: weather, loading: weatherLoading, error: weatherError, refetch: refetchWeather } = useWeather()

  const [formData, setFormData] = useState({
    farmSize: 2,
    season: 'Kharif',
    previousCrop: 'Rice',
    nitrogen: 90,
    phosphorus: 40,
    potassium: 35,
    ph: 6.5,
    temperature: 26,
    humidity: 65,
    rainfall: 2,
  })
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!weather) return

    setFormData((prev) => ({
      ...prev,
      temperature: weather.temperature ?? prev.temperature,
      humidity: weather.humidity ?? prev.humidity,
      rainfall: weather.precipitation ?? prev.rainfall,
    }))
  }, [weather])

  const handleSubmit = (e) => {
    e.preventDefault()
    window.localStorage.setItem('cropRecommendation', JSON.stringify(formData))
    navigate('/results')
  }

  const handleSliderChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: parseFloat(value) }))
  }

  const getLevel = (value) => {
    if (value < 60) return t('predict.level.low')
    if (value < 120) return t('predict.level.medium')
    return t('predict.level.high')
  }

  const getPhLabel = (value) => {
    if (value < 6) return t('predict.ph.acidic')
    if (value <= 7.5) return t('predict.ph.ok')
    return t('predict.ph.alkaline')
  }

  const steps = [
    t('predict.step.farm'),
    t('predict.step.season'),
    t('predict.step.soil'),
    t('predict.step.review'),
  ]

  return (
    <Layout title={t('predict.title')} subtitle={t('predict.subtitle')} showBack>
      <div className="space-y-4">
        <Card className="panel-grid">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-agri-ink-soft">
                {t('predict.assistantLabel')}
              </div>
              <h1 className="mt-2 text-2xl font-extrabold text-agri-ink sm:text-3xl">{t('predict.title')}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-agri-ink-soft sm:text-base">{t('predict.subtitle')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="success">{t('home.trust.basedOn')}</Badge>
              <Badge tone="wheat">{t('predict.assistantNote')}</Badge>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-agri-ink-soft">
                {t('predict.stepLabel')}
              </div>
              <div className="mt-1 text-lg font-extrabold text-agri-ink">
                {step + 1} / {TOTAL_STEPS} • {steps[step]}
              </div>
            </div>
            <StepDots step={step} total={TOTAL_STEPS} />
          </div>

          <div className="mt-4 overflow-x-auto">
            <div className="flex gap-2 pb-1">
              {steps.map((label, index) => (
                <StepPill
                  key={label}
                  index={index}
                  label={label}
                  active={step === index}
                  done={step > index}
                  onClick={() => setStep(index)}
                />
              ))}
            </div>
          </div>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-4">
          {step === 0 ? (
            <Card className="animate-rise-in space-y-5">
              <SectionHeading
                eyebrow={t('predict.step.farm')}
                title={t('predict.farm.title')}
                description={t('predict.farm.helper')}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <MetricTile
                  label={t('predict.farm.title')}
                  value={`${formData.farmSize.toFixed(1)} ${t('predict.farm.unit')}`}
                  caption={
                    formData.farmSize < 2
                      ? t('predict.farm.small')
                      : formData.farmSize < 6
                        ? t('predict.farm.medium')
                        : t('predict.farm.large')
                  }
                  tone="success"
                />
                <MetricTile
                  label={t('predict.review.weatherCard')}
                  value={`${Math.round(formData.temperature)}°C`}
                  caption={`${Math.round(formData.humidity)}% • ${formData.rainfall.toFixed(1)} mm`}
                  tone="wheat"
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-base font-semibold text-agri-ink">{t('predict.farm.range')}</div>
                  <div className="text-sm font-semibold text-agri-ink-soft">0.5 - 20 {t('predict.farm.unit')}</div>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="20"
                  step="0.5"
                  value={formData.farmSize}
                  onChange={(e) => handleSliderChange('farmSize', e.target.value)}
                  className="mt-3 h-3 w-full cursor-pointer appearance-none rounded-full bg-agri-muted accent-agri-green"
                />
              </div>
            </Card>
          ) : null}

          {step === 1 ? (
            <Card className="animate-rise-in space-y-5">
              <SectionHeading
                eyebrow={t('predict.step.season')}
                title={t('predict.season.title')}
                description={t('predict.season.helper')}
              />

              <div className="grid gap-3 md:grid-cols-3">
                {[
                  { value: 'Kharif', key: 'predict.season.kharif', icon: '🌧️' },
                  { value: 'Rabi', key: 'predict.season.rabi', icon: '❄️' },
                  { value: 'Zaid', key: 'predict.season.zaid', icon: '☀️' },
                ].map((season) => {
                  const active = formData.season === season.value

                  return (
                    <button
                      key={season.value}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, season: season.value }))}
                      className={[
                        'rounded-3xl border px-4 py-4 text-left transition',
                        active
                          ? 'border-agri-green bg-agri-green-soft'
                          : 'border-agri-border bg-agri-card hover:bg-agri-muted',
                      ].join(' ')}
                    >
                      <div className="text-xl">{season.icon}</div>
                      <div className="mt-3 text-lg font-extrabold text-agri-ink">{t(season.key)}</div>
                    </button>
                  )
                })}
              </div>

              <div>
                <label className="block text-sm font-semibold text-agri-ink">{t('predict.previous.label')}</label>
                <select
                  value={formData.previousCrop}
                  onChange={(e) => setFormData((prev) => ({ ...prev, previousCrop: e.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-agri-border bg-agri-card px-4 py-3 text-base font-semibold text-agri-ink outline-none"
                >
                  <option value="Rice">{t('predict.previous.rice')}</option>
                  <option value="Wheat">{t('predict.previous.wheat')}</option>
                  <option value="Cotton">{t('predict.previous.cotton')}</option>
                  <option value="Sugarcane">{t('predict.previous.sugarcane')}</option>
                  <option value="Maize">{t('predict.previous.maize')}</option>
                  <option value="None">{t('predict.previous.none')}</option>
                </select>
              </div>
            </Card>
          ) : null}

          {step === 2 ? (
            <Card className="animate-rise-in space-y-5">
              <SectionHeading
                eyebrow={t('predict.step.soil')}
                title={t('predict.soil.title')}
                description={t('predict.soil.helper')}
              />

              <div className="rounded-3xl border border-agri-border bg-agri-muted p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-agri-ink-soft">
                      {t('predict.soil.liveWeather')}
                    </div>
                    <div className="mt-1 text-base font-extrabold text-agri-ink">
                      {weather?.locationLabel || t('home.weather.localLabel')}
                    </div>
                  </div>
                  {weather?.source === 'local' ? <Badge tone="success">{t('home.weather.sourceLocal')}</Badge> : <Badge tone="wheat">{t('home.weather.sourceFallback')}</Badge>}
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  {weatherLoading ? (
                    <>
                      <SkeletonBlock className="h-20" />
                      <SkeletonBlock className="h-20" />
                      <SkeletonBlock className="h-20" />
                    </>
                  ) : weatherError ? (
                    <div className="col-span-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
                      <div className="font-semibold">{t('home.weather.unavailable')}</div>
                      <button type="button" onClick={refetchWeather} className="mt-2 font-semibold underline">
                        {t('home.weather.retry')}
                      </button>
                    </div>
                  ) : (
                    <>
                      <MetricTile label={t('home.weather.temp')} value={`${Math.round(formData.temperature)}°C`} caption={t('home.today')} tone="success" />
                      <MetricTile label={t('home.weather.humidity')} value={`${Math.round(formData.humidity)}%`} caption={t('home.weather.humidityHint')} />
                      <MetricTile label={t('home.weather.rain')} value={`${formData.rainfall.toFixed(1)} mm`} caption={t('home.weather.rainHint')} tone="wheat" />
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { key: 'nitrogen', label: t('predict.soil.n'), value: formData.nitrogen, tone: 'success' },
                  { key: 'phosphorus', label: t('predict.soil.p'), value: formData.phosphorus, tone: 'wheat' },
                  { key: 'potassium', label: t('predict.soil.k'), value: formData.potassium, tone: 'soil' },
                ].map((field) => (
                  <div key={field.key} className="rounded-3xl border border-agri-border bg-agri-card p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-base font-semibold text-agri-ink">{field.label}</div>
                      <Badge tone={field.tone}>{getLevel(field.value)}</Badge>
                    </div>
                    <div className="mt-3 text-2xl font-extrabold text-agri-ink">{field.value}</div>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      step="5"
                      value={field.value}
                      onChange={(e) => handleSliderChange(field.key, e.target.value)}
                      className="mt-3 h-3 w-full cursor-pointer appearance-none rounded-full bg-agri-muted accent-agri-green"
                    />
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {step === 3 ? (
            <Card className="animate-rise-in space-y-5">
              <SectionHeading
                eyebrow={t('predict.step.review')}
                title={t('predict.review.title')}
                description={t('predict.review.subtitle')}
              />

              <div className="rounded-3xl border border-agri-border bg-agri-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-base font-semibold text-agri-ink">pH</div>
                  <Badge tone="soil">{getPhLabel(formData.ph)}</Badge>
                </div>
                <div className="mt-3 text-2xl font-extrabold text-agri-ink">{formData.ph.toFixed(1)}</div>
                <input
                  type="range"
                  min="0"
                  max="14"
                  step="0.1"
                  value={formData.ph}
                  onChange={(e) => handleSliderChange('ph', e.target.value)}
                  className="mt-3 h-3 w-full cursor-pointer appearance-none rounded-full bg-agri-muted accent-agri-green"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <MetricTile
                  label={t('predict.farm.title')}
                  value={`${formData.farmSize.toFixed(1)} ${t('predict.farm.unit')}`}
                  caption={t(`predict.season.${formData.season.toLowerCase()}`)}
                  tone="success"
                />
                <MetricTile
                  label={t('predict.previous.label')}
                  value={t(`predict.previous.${formData.previousCrop.toLowerCase()}`)}
                  caption={`pH ${formData.ph.toFixed(1)}`}
                  tone="soil"
                />
                <MetricTile
                  label={t('home.weather.temp')}
                  value={`${Math.round(formData.temperature)}°C`}
                  caption={`${Math.round(formData.humidity)}% ${t('home.weather.humidity').toLowerCase()}`}
                  tone="wheat"
                />
                <MetricTile
                  label={t('home.weather.rain')}
                  value={`${formData.rainfall.toFixed(1)} mm`}
                  caption={t('predict.review.finalCheck')}
                  tone="neutral"
                />
              </div>

              <div className="rounded-2xl bg-agri-muted px-4 py-3 text-sm leading-6 text-agri-ink-soft">
                {t('predict.review.note')}
              </div>
            </Card>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            {step > 0 ? (
              <SecondaryButton onClick={() => setStep((value) => Math.max(0, value - 1))} className="w-full">
                {t('common.back')}
              </SecondaryButton>
            ) : (
              <SecondaryButton onClick={() => navigate('/')} className="w-full">
                {t('common.home')}
              </SecondaryButton>
            )}

            {step < TOTAL_STEPS - 1 ? (
              <PrimaryButton onClick={() => setStep((value) => Math.min(TOTAL_STEPS - 1, value + 1))} className="w-full">
                {t('common.next')}
              </PrimaryButton>
            ) : (
              <PrimaryButton type="submit" className="w-full">
                {t('predict.submit')}
              </PrimaryButton>
            )}
          </div>
        </form>
      </div>
    </Layout>
  )
}
