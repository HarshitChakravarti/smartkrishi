const API_BASE = import.meta.env.VITE_CROP_API_URL || '/api'

function toNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function toApiPayload(formData) {
  return {
    N: toNumber(formData.nitrogen),
    P: toNumber(formData.phosphorus),
    K: toNumber(formData.potassium),
    temperature: toNumber(formData.temperature),
    humidity: toNumber(formData.humidity),
    ph: toNumber(formData.ph),
    rainfall: toNumber(formData.rainfall),
    farm_size: toNumber(formData.farmSize, 2),
    previous_crop: String(formData.previousCrop || 'none').toLowerCase(),
    season: String(formData.season || 'kharif').toLowerCase(),
  }
}

export async function fetchCropRecommendation(formData, topK = 5) {
  const payload = toApiPayload(formData)
  const response = await fetch(`${API_BASE}/recommend?top_k=${topK}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const json = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = json.error || 'Failed to fetch crop recommendation from server.'
    throw new Error(message)
  }

  return json
}
