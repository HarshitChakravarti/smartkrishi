import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MinistryNavbar from '../components/MinistryNavbar'
import cropEconomics from '../data/cropEconomics.json'
import cropAdvisory from '../data/cropAdvisory.json'

function readStorage(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function formatINR(value, locale = 'en-IN') {
  if (value == null) return '--'
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Math.round(Number(value)))
}

function formatConfidence(decimal) {
  return `${Math.round(Number(decimal || 0) * 100)}%`
}

function capitalizeCrop(name) {
  if (!name) return '--'
  return name.charAt(0).toUpperCase() + name.slice(1)
}

function irrigationTimeline(scheduleText, t) {
  if (!scheduleText) return []
  return scheduleText
    .split('.')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4)
    .map((item, index) => ({
      stage: t('advisory.irrigation.stepLabel', { count: index + 1, defaultValue: `Step ${index + 1}` }),
      timing: t('advisory.irrigation.fieldStage', 'Field stage'),
      note: item,
    }))
}

function resolveAreaInHectares(payload) {
  const fromInputAcres = Number(payload?.userInputs?.landArea)
  const fromSummaryAcres = Number(payload?.inputSummary?.farm_size_acres)

  if (!Number.isNaN(fromInputAcres) && fromInputAcres > 0) {
    return { hectares: fromInputAcres * 0.4047, usedDefault: false, acres: fromInputAcres }
  }
  if (!Number.isNaN(fromSummaryAcres) && fromSummaryAcres > 0) {
    return { hectares: fromSummaryAcres * 0.4047, usedDefault: false, acres: fromSummaryAcres }
  }
  return { hectares: 1, usedDefault: true, acres: null }
}

function severityClass(index) {
  if (index === 0) return 'border-red-300 bg-red-50'
  if (index === 1) return 'border-amber-300 bg-amber-50'
  return 'border-green-300 bg-green-50'
}

