function toTitleCase(text) {
  if (!text) return ''
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function buildAdvisory(formInput, apiResult) {
  const humidity = Number(formInput.humidity)
  const rainfall = Number(formInput.rainfall)
  const ph = Number(formInput.ph)

  const bestCrop = toTitleCase(apiResult.best_base_crop || apiResult.best_crop)
  const personalizedBestCrop = toTitleCase(apiResult.best_crop)

  let irrigationKey = 'results.water.every5days'
  if (rainfall >= 8) irrigationKey = 'results.weather.heavyRain'
  else if (humidity >= 75) irrigationKey = 'results.water.every5days'

  const fertilizerPlan = []
  if (ph < 6) {
    fertilizerPlan.push({ icon: '🧪', key: 'Use lime or dolomite to raise soil pH gradually.' })
  } else if (ph > 7.5) {
    fertilizerPlan.push({ icon: '🧪', key: 'Use sulfur/organic compost to reduce alkalinity over time.' })
  }

  const bestCropLower = String(bestCrop).toLowerCase()
  if (bestCropLower === 'rice' || bestCropLower === 'maize') {
    fertilizerPlan.push({ icon: '🧴', key: 'Split nitrogen dose in 2-3 applications for better uptake.' })
  } else {
    fertilizerPlan.push({ icon: '🧴', key: 'Apply balanced NPK and increase organic matter with compost.' })
  }

  const pestAlerts = [
    {
      icon: '🐛',
      key:
        humidity > 80
          ? 'High humidity detected. Monitor fungal pests and leaf spots every 2-3 days.'
          : 'Scout field weekly for early pest signs and remove infested leaves quickly.',
    },
  ]

  const weatherAlerts = [
    {
      icon: '🌦️',
      key:
        rainfall > 10
          ? 'Heavy rain risk. Ensure field drainage to avoid waterlogging.'
          : 'No heavy rain risk now. Follow planned irrigation intervals.',
    },
  ]

  const friendlyTips = [
    { icon: '🌱', key: `Preferred crop from base model: ${bestCrop}` },
    { icon: '📋', key: `Personalized advisory priority: ${personalizedBestCrop}` },
  ]

  const baseTop3 = (apiResult.base_top_recommendations || []).slice(0, 3).map((row) => ({
    crop: toTitleCase(row.crop),
    probability: Number(row.base_probability) || 0,
  }))

  const advisoryTop3 = (apiResult.top_recommendations || []).slice(0, 3).map((row) => ({
    crop: toTitleCase(row.crop),
    probability: Number(row.personalized_probability) || 0,
  }))

  return {
    bestCrop,
    personalizedBestCrop,
    irrigationKey,
    fertilizerPlan,
    pestAlerts,
    weatherAlerts,
    friendlyTips,
    baseTop3,
    advisoryTop3,
  }
}
