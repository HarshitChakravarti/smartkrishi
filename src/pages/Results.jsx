import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from '../components/Layout'
import { Card, PrimaryButton, SecondaryButton } from '../components/ui'
import { fetchCropRecommendation } from '../lib/cropApi'
import { buildAdvisory } from '../lib/advisory'

export default function Results() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [recommendation, setRecommendation] = useState(null)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let isActive = true

    async function runPrediction() {
      const storedData = localStorage.getItem('cropRecommendation')
      const formData = storedData ? JSON.parse(storedData) : null

      if (!formData) {
        navigate('/predict')
        return
      }

      setRecommendation(null)
      setError('')

      try {
        const apiResult = await fetchCropRecommendation(formData, 5)
        const advisory = buildAdvisory(formData, apiResult)
        if (isActive) setRecommendation(advisory)
      } catch (err) {
        if (isActive) {
          setError(err instanceof Error ? err.message : 'Unable to get recommendation')
        }
      }
    }

    runPrediction()
    return () => {
      isActive = false
    }
  }, [navigate, reloadKey])

  if (error && !recommendation) {
    return (
      <Layout title={t('results.title')} subtitle={t('results.subtitle')} showBack>
        <div className="mx-auto max-w-3xl px-4 py-6 space-y-4">
          <Card>
            <div className="text-xl font-extrabold text-red-600">Recommendation service error</div>
            <div className="mt-2 text-base font-semibold text-gray-800">{error}</div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SecondaryButton onClick={() => navigate('/predict')}>← {t('common.back')}</SecondaryButton>
              <PrimaryButton onClick={() => setReloadKey((k) => k + 1)}>Retry</PrimaryButton>
            </div>
          </Card>
        </div>
      </Layout>
    )
  }

  if (!recommendation) {
    return (
      <Layout title={t('results.title')} subtitle={t('results.subtitle')} showBack>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-2xl text-agri-green font-extrabold">{t('results.loading')}</div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title={t('results.title')} subtitle={t('results.subtitle')} showBack>
      <div className="mx-auto max-w-3xl px-4 py-6 space-y-4">
        <Card className="bg-green-50">
          <div className="text-sm font-extrabold text-gray-800">{t('results.bestCrop.label')}</div>
          <div className="mt-2 text-4xl sm:text-5xl font-extrabold text-agri-green">
            {recommendation.bestCrop} <span aria-hidden="true">🌾</span>
          </div>
          <div className="mt-2 text-base sm:text-lg font-semibold text-gray-700">Model prediction using NPK + weather</div>
          <div className="mt-2 text-sm font-semibold text-gray-700">
            Advisory priority (season/farm/rotation): {recommendation.personalizedBestCrop}
          </div>
        </Card>

        <Card>
          <div className="text-xl font-extrabold text-gray-900">Top model crops (base)</div>
          <div className="mt-3 space-y-2">
            {recommendation.baseTop3.map((item) => (
              <div key={item.crop} className="rounded-2xl bg-agri-muted border border-black/5 p-3 font-semibold text-gray-800">
                {item.crop} - {(item.probability * 100).toFixed(1)}%
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="text-xl font-extrabold text-gray-900">Top advisory crops (personalized)</div>
          <div className="mt-3 space-y-2">
            {recommendation.advisoryTop3.map((item) => (
              <div key={item.crop} className="rounded-2xl bg-agri-muted border border-black/5 p-3 font-semibold text-gray-800">
                {item.crop} - {(item.probability * 100).toFixed(1)}%
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="text-2xl font-extrabold text-gray-900">💧 {t('results.water.title')}</div>
          <div className="mt-2 text-lg sm:text-xl font-extrabold text-agri-green">{t(recommendation.irrigationKey)}</div>
        </Card>

        <Card>
          <div className="text-2xl font-extrabold text-gray-900">🧴 {t('results.fertilizer.title')}</div>
          <div className="mt-3 space-y-3">
            {recommendation.fertilizerPlan.map((i, idx) => (
              <div
                key={idx}
                className="rounded-2xl bg-agri-muted border border-black/5 p-4 flex items-start gap-3"
              >
                <div className="text-2xl" aria-hidden="true">
                  {i.icon}
                </div>
                <div className="text-base sm:text-lg font-semibold text-gray-800">{t(i.key)}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="text-2xl font-extrabold text-gray-900">🐛 {t('results.pest.title')}</div>
          <div className="mt-3 space-y-3">
            {recommendation.pestAlerts.map((i, idx) => (
              <div
                key={idx}
                className="rounded-2xl bg-agri-muted border border-black/5 p-4 flex items-start gap-3"
              >
                <div className="text-2xl" aria-hidden="true">
                  {i.icon}
                </div>
                <div className="text-base sm:text-lg font-semibold text-gray-800">{t(i.key)}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="text-2xl font-extrabold text-gray-900">🌦️ {t('results.weather.title')}</div>
          <div className="mt-3 space-y-3">
            {recommendation.weatherAlerts.map((i, idx) => (
              <div
                key={idx}
                className="rounded-2xl bg-agri-muted border border-black/5 p-4 flex items-start gap-3"
              >
                <div className="text-2xl" aria-hidden="true">
                  {i.icon}
                </div>
                <div className="text-base sm:text-lg font-semibold text-gray-800">{t(i.key)}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="text-2xl font-extrabold text-gray-900">👍 {t('results.tips.title')}</div>
          <div className="mt-3 space-y-3">
            {recommendation.friendlyTips.map((i, idx) => (
              <div
                key={idx}
                className="rounded-2xl bg-agri-muted border border-black/5 p-4 flex items-start gap-3"
              >
                <div className="text-2xl" aria-hidden="true">
                  {i.icon}
                </div>
                <div className="text-base sm:text-lg font-semibold text-gray-800">{t(i.key)}</div>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <SecondaryButton onClick={() => navigate('/')}>
            🏠 {t('common.home')}
          </SecondaryButton>
          <PrimaryButton onClick={() => navigate('/predict')}>
            🔄 {t('results.button.newSuggestion')}
          </PrimaryButton>
        </div>
      </div>
    </Layout>
  )
}
