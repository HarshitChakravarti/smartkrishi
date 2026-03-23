import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from '../components/Layout'
import {
  AccordionSection,
  Badge,
  Card,
  MetricTile,
  PrimaryButton,
  SecondaryButton,
  SectionHeading,
  SkeletonBlock,
} from '../components/ui'
import { fetchCropRecommendation } from '../lib/cropApi'
import { buildAdvisory } from '../lib/advisory'

function readStorage(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export default function Results() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [apiResult, setApiResult] = useState(null)
  const [requestData, setRequestData] = useState(null)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let isActive = true

    async function runPrediction() {
      const storedData = readStorage('cropRecommendation', null)

      if (!storedData) {
        navigate('/predict')
        return
      }

      setError('')
      setApiResult(null)
      setRequestData(storedData)

      try {
        const result = await fetchCropRecommendation(storedData, 5)
        if (isActive) setApiResult(result)
      } catch (err) {
        if (isActive) {
          setError(err instanceof Error ? err.message : t('results.error.body'))
        }
      }
    }

    runPrediction()
    return () => {
      isActive = false
    }
  }, [navigate, reloadKey, t])

  const recommendation = requestData && apiResult ? buildAdvisory(requestData, apiResult, t) : null

  useEffect(() => {
    if (!recommendation) return

    const latest = recommendation.topRecommendations[0]
    if (!latest) return

    const entry = {
      generatedAt: recommendation.generatedAt || new Date().toISOString(),
      crop: latest.crop,
      confidence: latest.confidence,
      reason: latest.reason,
      yieldRange: latest.yieldRange,
    }

    const existing = readStorage('smartkrishiHistory', [])
    const nextHistory = [entry, ...existing.filter((item) => item.generatedAt !== entry.generatedAt)].slice(0, 5)
    window.localStorage.setItem('smartkrishiHistory', JSON.stringify(nextHistory))
  }, [recommendation])

  if (error && !recommendation) {
    return (
      <Layout title={t('results.title')} subtitle={t('results.subtitle')} showBack>
        <div className="space-y-4">
          <Card className="border-rose-200 bg-rose-50">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-700">
              {t('results.error.eyebrow')}
            </div>
            <div className="mt-2 text-2xl font-extrabold text-rose-900">{t('results.error.title')}</div>
            <div className="mt-2 max-w-2xl text-sm leading-6 text-rose-800">{error}</div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <SecondaryButton onClick={() => navigate('/predict')} className="w-full">
                {t('results.actions.reviewInputs')}
              </SecondaryButton>
              <PrimaryButton onClick={() => setReloadKey((value) => value + 1)} className="w-full">
                {t('common.retry')}
              </PrimaryButton>
            </div>
          </Card>
        </div>
      </Layout>
    )
  }

  if (!recommendation) {
    return (
      <Layout title={t('results.title')} subtitle={t('results.subtitle')} showBack>
        <div className="space-y-4">
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="w-full max-w-lg space-y-3">
                <SkeletonBlock className="h-4 w-32" />
                <SkeletonBlock className="h-10 w-64" />
                <SkeletonBlock className="h-4 w-full" />
                <SkeletonBlock className="h-4 w-5/6" />
              </div>
              <SkeletonBlock className="h-10 w-28" />
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <SkeletonBlock className="h-24" />
              <SkeletonBlock className="h-24" />
              <SkeletonBlock className="h-24" />
            </div>
          </Card>
          <div className="grid gap-4 lg:grid-cols-3">
            <SkeletonBlock className="h-44" />
            <SkeletonBlock className="h-44" />
            <SkeletonBlock className="h-44" />
          </div>
          <SkeletonBlock className="h-28" />
          <SkeletonBlock className="h-28" />
        </div>
      </Layout>
    )
  }

  const topPick = recommendation.topRecommendations[0]

  return (
    <Layout title={t('results.title')} subtitle={t('results.subtitle')} showBack>
      <div className="space-y-4">
        <Card className="panel-grid overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-agri-ink-soft">
                {t('results.readyLabel')}
              </div>
              <div className="mt-2 text-3xl font-extrabold text-agri-ink sm:text-4xl">{recommendation.bestCrop}</div>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-agri-ink-soft sm:text-base">{topPick?.reason}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="success">{t('results.aiConfidence', { value: recommendation.aiConfidence })}</Badge>
              <Badge tone="wheat">{recommendation.basedOn}</Badge>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <MetricTile
              label={t('results.topPick')}
              value={topPick?.crop || recommendation.bestCrop}
              caption={t('results.expectedYield')}
              tone="success"
            />
            <MetricTile
              label={t('results.expectedYield')}
              value={topPick?.yieldRange || '--'}
              caption={t('results.trustNote')}
              tone="wheat"
            />
            <MetricTile
              label={t('results.modelConfidence')}
              value={`${topPick?.baseConfidence || recommendation.aiConfidence}%`}
              caption={t('results.personalizedSignal')}
              tone="soil"
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {recommendation.summaryChips.map((chip) => (
              <Badge key={chip}>{chip}</Badge>
            ))}
          </div>
        </Card>

        <section className="space-y-4">
          <SectionHeading
            eyebrow={t('results.rankingEyebrow')}
            title={t('results.topChoices')}
            description={t('results.topChoicesDescription')}
          />

          <div className="grid gap-4 lg:grid-cols-3">
            {recommendation.topRecommendations.map((item) => (
              <Card key={item.crop} className="flex h-full flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-agri-ink-soft">
                      {t('results.rank', { value: item.rank })}
                    </div>
                    <div className="mt-1 text-2xl font-extrabold text-agri-ink">{item.crop}</div>
                  </div>
                  <Badge tone={item.rank === 1 ? 'success' : 'neutral'}>
                    {t('results.aiConfidence', { value: item.confidence })}
                  </Badge>
                </div>

                <div className="rounded-2xl bg-agri-muted px-4 py-3 text-sm leading-6 text-agri-ink-soft">
                  {item.reason}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <MetricTile label={t('results.expectedYield')} value={item.yieldRange} caption={t('results.trustNote')} tone="wheat" />
                  <MetricTile label={t('results.modelConfidence')} value={`${item.baseConfidence}%`} caption={t('results.baseModel')} tone="neutral" />
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <SectionHeading
            eyebrow={t('results.advisoryEyebrow')}
            title={t('results.advisoryTitle')}
            description={t('results.advisoryDescription')}
          />

          <div className="space-y-3">
            {recommendation.advisorySections.map((section, index) => (
              <AccordionSection
                key={section.id}
                title={section.title}
                summary={section.summary}
                icon={section.icon}
                defaultOpen={index === 0}
              >
                <div className="space-y-3">
                  {section.items.map((item, itemIndex) => (
                    <div key={item} className="flex items-start gap-3 rounded-2xl bg-agri-muted px-4 py-3">
                      <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-agri-green text-xs font-bold text-white">
                        {itemIndex + 1}
                      </div>
                      <div className="text-sm leading-6 text-agri-ink-soft">{item}</div>
                    </div>
                  ))}
                </div>
              </AccordionSection>
            ))}
          </div>
        </section>

        <p className="text-xs leading-6 text-agri-ink-soft">{recommendation.trustNote}</p>

        <div className="grid gap-3 sm:grid-cols-2">
          <SecondaryButton onClick={() => navigate('/predict')} className="w-full">
            {t('results.actions.reviewInputs')}
          </SecondaryButton>
          <PrimaryButton onClick={() => navigate('/predict')} className="w-full">
            {t('results.actions.newSuggestion')}
          </PrimaryButton>
        </div>
      </div>
    </Layout>
  )
}
