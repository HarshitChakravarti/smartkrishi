const API_BASE = import.meta.env.VITE_CROP_API_URL || 'http://localhost:8000'

export async function getCropRecommendation(formData) {
  const response = await fetch(`${API_BASE}/api/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const detail = data?.detail
    const detailMessage = typeof detail === 'string' ? detail : detail?.error
    throw new Error(detailMessage || `Recommendation failed (${response.status})`)
  }

  return data
}

export async function checkApiHealth() {
  const response = await fetch(`${API_BASE}/api/health`)
  return response.json()
}
