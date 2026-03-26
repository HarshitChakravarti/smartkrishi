import { useState, useEffect, useCallback } from 'react'

// Default: Delhi, India (fallback when geolocation is unavailable or denied)
const DEFAULT_LAT = 28.6139
const DEFAULT_LON = 77.209
const DEFAULT_LABEL = 'Delhi, India'

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast'
const OPEN_METEO_GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search'

function buildUrl(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: 'temperature_2m,relative_humidity_2m,precipitation',
    timezone: 'auto',
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

export function useWeather(options = {}) {
  const { useGeolocation = true, placeName = '' } = options
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [coords, setCoords] = useState({
    lat: DEFAULT_LAT,
    lon: DEFAULT_LON,
    locationLabel: DEFAULT_LABEL,
    source: 'fallback',
  })

  const fetchWeather = useCallback(async (lat, lon, options = {}) => {
    const locationLabel = options.locationLabel || DEFAULT_LABEL
    const source = options.source || 'fallback'

    setLoading(true)
    setError(null)
    try {
      const res = await fetch(buildUrl(lat, lon))
      if (!res.ok) throw new Error('Weather fetch failed')
      const json = await res.json()
      setData({
        temperature: json.current?.temperature_2m ?? null,
        humidity: json.current?.relative_humidity_2m ?? null,
        precipitation: json.current?.precipitation ?? null,
        locationLabel,
        source,
      })
      setCoords({ lat, lon, locationLabel, source })
    } catch (err) {
      setError(err.message)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!useGeolocation) {
      if (!placeName) {
        fetchWeather(DEFAULT_LAT, DEFAULT_LON, {
          locationLabel: DEFAULT_LABEL,
          source: 'fallback',
        })
        return
      }

      let cancelled = false
      async function runPlaceLookup() {
        try {
          const resolved = await resolveLocationByName(placeName)
          if (cancelled) return
          await fetchWeather(resolved.lat, resolved.lon, {
            locationLabel: resolved.locationLabel,
            source: 'selected_location',
          })
        } catch {
          if (cancelled) return
          fetchWeather(DEFAULT_LAT, DEFAULT_LON, {
            locationLabel: DEFAULT_LABEL,
            source: 'fallback',
          })
        }
      }

      runPlaceLookup()
      return () => {
        cancelled = true
      }
    }

    if (!navigator.geolocation) {
      fetchWeather(DEFAULT_LAT, DEFAULT_LON, {
        locationLabel: DEFAULT_LABEL,
        source: 'fallback',
      })
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        fetchWeather(latitude, longitude, {
          locationLabel: 'Your farm area',
          source: 'local',
        })
      },
      () => {
        fetchWeather(DEFAULT_LAT, DEFAULT_LON, {
          locationLabel: DEFAULT_LABEL,
          source: 'fallback',
        })
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    )
  }, [fetchWeather, placeName, useGeolocation])

  const refetch = useCallback(() => {
    fetchWeather(coords.lat, coords.lon, {
      locationLabel: coords.locationLabel,
      source: coords.source,
    })
  }, [fetchWeather, coords.lat, coords.locationLabel, coords.lon, coords.source])

  return {
    data,
    loading,
    error,
    refetch,
  }
}
