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

function getConfidenceInterpretation(item, t) {
  const score = Number(item?.confidence || 0)
  if (score >= 0.75) {
    return {
      label: t('new_results.confidence.strong.label', 'Strong Match'),
      description: t('new_results.confidence.strong.description', 'Highly recommended for your farm conditions'),
    }
  }
  if (score >= 0.5) {
    return {
      label: t('new_results.confidence.good.label', 'Good Match'),
      description: t('new_results.confidence.good.description', 'Well-suited for your farm conditions'),
    }
  }
  if (score >= 0.35) {
    return {
      label: t('new_results.confidence.moderate.label', 'Moderate Match'),
      description: t('new_results.confidence.moderate.description', 'Suitable with some local considerations'),
    }
  }
  return {
    label: t('new_results.confidence.possible.label', 'Possible Option'),
    description: t('new_results.confidence.possible.description', 'Confirm with local conditions before planting'),
  }
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

function formatMode(mode, t) {
  const normalized = String(mode || '').toLowerCase()
  if (normalized === 'planning') {
    return t('new_results.mode.planning', 'Planning')
  }
  if (normalized === 'current') {
    return t('new_results.mode.current', 'Current')
  }
  return mode || '--'
}

function getLocalizedReason(item, isHindi, t) {
  if (isHindi) {
    return item?.reason_hi || item?.reason_hindi || t('new_results.reasonFallback', 'यह फसल आपके वर्तमान खेत संकेतकों के साथ अच्छा मेल दिखाती है।')
  }
  return item?.reason || t('new_results.reasonFallbackEn', 'This crop shows good compatibility with your current farm indicators.')
}

function formatSeasonLabel(season, isHindi) {
  if (!season) return '--'
  if (!isHindi) return season

  const map = {
    kharif: 'खरीफ',
    rabi: 'रबी',
    zaid: 'जायद',
  }
  return map[String(season).toLowerCase()] || season
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

  const getConfidenceBadgeClass = (score) => {
    const value = Number(score || 0)
    if (value > 0.7) return 'border-green-200 bg-green-50 text-green-700'
    if (value >= 0.3) return 'border-amber-200 bg-amber-50 text-amber-700'
    return 'border-gray-200 bg-gray-100 text-gray-700'
  }

  const getRankAccentClass = (index) => {
    if (index === 0) return 'bg-[#2d5016]'
    if (index === 1) return 'bg-[#b8860b]'
    return 'bg-[#6b7280]'
  }

  const handleViewDetailedAdvisory = () => {
    const userInputs = readStorage('cropRecommendation', readStorage('lastInputs', {}))
    const payload = {
      recommendations: (result?.recommendations || []).slice(0, 3),
      userInputs,
      inputSummary: result?.input_summary || {},
      climateUsed: result?.climate_used || {},
      metadata: result?.metadata || {},
      mode: result?.mode || userInputs?.activeTab || 'current',
      timestamp: Date.now(),
    }
    try {
      window.localStorage.setItem('smartkrishi_recommendations', JSON.stringify(payload))
    } catch {
      // Proceed with navigation even if localStorage write fails.
    }
    navigate('/advisory')
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
  const topPickInterpretation = getConfidenceInterpretation(topPick, t)
  const climate = result?.climate_used || {}
  const inputSummary = result?.input_summary || {}
  const metadata = result?.metadata || {}
  const modeLabel = formatMode(result?.mode, t)
  const disclaimerText = isHindi
    ? (metadata?.disclaimer_hi || t('new_results.fallback.disclaimer'))
    : (metadata?.disclaimer || t('new_results.fallback.disclaimer'))

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
                {formatSeasonLabel(inputSummary?.season, isHindi)} • {modeLabel}
              </span>
            </div>
          </div>

          <div className="mt-5">
            <h1 className="font-heading text-4xl font-bold text-[#1a3a2a] sm:text-5xl">
              {getCropName(topPick, isHindi)}
            </h1>
            <p className="mt-3 max-w-3xl text-[16px] leading-7 text-[#6b7280]">{getLocalizedReason(topPick, isHindi, t)}</p>
            <p className="mt-2 text-sm font-medium text-[#2f6a4f]">{topPickInterpretation.description}</p>
          </div>

          <div className="mt-7 grid gap-3 md:grid-cols-3">
            <article className="rounded-xl border border-[#e5e7eb] bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                🏆 {t('new_results.topCrop', 'Top Crop')}
              </p>
              <p className="mt-2 text-3xl font-bold text-[#1a3a2a]">{getCropName(topPick, isHindi)}</p>
              <p className="mt-1 text-sm text-[#6b7280]">{formatSeasonLabel(topPick?.season, isHindi)} {t('new_results.seasonText', 'season')}</p>
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
          <div className="mt-6 space-y-4">
            {recommendations.map((item, index) => {
              const interpretation = getConfidenceInterpretation(item, t)
              return (
                <article
                  key={`${item.crop}-${item.rank}`}
                  className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_6px_18px_rgba(30,41,59,0.06)] lg:p-7"
                >
                  <span className={['absolute inset-y-0 left-0 w-1', getRankAccentClass(index)].join(' ')} />

                  <div className="ml-2 grid gap-5 lg:grid-cols-[minmax(220px,0.95fr)_minmax(320px,1.25fr)_minmax(320px,1fr)] lg:items-start">
                    <div className="min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#1a3a2a]">
                          {t('new_results.rank', { count: item.rank, defaultValue: `Rank ${item.rank}` })}
                        </p>
                        <span
                          className={[
                            'rounded-full border px-3 py-1 text-sm font-semibold whitespace-nowrap',
                            getConfidenceBadgeClass(item.confidence),
                          ].join(' ')}
                        >
                          {formatConfidence(item.confidence)}
                        </span>
                      </div>
                      <h3 className="mt-2 font-heading text-4xl font-bold leading-none text-[#1a3a2a]">{getCropName(item, isHindi)}</h3>
                      <p className="mt-4 inline-flex rounded-full bg-[#edf7ef] px-3 py-1 text-sm font-medium text-[#2f6a4f]">{interpretation.label}</p>
                    </div>

                    <div className="min-w-0 lg:pt-8">
                      <p className="text-[18px] leading-8 text-[#4b5563]">{getLocalizedReason(item, isHindi, t)}</p>
                    </div>

                    <div className="rounded-xl border border-[#e5e7eb] bg-[#f8faf8] p-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="border-r border-[#e1e5e1] pr-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6b7280]">
                            {t('new_results.seasonText', 'Season')}
                          </p>
                          <p className="mt-1 text-base font-bold text-[#1a3a2a]">{formatSeasonLabel(item.season, isHindi)}</p>
                        </div>
                        <div className="border-r border-[#e1e5e1] pr-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6b7280]">
                            {t('new_results.growingTime', 'Growing Time')}
                          </p>
                          <p className="mt-1 text-base font-bold text-[#1a3a2a]">{item.growing_duration || '--'}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6b7280]">
                            {t('new_results.mlScore', 'ML Score')}
                          </p>
                          <p className="mt-1 text-base font-bold text-[#1a3a2a]">{formatConfidence(item.ml_score)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={handleViewDetailedAdvisory}
              className="w-full max-w-[600px] rounded-xl bg-[#2d5016] px-8 py-4 text-base font-semibold text-white transition duration-200 hover:bg-[#3b6520]"
            >
              📋 {t('new_results.viewDetailedCta', 'View Detailed Advisory & Profit Estimation →')}
            </button>
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
            ⚠️ {disclaimerText}
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