function formatUnit(unit, isHindi) {
  if (!unit) return '--'
  if (!isHindi) return unit

  const map = {
    quintal: 'क्विंटल',
    'nuts (x100)': 'नारियल (x100)',
    'quintal (clean coffee)': 'क्विंटल (क्लीन कॉफी)',
  }
  return map[unit] || unit
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

function getRecommendationDisplayName(rec, isHindi, economics, advisory) {
  if (isHindi) {
    return rec?.hindi_name || economics?.displayNameHi || advisory?.displayNameHi || economics?.displayName || advisory?.displayName || capitalizeCrop(rec?.crop)
  }
  return rec?.display_name || economics?.displayName || advisory?.displayName || capitalizeCrop(rec?.crop)
}

export default function Advisory() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const [payload, setPayload] = useState(null)
  const [activeTab, setActiveTab] = useState(0)

  const isHindi = (i18n.resolvedLanguage || i18n.language || 'hi').startsWith('hi')
  const localeCode = isHindi ? 'hi-IN' : 'en-IN'

  useEffect(() => {
    const stored = readStorage('smartkrishi_recommendations', null)
    if (!stored?.recommendations?.length) {
      navigate('/predict', { replace: true, state: { advisoryMissing: true } })
      return
    }
    setPayload(stored)
  }, [navigate])

  const recommendations = useMemo(() => (payload?.recommendations || []).slice(0, 3), [payload])

  const areaInfo = useMemo(() => resolveAreaInHectares(payload || {}), [payload])

  const profitRows = useMemo(() => {
    return recommendations.map((rec) => {
      const cropKey = String(rec?.crop || '').toLowerCase()
      const econ = cropEconomics[cropKey]
      const advisoryMeta = cropAdvisory[cropKey]
      if (!econ) {
        return {
          cropKey,
          displayName: getRecommendationDisplayName(rec, isHindi, null, advisoryMeta),
          missingEconomics: true,
        }
      }

      const expectedYield = Number(econ.yieldPerHectare.avg) * areaInfo.hectares
      const totalCost = Number(econ.costPerHectare) * areaInfo.hectares
      const revenueMSP = Number(econ.msp) > 0 ? expectedYield * Number(econ.msp) : null
      const revenueWholesale = expectedYield * Number(econ.wholesalePrice)
      const revenueDealer = expectedYield * Number(econ.dealerPrice)

      return {
        cropKey,
        displayName: getRecommendationDisplayName(rec, isHindi, econ, advisoryMeta),
        econ,
        rec,
        expectedYield,
        totalCost,
        revenueMSP,
        revenueWholesale,
        revenueDealer,
        profitMSP: revenueMSP == null ? null : revenueMSP - totalCost,
        profitWholesale: revenueWholesale - totalCost,
        profitDealer: revenueDealer - totalCost,
      }
    })
  }, [recommendations, areaInfo.hectares, isHindi])

  const bestByScenario = useMemo(() => {
    const maxIndex = (field) => {
      let maxValue = Number.NEGATIVE_INFINITY
      let maxAt = -1
      profitRows.forEach((row, index) => {
        const value = row[field]
        if (value == null) return
        if (value > maxValue) {
          maxValue = value
          maxAt = index
        }
      })
      return maxAt
    }

    return {
      msp: maxIndex('profitMSP'),
      wholesale: maxIndex('profitWholesale'),
      dealer: maxIndex('profitDealer'),
    }
  }, [profitRows])

  if (!payload) {
    return (
      <div className="min-h-screen bg-[#faf8f2] text-[#1f2f24]">
        <MinistryNavbar />
      </div>
    )
  }

  const selected = recommendations[activeTab] || recommendations[0]
  const selectedCropKey = String(selected?.crop || '').toLowerCase()
  const economics = cropEconomics[selectedCropKey]
  const advisory = cropAdvisory[selectedCropKey]

  const selectedDisplayName = getRecommendationDisplayName(selected, isHindi, economics, advisory)
  const overviewText = isHindi
    ? (advisory?.overviewHi || t('advisory.fallback.overview', 'यह फसल आपकी स्थानीय परिस्थितियों के लिए उपयुक्त हो सकती है।'))
    : (advisory?.overview || t('advisory.fallback.overviewEn', 'This crop can perform well under your local conditions.'))
  const seasonText = formatSeasonLabel(selected?.season, isHindi) || t('advisory.fallback.mixedWindows', 'Mixed windows')
  const soilPreferenceText = isHindi
    ? (advisory?.soilPreferenceHi || t('advisory.fallback.soilPreference', 'अच्छी जल-निकासी वाली दोमट मिट्टी उपयुक्त रहती है।'))
    : (advisory?.soilPreference || t('advisory.fallback.soilPreferenceEn', 'Well-drained loam soil is generally suitable.'))
  const selectedReason = isHindi
    ? (selected?.reason_hi || selected?.reason_hindi || t('advisory.fallback.reason', 'यह विकल्प आपके मौजूदा खेत संकेतकों से अच्छा मेल दिखाता है।'))
    : (selected?.reason || '--')

  const irrigationScheduleText = isHindi
    ? (economics?.irrigationScheduleHi || t('advisory.fallback.irrigationSchedule', 'मिट्टी की नमी के आधार पर चरणबद्ध सिंचाई रखें और जलभराव से बचें।'))
    : economics?.irrigationSchedule
  const irrigationSteps = irrigationTimeline(irrigationScheduleText, t)
  const waterRequirementText = isHindi
    ? (economics?.waterRequirementHi || t('advisory.fallback.waterRequirement', 'फसल चरण के अनुसार पानी दें।'))
    : (economics?.waterRequirement || '--')
  const irrigationMethodText = isHindi
    ? (economics?.irrigationMethodHi || t('advisory.fallback.irrigationMethod', 'उपलब्धता के अनुसार उपयुक्त सिंचाई विधि अपनाएं।'))
    : (economics?.irrigationMethod || '--')
  const backendIrrigationText = isHindi
    ? (selected?.advisories?.irrigation_hi || t('advisory.fallback.backendIrrigation', 'सिंचाई समय स्थानीय मौसम के अनुसार समायोजित रखें।'))
    : (selected?.advisories?.irrigation || '--')

  const fertilizerOrganicText = isHindi
    ? (economics?.fertilizer?.organicHi || t('advisory.fallback.organicOption', 'जैविक खाद और कम्पोस्ट का संतुलित उपयोग करें।'))
    : (economics?.fertilizer?.organic || '--')
  const backendFertilizerText = isHindi
    ? (selected?.advisories?.fertilizer_hi || t('advisory.fallback.backendFertilizer', 'मिट्टी परीक्षण के अनुसार संतुलित पोषक तत्व दें।'))
    : (selected?.advisories?.fertilizer || '--')

  const backendPestText = isHindi
    ? (selected?.advisories?.pest_watch_hi || t('advisory.fallback.backendPest', 'फसल की नियमित निगरानी करें और समय पर रोकथाम अपनाएं।'))
    : (selected?.advisories?.pest_watch || '--')
  const weatherSensitivityText = isHindi
    ? (economics?.weatherSensitivityHi || t('advisory.fallback.weatherSensitivity', 'मौसम बदलाव पर सतत निगरानी रखें और खेत प्रबंधन समय पर करें।'))
    : (economics?.weatherSensitivity || selected?.advisories?.weather_note || '--')
  const harvestIndicatorsText = isHindi
    ? (economics?.harvestIndicatorsHi || t('advisory.fallback.harvestIndicators', 'फसल परिपक्वता संकेतों के अनुसार कटाई करें।'))
    : (economics?.harvestIndicators || '--')
  const backendWeatherText = isHindi
    ? (selected?.advisories?.weather_note_hi || t('advisory.fallback.backendWeather', 'स्थानीय मौसम पूर्वानुमान देखकर कृषि कार्य तय करें।'))
    : (selected?.advisories?.weather_note || '--')

  const backToResults = () => navigate('/results')
  const startNewPlan = () => {
    try {
      window.localStorage.removeItem('smartkrishi_recommendations')
      window.localStorage.removeItem('cropRecommendation')
      window.localStorage.removeItem('lastInputs')
    } catch {
      // Ignore storage failures and continue navigation.
    }
    navigate('/predict', { state: { reset: true } })
  }

  return (
    <div className="min-h-screen bg-[#faf8f2] text-[#1f2f24]">
      <MinistryNavbar />

      <main className="mx-auto max-w-[1100px] px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-[#e8e0d8] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#6b7280]">{t('advisory.pageEyebrow', 'Detailed Advisory')}</p>
          <h1 className="mt-2 font-heading text-4xl font-bold text-[#1a3a2a] sm:text-5xl">{t('advisory.pageTitle', 'Crop Advisory & Profit Estimation')}</h1>
          <p className="mt-3 text-[16px] text-[#6b7280]">{t('advisory.pageSubtitle', 'Comprehensive guidance for your recommended crops')}</p>

          <div className="mt-6 flex gap-3 overflow-x-auto pb-1">
            {recommendations.map((item, index) => {
              const itemCropKey = String(item?.crop || '').toLowerCase()
              const itemEconomics = cropEconomics[itemCropKey]
              const itemAdvisory = cropAdvisory[itemCropKey]

              return (
                <button
                  key={`${item.crop}-${item.rank}`}
                  type="button"
                  onClick={() => setActiveTab(index)}
                  className={[
                    'whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition',
                    activeTab === index
                      ? 'border-[#1a2e1a] bg-[#1a2e1a] text-white'
                      : 'border-[#2d5016] bg-white text-[#2d5016] hover:bg-[#eef4ec]',
                  ].join(' ')}
                >
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'} {getRecommendationDisplayName(item, isHindi, itemEconomics, itemAdvisory)}
                </button>
              )
            })}
          </div>
        </section>

        <section className="mt-8 space-y-5">
          <article className="rounded-2xl border border-[#e8e0d8] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#6b7280]">🌱 {t('advisory.section.overview', 'Crop Overview')}</p>
            <h2 className="mt-2 font-heading text-3xl font-bold text-[#1a3a2a]">{selectedDisplayName}</h2>
            <p className="mt-2 text-[15px] leading-7 text-[#4b5563]">{overviewText}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-[#d1e7dd] bg-[#f0fdf4] p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#6b7280]">{t('advisory.metrics.season', 'Season')}</p>
                <p className="mt-1 text-sm font-semibold text-[#1a3a2a]">{seasonText}</p>
              </div>
              <div className="rounded-xl border border-[#d1e7dd] bg-[#f0fdf4] p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#6b7280]">{t('advisory.metrics.duration', 'Duration')}</p>
                <p className="mt-1 text-sm font-semibold text-[#1a3a2a]">{selected?.growing_duration || '--'}</p>
              </div>
              <div className="rounded-xl border border-[#d1e7dd] bg-[#f0fdf4] p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#6b7280]">{t('advisory.metrics.waterNeed', 'Water Need')}</p>
                <p className="mt-1 text-sm font-semibold text-[#1a3a2a]">{waterRequirementText}</p>
              </div>
              <div className="rounded-xl border border-[#d1e7dd] bg-[#f0fdf4] p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#6b7280]">{t('advisory.metrics.soilPreference', 'Soil Preference')}</p>
                <p className="mt-1 text-sm font-semibold text-[#1a3a2a]">{soilPreferenceText}</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-[#2f6a4f]">
              {t('advisory.metrics.confidence', 'Confidence')}: {formatConfidence(selected?.confidence)} | {t('advisory.metrics.ml', 'ML')}: {formatConfidence(selected?.ml_score)} | {t('advisory.metrics.ruleAdj', 'Rule adj')}: {selected?.rule_adjustment || '+0.00'}
            </p>
            <p className="mt-2 text-[15px] leading-7 text-[#4b5563]">{selectedReason}</p>
          </article>

          <article className="rounded-2xl border border-[#e8e0d8] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#6b7280]">💧 {t('advisory.section.irrigation', 'Irrigation Guide')}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-[#faf8f5] p-4">
                <p className="text-sm text-[#6b7280]">{t('advisory.irrigation.totalWaterRequirement', 'Total water requirement')}</p>
                <p className="mt-1 font-semibold text-[#1a3a2a]">{waterRequirementText}</p>
              </div>
              <div className="rounded-xl bg-[#faf8f5] p-4">
                <p className="text-sm text-[#6b7280]">{t('advisory.irrigation.recommendedMethod', 'Recommended method')}</p>
                <p className="mt-1 font-semibold text-[#1a3a2a]">{irrigationMethodText}</p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {irrigationSteps.map((step, index) => (
                <div key={`${step.stage}-${index}`} className="flex gap-3">
                  <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#2d5016] text-xs font-bold text-white">{index + 1}</span>
                  <div>
                    <p className="text-sm font-semibold text-[#1a3a2a]">{step.stage} - {step.timing}</p>
                    <p className="text-sm text-[#4b5563]">{step.note}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[15px] text-[#4b5563]">{t('advisory.backendGuidance', 'Backend guidance')}: {backendIrrigationText}</p>
          </article>

          <article className="rounded-2xl border border-[#e8e0d8] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#6b7280]">🧪 {t('advisory.section.fertilizer', 'Fertilizer Plan')}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-sm font-semibold text-green-700">N: {economics?.fertilizer?.n ?? '--'} {t('advisory.unit.kgHa', 'kg/ha')}</span>
              <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-sm font-semibold text-green-700">P: {economics?.fertilizer?.p ?? '--'} {t('advisory.unit.kgHa', 'kg/ha')}</span>
              <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-sm font-semibold text-green-700">K: {economics?.fertilizer?.k ?? '--'} {t('advisory.unit.kgHa', 'kg/ha')}</span>
            </div>
            <p className="mt-3 text-[15px] text-[#4b5563]">{t('advisory.fertilizer.organicOption', 'Organic option')}: {fertilizerOrganicText}</p>

            <div className="mt-4 overflow-hidden rounded-xl border border-[#d1e7dd]">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#f0fdf4] text-[#1a3a2a]">
                  <tr>
                    <th className="px-3 py-2">{t('advisory.table.stage', 'Stage')}</th>
                    <th className="px-3 py-2">N</th>
                    <th className="px-3 py-2">P</th>
                    <th className="px-3 py-2">K</th>
                  </tr>
                </thead>
                <tbody>
                  {(economics?.fertilizer?.schedule || []).map((row, index) => (
                    <tr key={row.stage} className="border-t border-[#d1e7dd] bg-white">
                      <td className="px-3 py-2">{isHindi ? t('advisory.table.stageNumber', { count: index + 1, defaultValue: `चरण ${index + 1}` }) : row.stage}</td>
                      <td className="px-3 py-2">{row.n}</td>
                      <td className="px-3 py-2">{row.p}</td>
                      <td className="px-3 py-2">{row.k}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[15px] text-[#4b5563]">{t('advisory.backendGuidance', 'Backend guidance')}: {backendFertilizerText}</p>
          </article>

          <article className="rounded-2xl border border-[#e8e0d8] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#6b7280]">🌾 {t('advisory.section.seedPlanting', 'Seed & Planting')}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-[#faf8f5] p-3">
                <p className="text-xs uppercase tracking-[0.08em] text-[#6b7280]">{t('advisory.seed.seedRate', 'Seed rate')}</p>
                <p className="mt-1 text-sm font-semibold text-[#1a3a2a]">{economics?.seedRate || '--'}</p>
              </div>
              <div className="rounded-xl bg-[#faf8f5] p-3">
                <p className="text-xs uppercase tracking-[0.08em] text-[#6b7280]">{t('advisory.seed.spacing', 'Spacing')}</p>
                <p className="mt-1 text-sm font-semibold text-[#1a3a2a]">{economics?.spacing || '--'}</p>
              </div>
              <div className="rounded-xl bg-[#faf8f5] p-3">
                <p className="text-xs uppercase tracking-[0.08em] text-[#6b7280]">{t('advisory.seed.sowingDepth', 'Sowing depth')}</p>
                <p className="mt-1 text-sm font-semibold text-[#1a3a2a]">{t('advisory.seed.sowingDepthValue', '2-5 cm (crop and soil dependent)')}</p>
              </div>
              <div className="rounded-xl bg-[#faf8f5] p-3">
                <p className="text-xs uppercase tracking-[0.08em] text-[#6b7280]">{t('advisory.seed.seedTreatment', 'Seed treatment')}</p>
                <p className="mt-1 text-sm font-semibold text-[#1a3a2a]">{t('advisory.seed.seedTreatmentValue', 'Use certified seed and treat with recommended fungicide/bio-agent')}</p>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-[#e8e0d8] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#6b7280]">🐛 {t('advisory.section.pestDisease', 'Pest & Disease Management')}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {(economics?.pests || []).slice(0, 3).map((pest, index) => (
                <article key={pest.name} className={['rounded-xl border-l-4 p-4', severityClass(index)].join(' ')}>
                  <p className="text-sm font-bold text-[#1a3a2a]">{isHindi ? (pest.nameHi || t('advisory.pest.riskLabel', { count: index + 1, defaultValue: `जोखिम ${index + 1}` })) : pest.name}</p>
                  <p className="mt-2 text-sm text-[#4b5563]">{t('advisory.pest.prevention', 'Prevention')}: {isHindi ? (pest.preventionHi || t('advisory.pest.genericPrevention', 'नियमित निगरानी और आवश्यकता अनुसार लक्षित नियंत्रण अपनाएं।')) : pest.prevention}</p>
                  <p className="mt-2 text-sm text-[#4b5563]">{t('advisory.pest.watchPeriod', 'Watch period')}: {t('advisory.pest.watchPeriodValue', 'Peak vegetative to reproductive stage')}</p>
                </article>
              ))}
            </div>
            <p className="mt-3 text-[15px] text-[#4b5563]">{t('advisory.backendGuidance', 'Backend guidance')}: {backendPestText}</p>
          </article>

          <article className="rounded-2xl border border-[#e8e0d8] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#6b7280]">🌤️ {t('advisory.section.weatherHarvest', 'Weather & Harvest')}</p>
            <p className="mt-3 text-[15px] leading-7 text-[#4b5563]">{weatherSensitivityText}</p>
            <p className="mt-3 text-[15px] leading-7 text-[#4b5563]">{t('advisory.weather.harvestIndicators', 'Harvest indicators')}: {harvestIndicatorsText}</p>
            <p className="mt-3 text-[15px] leading-7 text-[#4b5563]">{t('advisory.weather.backendWeatherNote', 'Backend weather note')}: {backendWeatherText}</p>
          </article>
        </section>

        <section className="mt-10 rounded-2xl border border-[#e8e0d8] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] sm:p-8">
          <h2 className="font-heading text-3xl font-bold text-[#1a3a2a]">💰 {t('advisory.profit.title', 'Profit Estimation')}</h2>
          <p className="mt-2 text-[15px] text-[#6b7280]">
            {t('advisory.profit.basedOnArea', {
              hectares: areaInfo.hectares.toFixed(2),
              acres: areaInfo.acres != null ? ` (${areaInfo.acres} ${t('advisory.unit.acres', 'acres')})` : '',
              defaultValue: `Based on your land area of ${areaInfo.hectares.toFixed(2)} hectares${areaInfo.acres != null ? ` (${areaInfo.acres} acres)` : ''}`,
            })}
          </p>
          {areaInfo.usedDefault ? (
            <p className="mt-2 text-sm text-amber-700">{t('advisory.profit.missingAreaDefault', 'Land area was missing. Defaulted to 1 hectare for estimation.')}</p>
          ) : null}

          <div className="mt-6 hidden overflow-x-auto md:block">
            <table className="w-full min-w-[900px] overflow-hidden rounded-xl border border-[#d1e7dd] text-sm">
              <thead className="bg-[#f0fdf4] text-[#1a3a2a]">
                <tr>
                  <th className="px-4 py-3 text-left">{t('advisory.profit.metric', 'Metric')}</th>
                  {profitRows.map((row, index) => (
                    <th key={row.cropKey || index} className="px-4 py-3 text-left">{index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'} {row.displayName}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-[#d1e7dd] bg-white">
                  <td className="px-4 py-3 font-medium">{t('advisory.profit.expectedYield', 'Expected Yield (total)')}</td>
                  {profitRows.map((row, index) => (
                    <td key={`yield-${row.cropKey || index}`} className="px-4 py-3">{row.expectedYield ? `${row.expectedYield.toFixed(2)} ${formatUnit(row.econ?.unit, isHindi)}` : '--'}</td>
                  ))}
                </tr>
                <tr className="border-t border-[#d1e7dd] bg-white">
                  <td className="px-4 py-3 font-medium">{t('advisory.profit.costOfCultivation', 'Cost of Cultivation')}</td>
                  {profitRows.map((row, index) => (
                    <td key={`cost-${row.cropKey || index}`} className="px-4 py-3">₹ {formatINR(row.totalCost, localeCode)}</td>
                  ))}
                </tr>
                <tr className="border-t border-[#d1e7dd] bg-white">
                  <td className="px-4 py-3 font-medium">{t('advisory.profit.revenueMsp', 'Revenue @ MSP')}</td>
                  {profitRows.map((row, index) => (
                    <td key={`rev-msp-${row.cropKey || index}`} className="px-4 py-3">
                      {row.revenueMSP == null ? (
                        <span title={t('advisory.profit.noMspTitle', 'This crop has no government Minimum Support Price. Sell through wholesale mandis or contract farming.')}>{t('advisory.profit.noMsp', 'No MSP (market-dependent)')}</span>
                      ) : (
                        `₹ ${formatINR(row.revenueMSP, localeCode)}`
                      )}
                    </td>
                  ))}
                </tr>
                <tr className="border-t border-[#d1e7dd] bg-white">
                  <td className="px-4 py-3 font-medium">{t('advisory.profit.revenueWholesale', 'Revenue @ Wholesale')}</td>
                  {profitRows.map((row, index) => (
                    <td key={`rev-w-${row.cropKey || index}`} className="px-4 py-3">₹ {formatINR(row.revenueWholesale, localeCode)}</td>
                  ))}
                </tr>
                <tr className="border-t border-[#d1e7dd] bg-white">
                  <td className="px-4 py-3 font-medium">{t('advisory.profit.revenueDealer', 'Revenue @ Dealer')}</td>
                  {profitRows.map((row, index) => (
                    <td key={`rev-d-${row.cropKey || index}`} className="px-4 py-3">₹ {formatINR(row.revenueDealer, localeCode)}</td>
                  ))}
                </tr>
                <tr className="border-t border-[#d1e7dd] bg-white">
                  <td className="px-4 py-3 font-medium">{t('advisory.profit.profitMsp', 'Profit @ MSP')}</td>
                  {profitRows.map((row, index) => (
                    <td
                      key={`profit-msp-${row.cropKey || index}`}
                      className={[
                        'px-4 py-3',
                        row.profitMSP != null && bestByScenario.msp === index ? 'bg-[#dcfce7] font-semibold text-[#166534]' : '',
                      ].join(' ')}
                    >
                      {row.profitMSP == null ? t('advisory.profit.noMspShort', 'No MSP') : `₹ ${formatINR(row.profitMSP, localeCode)}`}
                      {row.profitMSP != null && bestByScenario.msp === index ? '  ⭐' : ''}
                    </td>
                  ))}
                </tr>
                <tr className="border-t border-[#d1e7dd] bg-white">
                  <td className="px-4 py-3 font-medium">{t('advisory.profit.profitWholesale', 'Profit @ Wholesale')}</td>
                  {profitRows.map((row, index) => (
                    <td
                      key={`profit-w-${row.cropKey || index}`}
                      className={[
                        'px-4 py-3',
                        bestByScenario.wholesale === index ? 'bg-[#dcfce7] font-semibold text-[#166534]' : '',
                      ].join(' ')}
                    >
                      ₹ {formatINR(row.profitWholesale, localeCode)}
                      {bestByScenario.wholesale === index ? '  ⭐' : ''}
                    </td>
                  ))}
                </tr>
                <tr className="border-t border-[#d1e7dd] bg-white">
                  <td className="px-4 py-3 font-medium">{t('advisory.profit.profitDealer', 'Profit @ Dealer')}</td>
                  {profitRows.map((row, index) => (
                    <td
                      key={`profit-d-${row.cropKey || index}`}
                      className={[
                        'px-4 py-3',
                        bestByScenario.dealer === index ? 'bg-[#dcfce7] font-semibold text-[#166534]' : '',
                      ].join(' ')}
                    >
                      ₹ {formatINR(row.profitDealer, localeCode)}
                      {bestByScenario.dealer === index ? '  ⭐' : ''}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-6 grid gap-4 md:hidden">
            {profitRows.map((row, index) => (
              <article key={`mobile-${row.cropKey || index}`} className="rounded-xl border border-[#d1e7dd] bg-[#f9fffb] p-4">
                <p className="font-heading text-xl font-bold text-[#1a3a2a]">{index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'} {row.displayName}</p>
                <div className="mt-3 space-y-2 text-sm text-[#334155]">
                  <p>{t('advisory.profit.expectedYieldMobile', 'Expected yield')}: {row.expectedYield ? `${row.expectedYield.toFixed(2)} ${formatUnit(row.econ?.unit, isHindi)}` : '--'}</p>
                  <p>{t('advisory.profit.costMobile', 'Cost')}: ₹ {formatINR(row.totalCost, localeCode)}</p>
                  <p>{t('advisory.profit.revenueMspMobile', 'Revenue @ MSP')}: {row.revenueMSP == null ? t('advisory.profit.noMsp', 'No MSP (market-dependent)') : `₹ ${formatINR(row.revenueMSP, localeCode)}`}</p>
                  <p>{t('advisory.profit.revenueWholesale', 'Revenue @ Wholesale')}: ₹ {formatINR(row.revenueWholesale, localeCode)}</p>
                  <p>{t('advisory.profit.revenueDealer', 'Revenue @ Dealer')}: ₹ {formatINR(row.revenueDealer, localeCode)}</p>
                  <p className="font-semibold text-[#166534]">{t('advisory.profit.profitWholesale', 'Profit @ Wholesale')}: ₹ {formatINR(row.profitWholesale, localeCode)}</p>
                  <p className="font-semibold text-[#166534]">{t('advisory.profit.profitDealer', 'Profit @ Dealer')}: ₹ {formatINR(row.profitDealer, localeCode)}</p>
                </div>
              </article>
            ))}
          </div>

          <p className="mt-5 text-sm text-[#6b7280]">
            {t('advisory.profit.disclaimer', 'Estimates are based on average yield and 2024-25 prices. Actual returns depend on weather, input quality, and market conditions.')}
          </p>
          <p className="mt-2 text-sm text-[#6b7280]">
            {t('advisory.profit.schemeNote', 'Check PM-KISAN, PMFBY crop insurance, and state MSP procurement availability in your district.')}
          </p>
        </section>

        <section className="mt-8 grid gap-3 md:grid-cols-3">
          <button
            type="button"
            onClick={backToResults}
            className="min-h-[56px] rounded-lg border-2 border-[#1a3a2a] bg-white px-5 py-3 text-[16px] font-bold text-[#1a3a2a] transition duration-200 hover:bg-[#edf3ef]"
          >
            ← {t('advisory.actions.backToResults', 'Back to Results')}
          </button>
          <button
            type="button"
            onClick={startNewPlan}
            className="min-h-[56px] rounded-lg bg-[#1a3a2a] px-5 py-3 text-[16px] font-bold text-white transition duration-200 hover:bg-[#24513a]"
          >
            🔄 {t('advisory.actions.startNewPlan', 'Start New Plan')}
          </button>
          <button
            type="button"
            title={t('advisory.actions.downloadTitle', 'PDF export is coming soon')}
            className="min-h-[56px] cursor-not-allowed rounded-lg border border-[#c8d5c8] bg-[#f4f7f4] px-5 py-3 text-[16px] font-semibold text-[#5b6a5f]"
          >
            📥 {t('advisory.actions.downloadComingSoon', 'Download Advisory (PDF) - Coming Soon')}
          </button>
        </section>

        <p className="mx-auto mt-5 max-w-3xl text-center text-sm italic text-gray-500">
          ⚠️ {t('advisory.footer.warning', 'AI-based advisory. Consult local agricultural experts before final planting decisions.')}
        </p>
      </main>
    </div>
  )
}
