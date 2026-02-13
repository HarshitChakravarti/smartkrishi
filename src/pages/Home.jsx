import Layout from '../components/Layout'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BigActionButton, Card } from '../components/ui'
import { useWeather } from '../hooks/useWeather'

export default function Home() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { data: weather, loading: weatherLoading, error: weatherError, refetch: refetchWeather } = useWeather()

  return (
    <Layout>
      <div className="relative min-h-[calc(100vh-4rem)] min-h-[calc(100dvh-4rem)]">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/hero-farm.png')" }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/25 to-black/55" aria-hidden="true" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.15),transparent_60%)]" aria-hidden="true" />
        <div className="relative z-10 mx-auto max-w-3xl w-full px-4 py-8 flex flex-col min-h-[calc(100vh-4rem)]">
          <div className="pt-3">
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-black text-white drop-shadow-lg">
              {t('title')}
            </h1>
            <p className="mt-3 text-lg sm:text-xl font-semibold text-white/90 drop-shadow-md">
              {t('home.subtitle')}
            </p>
          </div>

          <div className="mt-8 space-y-4 flex-1">
            <BigActionButton
              icon="🌾"
              title={t('home.crop')}
              subtitle={t('home.crop.subtitle')}
              color="green"
              onClick={() => navigate('/predict')}
            />
            <BigActionButton
              icon="📋"
              title={t('home.advisory')}
              subtitle={t('home.advisory.subtitle')}
              color="yellow"
              onClick={() => navigate('/results')}
            />
            <BigActionButton
              icon="📷"
              title={t('home.disease')}
              subtitle={t('home.disease.subtitle')}
              color="blue"
              onClick={() => navigate('/disease')}
            />
          </div>

          <div className="mt-5 pb-6">
            <Card className="bg-agri-card/95 backdrop-blur border border-black/10 shadow-sm">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="text-sm font-extrabold text-agri-ink">
                    {t('home.weather')}
                  </div>
                  <div className="text-xs font-semibold text-gray-700">
                    {t('home.today')}
                  </div>
                </div>
                {weatherLoading ? (
                  <div className="text-sm font-semibold text-gray-500 animate-pulse">
                    {t('home.weather.loading')}
                  </div>
                ) : weatherError ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-500">{t('home.weather.unavailable')}</span>
                    <button
                      type="button"
                      onClick={refetchWeather}
                      className="text-xs font-bold text-agri-green underline"
                    >
                      {t('home.weather.retry')}
                    </button>
                  </div>
                ) : weather ? (
                  <div className="flex items-center gap-3 text-sm font-extrabold text-agri-ink">
                    <span className="inline-flex items-center gap-1">
                      ☀️ <span>{weather.temperature != null ? `${Math.round(weather.temperature)}°C` : '—'}</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      💧 <span>{weather.humidity != null ? `${weather.humidity}%` : '—'}</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      🌧️ <span>{weather.precipitation != null ? `${weather.precipitation}mm` : '—'}</span>
                    </span>
                  </div>
                ) : null}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  )
}
