import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MinistryNavbar from '../components/MinistryNavbar'
import { getCropRecommendation } from '../lib/cropApi'

function readStorage(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function formatConfidence(decimal) {
  return `${Math.round(Number(decimal || 0) * 100)}%`
}

function getConfidenceInterpretation(item) {
  const parsed = item?.confidence_interpretation
  if (parsed?.label) return parsed

  const score = Number(item?.confidence || 0)
  if (score >= 0.75) {
    return { label: 'Strong Match', description: 'Highly recommended for your farm conditions' }
  }
  if (score >= 0.5) {
    return { label: 'Good Match', description: 'Well-suited for your farm conditions' }
  }
  if (score >= 0.35) {
    return { label: 'Moderate Match', description: 'Suitable with some local considerations' }
  }
  return { label: 'Possible Option', description: 'Confirm with local conditions before planting' }
}

function capitalizeCrop(name) {
  if (!name) return '--'
  return name.charAt(0).toUpperCase() + name.slice(1)
}

function getCropName(item, isHindi) {
  if (!item) return '--'
  if (isHindi && item.hindi_name) return item.hindi_name
  if (item.display_name) return item.display_name
  return capitalizeCrop(item.crop)
}

function formatSource(source, t) {
  const map = {
    live_weather: t('results.source.liveWeather', 'Live Weather'),
    historical_average: t('results.source.historicalAverage', 'Historical Average'),
  }
  return map[source] || source || '--'
}

function monthWindowLabel(months = []) {
  if (!months.length) return '--'
  if (months.length === 1) return months[0]
  return `${months[0]} -> ${months[months.length - 1]}`
}

function safeHistoryWrite(entry) {
  try {
    const raw = window.localStorage.getItem('smartkrishiHistory')
    const parsed = raw ? JSON.parse(raw) : []
    const existing = Array.isArray(parsed) ? parsed : []
    const nextHistory = [entry, ...existing].slice(0, 5)
    window.localStorage.setItem('smartkrishiHistory', JSON.stringify(nextHistory))
  } catch {
    // If localStorage is unavailable, don't block results rendering.
  }
}

export default function Results() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()

  const isHindi = (i18n.resolvedLanguage || i18n.language || 'hi').startsWith('hi')

  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedAdvisory, setExpandedAdvisory] = useState(0)
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0)
  const [reloadKey, setReloadKey] = useState(0)

  const loadingStepsStr = t('new_results.loadingSteps', 'Evaluating crops • Checking season • Analyzing soil • Computing')
  const loadingMessages = useMemo(
    () => loadingStepsStr.split(' • '),
    [loadingStepsStr],
  )

  useEffect(() => {
    let isActive = true

    async function runPrediction() {
      setLoading(true)
      const storedData = readStorage('cropRecommendation', null)
      if (!storedData) {
        navigate('/predict')
        return
      }

      setResult(null)
      setError('')

      try {
        const apiResult = await getCropRecommendation(storedData)
        if (isActive) {
          if (!apiResult?.success) {
            setError(t('new_results.noRecommendationsTitle', 'No recommendations available. Please try again.'))
            return
          }
          setResult(apiResult)
          setExpandedAdvisory(0)
        }
      } catch (err) {
        if (isActive) {
          setError(err instanceof Error ? err.message : t('results.error.body', 'Error generating recommendations.'))
        }
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    runPrediction()
    return () => {
      isActive = false
    }
  }, [navigate, reloadKey, t])

  useEffect(() => {
    if (!loading) return undefined
    const timer = window.setInterval(() => {
      setLoadingMessageIndex((value) => (value + 1) % loadingMessages.length)
    }, 1200)
    return () => window.clearInterval(timer)
  }, [loading, loadingMessages])

  useEffect(() => {
    if (!result?.recommendations?.length) return
    const topPick = result.recommendations[0]
    const entry = {
      generatedAt: new Date().toISOString(),
      crop: topPick.crop,
      confidence: topPick.confidence,
      reason: topPick.reason,
      yieldRange: topPick.growing_duration,
    }
    safeHistoryWrite(entry)
  }, [result])

  const handleReviewInputs = () => navigate('/predict', { state: { review: true } })

  const handleNewPlan = () => {
    try {
      window.localStorage.removeItem('cropRecommendation')
      window.localStorage.removeItem('lastInputs')
    } catch {
      // Ignore storage failures and still navigate.
    }
    navigate('/predict', { state: { reset: true } })
  }

  if (loading) {
    return (
      <div className={[isHindi ? 'lang-hi' : '', 'min-h-screen bg-[#faf8f2] text-[#1f2f24]'].join(' ')}>
        <MinistryNavbar />
        <main className="mx-auto flex min-h-[calc(100vh-76px)] max-w-4xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
          <section className="w-full rounded-2xl border border-[#e5e7eb] bg-white p-8 text-center shadow-[0_14px_40px_rgba(26,58,42,0.08)]">
            <div className="text-5xl animate-pulse">🌾</div>
            <h1 className="mt-6 font-heading text-3xl font-bold text-[#1a3a2a]">
              {t('new_results.analyzing', 'Analyzing your farm conditions...')}
            </h1>
            <p className="mt-3 text-[16px] text-[#6b7280]">{loadingMessages[loadingMessageIndex]}</p>

            <div className="mx-auto mt-6 h-3 w-full max-w-lg overflow-hidden rounded-full bg-[#f4e7c4]">
              <div className="h-full w-1/2 animate-[shimmer_1.6s_infinite] rounded-full bg-[#d4a843]" />
            </div>

            <p className="mt-4 text-sm text-[#6b7280]">{loadingStepsStr}</p>
          </section>
        </main>
      </div>
    )
  }

  if (error && !result) {
    return (
      <div className={[isHindi ? 'lang-hi' : '', 'min-h-screen bg-[#faf8f2] text-[#1f2f24]'].join(' ')}>
        <MinistryNavbar />
        <main className="mx-auto flex min-h-[calc(100vh-76px)] max-w-4xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
          <section className="w-full rounded-2xl border border-[#f0c9c9] bg-white p-8 text-center shadow-[0_14px_40px_rgba(26,58,42,0.08)]">
            <div className="text-4xl">⚠️</div>
            <h1 className="mt-5 font-heading text-3xl font-bold text-[#1a3a2a]">
              {t('new_results.noRecommendationsTitle', 'Unable to generate recommendations')}
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-[16px] text-[#6b7280]">{error}</p>
            <div className="mx-auto mt-8 grid max-w-xl gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setReloadKey((value) => value + 1)}
                className="min-h-[56px] rounded-lg bg-[#1a3a2a] px-5 py-3 text-[16px] font-bold text-white transition duration-200 hover:scale-[1.01] hover:bg-[#24513a]"
              >
                {t('new_results.tryAgain', 'Try Again')}
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="min-h-[56px] rounded-lg border-2 border-[#1a3a2a] bg-white px-5 py-3 text-[16px] font-bold text-[#1a3a2a] transition duration-200 hover:bg-[#edf3ef]"
              >
                {t('new_results.backToHome', 'Back to Home')}
              </button>
            </div>
          </section>
        </main>
      </div>
    )
  }

  const recommendations = (result?.recommendations || []).slice(0, 3)
  if (!recommendations.length) {
    return (
      <div className={[isHindi ? 'lang-hi' : '', 'min-h-screen bg-[#faf8f2] text-[#1f2f24]'].join(' ')}>
        <MinistryNavbar />
        <main className="mx-auto flex min-h-[calc(100vh-76px)] max-w-4xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
          <section className="w-full rounded-2xl border border-[#e5e7eb] bg-white p-8 text-center shadow-[0_14px_40px_rgba(26,58,42,0.08)]">
            <h1 className="font-heading text-3xl font-bold text-[#1a3a2a]">
              {t('new_results.noSuitableTitle', 'No suitable crops found')}
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-[16px] text-[#6b7280]">
              {t('new_results.noSuitableBody', 'No suitable crops found for your current inputs. Try adjusting soil parameters or selecting a different season.')}
            </p>
            <button
              type="button"
              onClick={() => navigate('/predict')}
              className="mt-8 min-h-[56px] rounded-lg bg-[#1a3a2a] px-8 py-3 text-[16px] font-bold text-white transition duration-200 hover:scale-[1.01] hover:bg-[#24513a]"
            >
              {t('new_results.modifyInputs', 'Modify Inputs')}
            </button>
          </section>
        </main>
      </div>
    )
  }

  const topPick = recommendations[0]
  const topPickInterpretation = getConfidenceInterpretation(topPick)
  const climate = result?.climate_used || {}
  const inputSummary = result?.input_summary || {}
  const metadata = result?.metadata || {}

  const advisoryRows = [
    { icon: '💧', label: t('new_results.advisoryRows.irrigation', 'Irrigation'), text: 'irrigation' },
    { icon: '🧪', label: t('new_results.advisoryRows.fertilizer', 'Fertilizer'), text: 'fertilizer' },
    { icon: '🐛', label: t('new_results.advisoryRows.pest_watch', 'Pest Watch'), text: 'pest_watch' },
    { icon: '🌤', label: t('new_results.advisoryRows.weather_note', 'Weather Note'), text: 'weather_note' },
  ]

  return (
    <div className={[isHindi ? 'lang-hi' : '', 'min-h-screen bg-[#faf8f2] text-[#1f2f24]'].join(' ')}>
      <MinistryNavbar />

      <main className="mx-auto max-w-[1100px] px-4 pb-14 pt-8 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-[#e5e7eb] bg-[#faf8f2] p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 text-lg text-green-600">✓</span>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#1a3a2a]">
                {t('new_results.recommendationReady', 'Recommendation Ready')}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-green-200 bg-green-50 px-4 py-1 text-sm font-semibold text-green-700">
                {t('new_results.aiConfidence', 'AI Confidence')}: {formatConfidence(topPick?.confidence)} - {topPickInterpretation.label}
              </span>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-4 py-1 text-sm font-semibold text-amber-700">
                {inputSummary?.season || '--'} • {result?.mode || '--'}
              </span>
            </div>
          </div>

          <div className="mt-5">
            <h1 className="font-heading text-4xl font-bold text-[#1a3a2a] sm:text-5xl">
              {getCropName(topPick, isHindi)}
            </h1>
            <p className="mt-3 max-w-3xl text-[16px] leading-7 text-[#6b7280]">{topPick?.reason || '--'}</p>
            <p className="mt-2 text-sm font-medium text-[#2f6a4f]">{topPickInterpretation.description}</p>
          </div>

          <div className="mt-7 grid gap-3 md:grid-cols-3">
            <article className="rounded-xl border border-[#e5e7eb] bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                🏆 {t('new_results.topCrop', 'Top Crop')}
              </p>
              <p className="mt-2 text-3xl font-bold text-[#1a3a2a]">{getCropName(topPick, isHindi)}</p>
              <p className="mt-1 text-sm text-[#6b7280]">{topPick?.season || '--'} {t('new_results.seasonText', 'season')}</p>
            </article>

            <article className="rounded-xl border border-[#e5e7eb] bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                📅 {t('new_results.growingTime', 'Growing Time')}
              </p>
              <p className="mt-2 text-3xl font-bold text-[#1a3a2a]">{topPick?.growing_duration || '--'}</p>
              <p className="mt-1 text-sm text-[#6b7280]">{monthWindowLabel(climate?.months_covered)}</p>
            </article>

            <article className="rounded-xl border border-[#e5e7eb] bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                🤖 {t('new_results.mlConfidence', 'ML Confidence')}
              </p>
              <p className="mt-2 text-3xl font-bold text-[#1a3a2a]">{formatConfidence(topPick?.ml_score)}</p>
              <p className="mt-1 text-sm text-[#6b7280]">
                {t('new_results.ruleAdj', 'Rule adj')}: {topPick?.rule_adjustment || '+0.00'}
              </p>
            </article>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full border border-[#e5e7eb] bg-gray-100 px-3 py-1 text-sm text-[#4b5563]">
              🌾 {t('new_results.farmSize', 'Farm')}: {inputSummary?.farm_size_acres || '--'}
            </span>
            <span className="rounded-full border border-[#e5e7eb] bg-gray-100 px-3 py-1 text-sm text-[#4b5563]">
              🌡 {t('new_results.climate', 'Climate')}: {Math.round(Number(climate?.temperature || 0))}°C / {Math.round(Number(climate?.humidity || 0))}%
            </span>
            <span className="rounded-full border border-[#e5e7eb] bg-gray-100 px-3 py-1 text-sm text-[#4b5563]">
              🌧 {t('new_results.rainfall', 'Rainfall')}: {Math.round(Number(climate?.rainfall || 0))} mm
            </span>
            <span className="rounded-full border border-[#e5e7eb] bg-gray-100 px-3 py-1 text-sm text-[#4b5563]">
              📊 {t('new_results.source', 'Source')}: {formatSource(climate?.source, t)}
            </span>
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-[#e5e7eb] bg-white p-6 sm:p-8">
          <h2 className="font-heading text-3xl font-bold text-[#1a3a2a]">
            🌱 {t('new_results.topCropChoices', { count: recommendations.length, defaultValue: `Top ${recommendations.length} Crop Choices` })}
          </h2>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {recommendations.map((item, index) => {
              const isTop = index === 0
              const interpretation = getConfidenceInterpretation(item)
              return (
                <article
                  key={`${item.crop}-${item.rank}`}
                  className={[
                    'relative overflow-hidden rounded-2xl bg-white p-5',
                    isTop ? 'border-2 border-green-200' : 'border border-gray-200',
                  ].join(' ')}
                >
                  <span className={['absolute inset-y-0 left-0 w-1', isTop ? 'bg-green-600' : 'bg-amber-400'].join(' ')} />

                  <div className="ml-2 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1a3a2a]">
                        {t('new_results.rank', { count: item.rank, defaultValue: `Rank ${item.rank}` })}
                      </p>
                      <h3 className="mt-1 text-3xl font-bold text-[#1a3a2a]">{getCropName(item, isHindi)}</h3>
                    </div>
                    <span
                      className={[
                        'rounded-full border px-3 py-1 text-sm font-semibold',
                        isTop ? 'border-green-200 bg-green-50 text-green-700' : 'border-amber-200 bg-amber-50 text-amber-700',
                      ].join(' ')}
                    >
                      {t('new_results.aiConfidence', 'AI Confidence')}: {formatConfidence(item.confidence)} - {interpretation.label}
                    </span>
                  </div>

                  <div className="ml-2 mt-4 rounded-lg bg-[#faf8f2] p-4 text-[15px] leading-7 text-[#6b7280]">{item.reason}</div>
                  <p className="ml-2 mt-3 text-sm font-medium text-[#2f6a4f]">{interpretation.description}</p>

                  <div className="ml-2 mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg bg-gray-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                        {t('new_results.growingTime', 'Growing Time')}
                      </p>
                      <p className="mt-1 text-2xl font-bold text-[#1a3a2a]">{item.growing_duration}</p>
                      <p className="mt-1 text-sm text-[#6b7280]">{t('new_results.seasonText', 'Season')}: {item.season}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                        {t('new_results.mlScore', 'ML Score')}
                      </p>
                      <p className="mt-1 text-2xl font-bold text-[#1a3a2a]">{formatConfidence(item.ml_score)}</p>
                      <p className="mt-1 text-sm text-[#6b7280]">
                        {t('new_results.rule', 'Rule')}: {item.rule_adjustment}
                      </p>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-[#e5e7eb] bg-[#faf8f2] p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d4a843]">
            {t('new_results.actionPlan', 'Action Plan')}
          </p>
          <h2 className="mt-2 font-heading text-3xl font-bold text-[#1a3a2a]">
            {t('new_results.cropAdvisories', 'Crop Advisories')}
          </h2>
          <p className="mt-2 text-[16px] text-[#6b7280]">
            {t('new_results.advisoryHint', 'Open each section for irrigation, fertilizer, pest control, and weather guidance.')}
          </p>

          <div className="mt-6 space-y-3">
            {recommendations.map((item, index) => {
              const isOpen = expandedAdvisory === index
              return (
                <article key={`advisory-${item.crop}-${item.rank}`} className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white">
                  <button
                    type="button"
                    onClick={() => setExpandedAdvisory((value) => (value === index ? -1 : index))}
                    aria-expanded={isOpen}
                    className="w-full p-5 text-left transition hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xl font-bold text-[#1a3a2a]">
                          🌾 {t('new_results.advisoryTitle', { crop: getCropName(item, isHindi), defaultValue: `${getCropName(item, isHindi)} Advisory` })}
                        </p>
                        <p className="mt-1 text-sm text-[#6b7280]">{item.reason}</p>
                      </div>
                      <span className="text-2xl font-medium text-[#1a3a2a]">{isOpen ? '−' : '+'}</span>
                    </div>
                  </button>

                  <div className={[
                    'overflow-hidden transition-all duration-300 ease-out',
                    isOpen ? 'max-h-[680px] border-t border-gray-100' : 'max-h-0',
                  ].join(' ')}>
                    <div className="p-5">
                      <div className="space-y-5 border-l-2 border-green-100 pl-4">
                        {advisoryRows.map((row, rowIndex) => (
                          <div key={`${item.crop}-${row.text}`} className="flex gap-3">
                            <div className={[
                              'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                              index === 0 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700',
                            ].join(' ')}>
                              {rowIndex + 1}
                            </div>
                            <div>
                              <p className="text-[16px] font-semibold text-[#1a3a2a]">
                                {row.icon} {row.label}
                              </p>
                              <p className="mt-1 max-w-2xl text-[15px] leading-7 text-[#4b5563]">{item?.advisories?.[row.text] || '--'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-[#e5e7eb] bg-white p-6 text-center">
          <div className="border-t border-gray-100 pt-4 text-xs text-gray-400">
            {t('new_results.analyzedInfo', {
              crops: metadata?.total_crops_evaluated ?? '--',
              time: metadata?.processing_time_ms ?? '--',
              version: metadata?.model_version || '--',
              defaultValue: `Analyzed ${metadata?.total_crops_evaluated ?? '--'} crops • Processing time: ${metadata?.processing_time_ms ?? '--'}ms • Model ${metadata?.model_version || '--'}`
            })}
          </div>
          <p className="mt-2 text-xs text-gray-400">
            {t('new_results.rulesApplied', {
              rules: (metadata?.rules_applied || []).join(', ') || '--',
              defaultValue: `Rules applied: ${(metadata?.rules_applied || []).join(', ') || '--'}`
            })}
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-sm italic text-gray-500">
            ⚠️ {metadata?.disclaimer || t('new_results.fallback.disclaimer')}
          </p>
        </section>

        <section className="mt-8 grid gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={handleReviewInputs}
            className="min-h-[56px] rounded-lg border-2 border-[#1a3a2a] bg-white px-5 py-3 text-[16px] font-bold text-[#1a3a2a] transition duration-200 hover:bg-[#edf3ef]"
          >
            {t('new_results.reviewInputs', 'Review Inputs')}
          </button>
          <button
            type="button"
            onClick={handleNewPlan}
            className="min-h-[56px] rounded-lg bg-[#1a3a2a] px-5 py-3 text-[16px] font-bold text-white transition duration-200 hover:scale-[1.01] hover:bg-[#24513a]"
          >
            {t('new_results.startNewPlan', 'Start New Plan')}
          </button>
        </section>
      </main>
    </div>
  )
}
