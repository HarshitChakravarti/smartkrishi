import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from '../components/Layout'
import { Card, PrimaryButton, SecondaryButton, StepDots } from '../components/ui'
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
    moisture: 60,
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
    localStorage.setItem('cropRecommendation', JSON.stringify(formData))
    navigate('/results')
  }

  const handleSliderChange = (field, value) => {
    setFormData({ ...formData, [field]: parseFloat(value) })
  }

  const getLevel = (v) => {
    if (v < 60) return t('predict.level.low')
    if (v < 120) return t('predict.level.medium')
    return t('predict.level.high')
  }

  const phLabel = (ph) => {
    if (ph < 6) return t('predict.ph.acidic')
    if (ph <= 7.5) return t('predict.ph.ok')
    return t('predict.ph.alkaline')
  }

  const stepLabel = (() => {
    switch (step) {
      case 0:
        return t('predict.step.farm')
      case 1:
        return t('predict.step.season')
      case 2:
        return t('predict.step.soil')
      case 3:
        return t('predict.step.ph')
      default:
        return ''
    }
  })()

  return (
    <Layout title={t('predict.title')} subtitle={t('predict.subtitle')} showBack>
      <div className="mx-auto max-w-3xl px-4 py-6">
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <Card>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-extrabold text-gray-900">
                  {t('predict.stepLabel')} {step + 1} / {TOTAL_STEPS}
                </div>
                <div className="text-xl sm:text-2xl font-extrabold text-agri-green">{stepLabel}</div>
              </div>
              <StepDots step={step} total={TOTAL_STEPS} />
            </div>
          </Card>

          {step === 0 && (
            <Card>
              <div className="text-2xl sm:text-3xl font-extrabold text-gray-900">{t('predict.farm.title')}</div>
              <div className="mt-2 text-sm sm:text-base font-semibold text-gray-700">{t('predict.farm.helper')}</div>
              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <div className="text-lg font-extrabold text-agri-green">
                    {formData.farmSize.toFixed(1)} {t('predict.farm.unit')}
                  </div>
                  <div className="text-sm font-bold text-gray-700">
                    {formData.farmSize < 2
                      ? t('predict.farm.small')
                      : formData.farmSize < 6
                        ? t('predict.farm.medium')
                        : t('predict.farm.large')}
                  </div>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="20"
                  step="0.5"
                  value={formData.farmSize}
                  onChange={(e) => setFormData({ ...formData, farmSize: parseFloat(e.target.value) })}
                  className="mt-3 w-full h-4 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-agri-light-green"
                />
                <div className="mt-2 flex justify-between text-xs font-semibold text-gray-600">
                  <span>0.5</span>
                  <span>20</span>
                </div>
              </div>
            </Card>
          )}

          {step === 1 && (
            <Card>
              <div className="text-2xl sm:text-3xl font-extrabold text-gray-900">{t('predict.season.title')}</div>
              <div className="mt-4 grid grid-cols-1 gap-3">
                {[
                  { v: 'Kharif', label: t('predict.season.kharif'), icon: '🌧️' },
                  { v: 'Rabi', label: t('predict.season.rabi'), icon: '❄️' },
                  { v: 'Zaid', label: t('predict.season.zaid'), icon: '☀️' },
                ].map((s) => (
                  <button
                    key={s.v}
                    type="button"
                    onClick={() => setFormData({ ...formData, season: s.v })}
                    className={[
                      'w-full rounded-3xl p-5 border text-left font-extrabold text-lg',
                      'active:scale-[0.99] transition',
                      formData.season === s.v
                        ? 'bg-green-100 border-green-300'
                        : 'bg-white border-black/10 hover:bg-agri-muted',
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-agri-muted border border-black/5 flex items-center justify-center text-2xl">
                        {s.icon}
                      </div>
                      <div>{s.label}</div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-6">
                <label className="block text-lg font-extrabold text-gray-900">{t('predict.previous.label')}</label>
                <select
                  value={formData.previousCrop}
                  onChange={(e) => setFormData({ ...formData, previousCrop: e.target.value })}
                  className="mt-2 w-full px-5 py-4 text-lg font-bold border border-black/10 rounded-3xl focus:border-agri-light-green focus:outline-none bg-white"
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
          )}

          {step === 2 && (
            <Card>
              <div className="text-2xl sm:text-3xl font-extrabold text-gray-900">{t('predict.soil.title')}</div>
              <div className="mt-2 text-sm sm:text-base font-semibold text-gray-700">{t('predict.soil.helper')}</div>

              <div className="mt-4 rounded-2xl border border-black/10 bg-agri-muted p-4">
                <div className="text-sm font-extrabold text-agri-ink">Live weather input (from API)</div>
                {weatherLoading ? (
                  <div className="mt-2 text-sm font-semibold text-gray-500">{t('home.weather.loading')}</div>
                ) : weatherError ? (
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <span className="font-semibold text-gray-500">{t('home.weather.unavailable')}</span>
                    <button
                      type="button"
                      onClick={refetchWeather}
                      className="text-xs font-bold text-agri-green underline"
                    >
                      {t('home.weather.retry')}
                    </button>
                  </div>
                ) : (
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm font-extrabold text-agri-ink">
                    <span>🌡️ {Math.round(formData.temperature)}°C</span>
                    <span>💧 {Math.round(formData.humidity)}%</span>
                    <span>🌧️ {formData.rainfall.toFixed(1)}mm</span>
                  </div>
                )}
              </div>

              {[
                { key: 'nitrogen', label: t('predict.soil.n'), icon: '🟩', value: formData.nitrogen },
                { key: 'phosphorus', label: t('predict.soil.p'), icon: '🟦', value: formData.phosphorus },
                { key: 'potassium', label: t('predict.soil.k'), icon: '🟨', value: formData.potassium },
              ].map((f) => (
                <div key={f.key} className="mt-6">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-lg sm:text-xl font-extrabold text-gray-900">
                      <span className="mr-2" aria-hidden="true">{f.icon}</span>
                      {f.label}
                    </div>
                    <div className="text-sm sm:text-base font-extrabold text-agri-green">{getLevel(f.value)}</div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    step="5"
                    value={f.value}
                    onChange={(e) => handleSliderChange(f.key, e.target.value)}
                    className="mt-3 w-full h-4 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-agri-light-green"
                  />
                  <div className="mt-2 flex justify-between text-xs font-semibold text-gray-600">
                    <span>{t('predict.level.low')}</span>
                    <span>{t('predict.level.high')}</span>
                  </div>
                </div>
              ))}
            </Card>
          )}

          {step === 3 && (
            <Card>
              <div className="text-2xl sm:text-3xl font-extrabold text-gray-900">{t('predict.phm.title')}</div>
              <div className="mt-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-lg sm:text-xl font-extrabold text-gray-900">pH</div>
                  <div className="text-sm sm:text-base font-extrabold text-agri-green">{phLabel(formData.ph)}</div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="14"
                  step="0.1"
                  value={formData.ph}
                  onChange={(e) => handleSliderChange('ph', e.target.value)}
                  className="mt-3 w-full h-4 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-agri-light-green"
                />
                <div className="mt-2 flex justify-between text-xs font-semibold text-gray-600">
                  <span>{t('predict.ph.acidic')}</span>
                  <span>{t('predict.ph.alkaline')}</span>
                </div>
              </div>
              <div className="mt-8">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-lg sm:text-xl font-extrabold text-gray-900">{t('predict.moisture.label')}</div>
                  <div className="text-sm sm:text-base font-extrabold text-agri-green">
                    {formData.moisture < 40
                      ? t('predict.level.low')
                      : formData.moisture < 70
                        ? t('predict.level.ok')
                        : t('predict.level.high')}
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={formData.moisture}
                  onChange={(e) => handleSliderChange('moisture', e.target.value)}
                  className="mt-3 w-full h-4 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-agri-light-green"
                />
                <div className="mt-2 flex justify-between text-xs font-semibold text-gray-600">
                  <span>{t('predict.level.low')}</span>
                  <span>{t('predict.level.high')}</span>
                </div>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {step > 0 ? (
              <SecondaryButton onClick={() => setStep((s) => Math.max(0, s - 1))}>← {t('common.back')}</SecondaryButton>
            ) : (
              <SecondaryButton onClick={() => navigate('/')}>🏠 {t('common.home')}</SecondaryButton>
            )}
            {step < TOTAL_STEPS - 1 ? (
              <PrimaryButton onClick={() => setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1))}>
                {t('common.next')} →
              </PrimaryButton>
            ) : (
              <PrimaryButton type="submit">✅ {t('predict.submit')}</PrimaryButton>
            )}
          </div>
        </form>
      </div>
    </Layout>
  )
}
