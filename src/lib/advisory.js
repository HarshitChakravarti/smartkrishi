const YIELD_RANGE_MAP = {
  apple: '65-85 q/acre',
  banana: '180-220 q/acre',
  blackgram: '4-6 q/acre',
  chickpea: '7-9 q/acre',
  coconut: '35-50 nuts/tree/month',
  coffee: '5-7 q/acre',
  cotton: '7-10 q/acre',
  grapes: '90-120 q/acre',
  jute: '9-12 q/acre',
  kidneybeans: '6-8 q/acre',
  lentil: '5-7 q/acre',
  maize: '16-22 q/acre',
  mango: '35-50 q/acre',
  mothbeans: '4-5 q/acre',
  mungbean: '4-6 q/acre',
  muskmelon: '80-110 q/acre',
  orange: '70-95 q/acre',
  papaya: '140-180 q/acre',
  pigeonpeas: '6-8 q/acre',
  pomegranate: '50-70 q/acre',
  rice: '18-24 q/acre',
  watermelon: '90-125 q/acre',
  wheat: '16-20 q/acre',
}

const SMALL_FARM_CROPS = new Set([
  'grapes',
  'apple',
  'orange',
  'pomegranate',
  'papaya',
  'watermelon',
  'muskmelon',
  'mungbean',
  'blackgram',
])

const LARGE_FARM_CROPS = new Set([
  'rice',
  'maize',
  'cotton',
  'jute',
  'banana',
  'coconut',
  'pigeonpeas',
])

