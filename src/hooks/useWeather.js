import { useState, useEffect, useCallback } from 'react'

// Default: Delhi, India (fallback when geolocation is unavailable or denied)
const DEFAULT_LAT = 28.6139
const DEFAULT_LON = 77.209
const DEFAULT_LABEL = 'Delhi, India'

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast'

function buildUrl(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: 'temperature_2m,relative_humidity_2m,precipitation',
    timezone: 'auto',
  })
  return `${OPEN_METEO_URL}?${params.toString()}`
}

export function useWeather() {
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
  }, [fetchWeather])

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
