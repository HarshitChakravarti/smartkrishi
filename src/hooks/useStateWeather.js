import { useCallback, useEffect, useMemo, useState } from 'react'
import rainfallData from '../data/climate/rainfall_by_state_month.json'
import temperatureData from '../data/climate/temperature_by_state_month.json'
import humidityData from '../data/climate/humidity_by_state_month.json'

function getHistoricalClimate(state, month) {
  return {
    temperature: temperatureData?.[state]?.[month] ?? temperatureData?.India?.[month] ?? 25,
    humidity: humidityData?.[state]?.[month] ?? humidityData?.India?.[month] ?? 60,
    precipitation: rainfallData?.[state]?.[month] ?? rainfallData?.India?.[month] ?? 100,
    source: 'historical_average',
  }
}

export function useStateWeather({ state, district, farmingMonth }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const requestKey = useMemo(
    () => `${state || ''}|${district || ''}|${farmingMonth || ''}`,
    [district, farmingMonth, state],
  )

  const fetchWeather = useCallback(async () => {
    if (!state) {
      setData(null)
      return
    }

    setLoading(true)
    setError('')

    try {
      const month = farmingMonth || 'June'
      const climate = getHistoricalClimate(state, month)
      setData({
        ...climate,
        month,
        locationLabel: `${district || state}, ${state}`,
        mode: 'planning',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Historical climate unavailable')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [district, farmingMonth, state])

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