function toTitleCase(text) {
  if (!text) return ''
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function formatSeasonLabel(season, t) {
  const normalized = String(season || 'kharif').toLowerCase()
  return t(`predict.season.${normalized}`)
}

function buildReason(crop, formInput, t) {
  const parts = []
  const rainfall = Number(formInput.rainfall)
  const ph = Number(formInput.ph)
  const humidity = Number(formInput.humidity)
  const farmSize = Number(formInput.farmSize)

  if (rainfall >= 8) parts.push(t('results.reason.rainHigh'))
  else if (rainfall >= 3) parts.push(t('results.reason.rainModerate'))
  else parts.push(t('results.reason.rainLight'))

  if (ph >= 6 && ph <= 7.5) parts.push(t('results.reason.phBalanced'))
  else parts.push(t('results.reason.phManaged'))

  parts.push(t('results.reason.seasonFit', { season: formatSeasonLabel(formInput.season, t) }))

  if (humidity >= 75) parts.push(t('results.reason.humiditySupport'))

  const cropKey = String(crop || '').toLowerCase()
  if (farmSize <= 2 && SMALL_FARM_CROPS.has(cropKey)) {
    parts.push(t('results.reason.smallFarmFit'))
  } else if (farmSize > 6 && LARGE_FARM_CROPS.has(cropKey)) {
    parts.push(t('results.reason.largeFarmFit'))
  }

  return parts.slice(0, 2).join(' + ')
}

function getYieldRange(crop) {
  return YIELD_RANGE_MAP[String(crop || '').toLowerCase()] || '8-12 q/acre'
}

function buildIrrigationItems(formInput, t) {
  const rainfall = Number(formInput.rainfall)
  const humidity = Number(formInput.humidity)

  if (rainfall >= 8) {
    return [
      t('results.advice.irrigation.heavy.1'),
      t('results.advice.irrigation.heavy.2'),
      t('results.advice.irrigation.heavy.3'),
    ]
  }

  if (humidity >= 75) {
    return [
      t('results.advice.irrigation.humid.1'),
      t('results.advice.irrigation.humid.2'),
      t('results.advice.irrigation.humid.3'),
    ]
  }

  return [
    t('results.advice.irrigation.normal.1'),
    t('results.advice.irrigation.normal.2'),
    t('results.advice.irrigation.normal.3'),
  ]
}

function buildFertilizerItems(formInput, bestCrop, t) {
  const ph = Number(formInput.ph)
  const items = []

  if (ph < 6) items.push(t('results.advice.fertilizer.phLow'))
  else if (ph > 7.5) items.push(t('results.advice.fertilizer.phHigh'))

  const crop = String(bestCrop || '').toLowerCase()
  if (crop === 'rice' || crop === 'maize') {
    items.push(t('results.advice.fertilizer.cereal'))
  } else if (crop === 'cotton') {
    items.push(t('results.advice.fertilizer.cash'))
  } else {
    items.push(t('results.advice.fertilizer.general'))
  }

  items.push(t('results.advice.fertilizer.organic'))
  return items
}

function buildPestItems(formInput, t) {
  const humidity = Number(formInput.humidity)

  if (humidity >= 80) {
    return [
      t('results.advice.pest.humid.1'),
      t('results.advice.pest.humid.2'),
      t('results.advice.pest.humid.3'),
    ]
  }

  return [
    t('results.advice.pest.normal.1'),
    t('results.advice.pest.normal.2'),
    t('results.advice.pest.normal.3'),
  ]
}

function buildWeatherItems(formInput, t) {
  const rainfall = Number(formInput.rainfall)

  if (rainfall >= 10) {
    return [
      t('results.advice.weather.heavy.1'),
      t('results.advice.weather.heavy.2'),
      t('results.advice.weather.heavy.3'),
    ]
  }

  return [
    t('results.advice.weather.normal.1'),
    t('results.advice.weather.normal.2'),
    t('results.advice.weather.normal.3'),
  ]
}

export function buildAdvisory(formInput, apiResult, t) {
  const topRecommendations = (apiResult.top_recommendations || []).slice(0, 3).map((row, index) => {
    const crop = toTitleCase(row.crop)
    const confidence = clamp(Math.round((Number(row.personalized_probability) || 0) * 100), 1, 99)

    return {
      rank: index + 1,
      crop,
      confidence,
      reason: buildReason(crop, formInput, t),
      yieldRange: getYieldRange(crop),
      baseConfidence: clamp(Math.round((Number(row.base_probability) || 0) * 100), 1, 99),
    }
  })

  const bestCrop = topRecommendations[0]?.crop || toTitleCase(apiResult.best_crop)
  const aiConfidence = topRecommendations[0]?.confidence || 87

  return {
    bestCrop,
    aiConfidence,
    basedOn: t('results.basedOn'),
    trustNote: t('results.trustNote'),
    generatedAt: apiResult.generated_at,
    topRecommendations,
    summaryChips: [
      `${t('predict.farm.title')}: ${Number(formInput.farmSize).toFixed(1)} ${t('predict.farm.unit')}`,
      `${t('predict.season.title')}: ${formatSeasonLabel(formInput.season, t)}`,
      `pH: ${Number(formInput.ph).toFixed(1)}`,
      `${t('home.weather')}: ${Math.round(Number(formInput.temperature))}°C / ${Math.round(Number(formInput.humidity))}%`,
    ],
    advisorySections: [
      {
        id: 'irrigation',
        icon: '💧',
        title: t('results.sections.irrigation.title'),
        summary: t('results.sections.irrigation.summary'),
        items: buildIrrigationItems(formInput, t),
      },
      {
        id: 'fertilizer',
        icon: '🌱',
        title: t('results.sections.fertilizer.title'),
        summary: t('results.sections.fertilizer.summary'),
        items: buildFertilizerItems(formInput, bestCrop, t),
      },
      {
        id: 'pest',
        icon: '🛡️',
        title: t('results.sections.pest.title'),
        summary: t('results.sections.pest.summary'),
        items: buildPestItems(formInput, t),
      },
      {
        id: 'weather',
        icon: '⛅',
        title: t('results.sections.weather.title'),
        summary: t('results.sections.weather.summary'),
        items: buildWeatherItems(formInput, t),
      },
    ],
  }
}
