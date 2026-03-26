import { useCallback, useEffect, useMemo, useState } from 'react'
import rainfallData from '../data/climate/rainfall_by_state_month.json'
import temperatureData from '../data/climate/temperature_by_state_month.json'
import humidityData from '../data/climate/humidity_by_state_month.json'
import { getCoordinates } from '../utils/stateCoordinates'

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast'
const OPEN_METEO_GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search'

function buildUrl(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: 'temperature_2m,relative_humidity_2m,precipitation',
    hourly: 'relative_humidity_2m',
    timezone: 'auto',
    forecast_days: '1',
  })
  return `${OPEN_METEO_URL}?${params.toString()}`
}

async function resolveLocationByName(placeName) {
  const params = new URLSearchParams({
    name: placeName,
    count: '1',
    language: 'en',
    format: 'json',
  })

  const res = await fetch(`${OPEN_METEO_GEOCODING_URL}?${params.toString()}`)
  if (!res.ok) {
    throw new Error('Location lookup failed')
  }

  const json = await res.json()
  const first = json?.results?.[0]
  if (!first) {
    throw new Error('Location not found')
  }

  const parts = [first.name, first.admin1, first.country].filter(Boolean)
  return {
    lat: first.latitude,
    lon: first.longitude,
    locationLabel: parts.join(', ') || placeName,
  }
}

function toMillis(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.getTime()
}

function getNearestHourlyHumidity(payload) {
  const times = payload?.hourly?.time
  const humidities = payload?.hourly?.relative_humidity_2m
  const currentTimeMs = toMillis(payload?.current?.time)

  if (!Array.isArray(times) || !Array.isArray(humidities) || currentTimeMs == null) {
    return null
  }

  let nearestIndex = -1
  let smallestDelta = Number.POSITIVE_INFINITY

  for (let index = 0; index < times.length; index += 1) {
    const candidateMs = toMillis(times[index])
    if (candidateMs == null) continue
    const delta = Math.abs(candidateMs - currentTimeMs)
    if (delta < smallestDelta) {
      smallestDelta = delta
      nearestIndex = index
    }
  }

  if (nearestIndex < 0) {
    return null
  }

  const value = humidities[nearestIndex]
  return typeof value === 'number' ? value : null
}

function getHistoricalClimate(state, month) {
  return {
    temperature: temperatureData?.[state]?.[month] ?? temperatureData?.India?.[month] ?? 25,
    humidity: humidityData?.[state]?.[month] ?? humidityData?.India?.[month] ?? 60,
    precipitation: rainfallData?.[state]?.[month] ?? rainfallData?.India?.[month] ?? 100,
    source: 'historical_average',
  }
}

export function useStateWeather({ state, district, mode, farmingMonth }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const requestKey = useMemo(
    () => `${state || ''}|${district || ''}|${mode || ''}|${farmingMonth || ''}`,
    [district, farmingMonth, mode, state],
  )

  const fetchWeather = useCallback(async () => {
    if (!state) {
      setData(null)
      return
    }

    setLoading(true)
    setError('')

    try {
      if (mode === 'planning') {
        const month = farmingMonth || 'June'
        const climate = getHistoricalClimate(state, month)
        setData({
          ...climate,
          month,
          locationLabel: `${district || state}, ${state}`,
          mode,
        })
        return
      }

      let location = null
      const placeCandidates = [`${district}, ${state}, India`, `${state}, India`]

      for (const candidate of placeCandidates) {
        try {
          location = await resolveLocationByName(candidate)
          break
        } catch {
          // Try next candidate before using static coordinates fallback.
        }
      }

      if (!location) {
        const fallbackCoords = getCoordinates(state, district)
        location = {
          ...fallbackCoords,
          locationLabel: `${district || state}, ${state}`,
        }
      }

      const { lat, lon } = location
      const res = await fetch(buildUrl(lat, lon))
      if (!res.ok) {
        throw new Error('Unable to fetch live weather')
      }

      const json = await res.json()
      const humidityFromHourly = getNearestHourlyHumidity(json)
      setData({
        temperature: json.current?.temperature_2m ?? null,
        humidity: humidityFromHourly ?? json.current?.relative_humidity_2m ?? null,
        precipitation: json.current?.precipitation ?? null,
        source: 'live_weather',
        month: farmingMonth || null,
        locationLabel: location.locationLabel,
        mode,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Weather unavailable')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [district, farmingMonth, mode, state])

  useEffect(() => {
    fetchWeather()
  }, [fetchWeather, requestKey])

  return {
    data,
    loading,
    error,
    refetch: fetchWeather,
  }
}
