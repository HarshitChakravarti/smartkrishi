import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from '../components/Layout'
import { Card, PrimaryButton, SecondaryButton } from '../components/ui'

const MOCK_RESULTS = [
  {
    diseaseKey: 'disease.case.bacterial',
    treatmentKeys: [
      'disease.case.bacterial.t1',
      'disease.case.bacterial.t2',
      'disease.case.bacterial.t3',
      'disease.case.bacterial.t4',
    ],
  },
  {
    diseaseKey: 'disease.case.brownSpot',
    treatmentKeys: [
      'disease.case.brownSpot.t1',
      'disease.case.brownSpot.t2',
      'disease.case.brownSpot.t3',
      'disease.case.brownSpot.t4',
    ],
  },
  {
    diseaseKey: 'disease.case.healthy',
    treatmentKeys: ['disease.case.healthy.t1', 'disease.case.healthy.t2'],
  },
]

export default function DiseaseDetection() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [result, setResult] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onloadend = () => setImagePreview(reader.result)
      reader.readAsDataURL(file)
      setResult(null)
    }
  }

  const handleAnalyze = () => {
    if (!selectedImage) {
      alert(t('disease.selectPhotoAlert'))
      return
    }
    setIsAnalyzing(true)
    setTimeout(() => {
      const randomResult = MOCK_RESULTS[Math.floor(Math.random() * MOCK_RESULTS.length)]
      setResult(randomResult)
      setIsAnalyzing(false)
    }, 2000)
  }

  return (
    <Layout
      title={t('disease.title')}
      subtitle={t('disease.subtitle')}
      showBack
    >
      <div className="mx-auto max-w-3xl px-4 py-6 space-y-4">
        <Card className="p-0 overflow-hidden">
          <div className="bg-black/90 text-white px-5 py-3 flex items-center justify-between">
            <div className="font-extrabold">📷 {t('disease.camera')}</div>
            {imagePreview ? (
              <button
                onClick={() => {
                  setSelectedImage(null)
                  setImagePreview(null)
                  setResult(null)
                }}
                className="text-sm font-extrabold underline"
              >
                {t('disease.remove')}
              </button>
            ) : null}
          </div>
          <div className="bg-black flex items-center justify-center aspect-[4/3]">
            {imagePreview ? (
              <img
                src={imagePreview}
                alt={t('disease.leafPreview')}
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <div className="text-center text-white/80 px-6">
                <div className="text-7xl">🍃</div>
                <div className="mt-3 text-lg font-extrabold">
                  {t('disease.leafPrompt')}
                </div>
                <div className="mt-1 text-sm font-semibold">
                  {t('disease.lightTip')}
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card className="bg-agri-muted">
          <label className="block">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            <div className="w-full rounded-3xl py-5 px-6 text-xl sm:text-2xl font-extrabold bg-white border border-black/10 text-gray-900 shadow-sm hover:bg-agri-bg transition active:scale-[0.99] text-center">
              📷 {t('disease.upload')}
            </div>
          </label>
          <div className="mt-4">
            <PrimaryButton onClick={handleAnalyze} disabled={!imagePreview || isAnalyzing}>
              {isAnalyzing
                ? `🔎 ${t('disease.checking')}`
                : `🔎 ${t('disease.check')}`}
            </PrimaryButton>
          </div>
        </Card>

        {result ? (
          <Card>
            <div className="text-sm font-extrabold text-gray-800">
              {t('disease.result')}
            </div>
            <div className="mt-2 text-3xl sm:text-4xl font-extrabold text-agri-green">
              {t(result.disease)}
            </div>
            <div className="mt-5">
              <div className="text-2xl font-extrabold text-gray-900">
                ✅ {t('disease.whatToDo')}
              </div>
              <div className="mt-3 space-y-3">
                {result.treatmentKeys.map((key, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl bg-agri-muted border border-black/5 p-4 flex items-start gap-3"
                  >
                    <div className="text-2xl font-extrabold text-agri-green">{idx + 1}</div>
                    <div className="text-base sm:text-lg font-semibold text-gray-800">
                      {t(key)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <SecondaryButton onClick={() => navigate('/')}>
            🏠 {t('common.home')}
          </SecondaryButton>
          <PrimaryButton
            onClick={() => {
              setSelectedImage(null)
              setImagePreview(null)
              setResult(null)
            }}
          >
            🔄 {t('disease.newPhoto')}
          </PrimaryButton>
        </div>
      </div>
    </Layout>
  )
}
