import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MinistryNavbar from '../components/MinistryNavbar'
import { useWeather } from '../hooks/useWeather'

const STATES = [
  {
    value: 'Maharashtra',
    label: { en: 'Maharashtra', hi: 'महाराष्ट्र' },
    districts: [
      { value: 'Pune', label: { en: 'Pune', hi: 'पुणे' } },
      { value: 'Nashik', label: { en: 'Nashik', hi: 'नासिक' } },
      { value: 'Nagpur', label: { en: 'Nagpur', hi: 'नागपुर' } },
      { value: 'Aurangabad', label: { en: 'Aurangabad', hi: 'औरंगाबाद' } },
      { value: 'Kolhapur', label: { en: 'Kolhapur', hi: 'कोल्हापुर' } },
    ],
  },
  {
    value: 'Karnataka',
    label: { en: 'Karnataka', hi: 'कर्नाटक' },
    districts: [
      { value: 'Bengaluru Rural', label: { en: 'Bengaluru Rural', hi: 'बेंगलुरु ग्रामीण' } },
      { value: 'Mysuru', label: { en: 'Mysuru', hi: 'मैसूरु' } },
      { value: 'Belagavi', label: { en: 'Belagavi', hi: 'बेलगावी' } },
      { value: 'Dharwad', label: { en: 'Dharwad', hi: 'धारवाड़' } },
      { value: 'Raichur', label: { en: 'Raichur', hi: 'रायचूर' } },
    ],
  },
  {
    value: 'Gujarat',
    label: { en: 'Gujarat', hi: 'गुजरात' },
    districts: [
      { value: 'Ahmedabad', label: { en: 'Ahmedabad', hi: 'अहमदाबाद' } },
      { value: 'Surat', label: { en: 'Surat', hi: 'सूरत' } },
      { value: 'Rajkot', label: { en: 'Rajkot', hi: 'राजकोट' } },
      { value: 'Vadodara', label: { en: 'Vadodara', hi: 'वडोदरा' } },
      { value: 'Bhavnagar', label: { en: 'Bhavnagar', hi: 'भावनगर' } },
    ],
  },
  {
    value: 'Punjab',
    label: { en: 'Punjab', hi: 'पंजाब' },
    districts: [
      { value: 'Ludhiana', label: { en: 'Ludhiana', hi: 'लुधियाना' } },
      { value: 'Amritsar', label: { en: 'Amritsar', hi: 'अमृतसर' } },
      { value: 'Patiala', label: { en: 'Patiala', hi: 'पटियाला' } },
      { value: 'Bathinda', label: { en: 'Bathinda', hi: 'बठिंडा' } },
      { value: 'Jalandhar', label: { en: 'Jalandhar', hi: 'जालंधर' } },
    ],
  },
  {
    value: 'Uttar Pradesh',
    label: { en: 'Uttar Pradesh', hi: 'उत्तर प्रदेश' },
    districts: [
      { value: 'Lucknow', label: { en: 'Lucknow', hi: 'लखनऊ' } },
      { value: 'Kanpur', label: { en: 'Kanpur', hi: 'कानपुर' } },
      { value: 'Varanasi', label: { en: 'Varanasi', hi: 'वाराणसी' } },
      { value: 'Prayagraj', label: { en: 'Prayagraj', hi: 'प्रयागराज' } },
      { value: 'Agra', label: { en: 'Agra', hi: 'आगरा' } },
    ],
  },
  {
    value: 'Tamil Nadu',
    label: { en: 'Tamil Nadu', hi: 'तमिलनाडु' },
    districts: [
      { value: 'Coimbatore', label: { en: 'Coimbatore', hi: 'कोयंबटूर' } },
      { value: 'Madurai', label: { en: 'Madurai', hi: 'मदुरै' } },
      { value: 'Salem', label: { en: 'Salem', hi: 'सेलम' } },
      { value: 'Thanjavur', label: { en: 'Thanjavur', hi: 'तंजावुर' } },
      { value: 'Erode', label: { en: 'Erode', hi: 'ईरोड' } },
    ],
  },
]

const MONTHS = [
  { value: 'January', label: { en: 'January', hi: 'जनवरी' } },
  { value: 'February', label: { en: 'February', hi: 'फरवरी' } },
  { value: 'March', label: { en: 'March', hi: 'मार्च' } },
  { value: 'April', label: { en: 'April', hi: 'अप्रैल' } },
  { value: 'May', label: { en: 'May', hi: 'मई' } },
  { value: 'June', label: { en: 'June', hi: 'जून' } },
  { value: 'July', label: { en: 'July', hi: 'जुलाई' } },
  { value: 'August', label: { en: 'August', hi: 'अगस्त' } },
  { value: 'September', label: { en: 'September', hi: 'सितंबर' } },
  { value: 'October', label: { en: 'October', hi: 'अक्टूबर' } },
  { value: 'November', label: { en: 'November', hi: 'नवंबर' } },
  { value: 'December', label: { en: 'December', hi: 'दिसंबर' } },
]

const CROPS = [
  { value: 'Rice', label: { en: 'Rice', hi: 'धान' } },
  { value: 'Wheat', label: { en: 'Wheat', hi: 'गेहूं' } },
  { value: 'Cotton', label: { en: 'Cotton', hi: 'कपास' } },
  { value: 'Sugarcane', label: { en: 'Sugarcane', hi: 'गन्ना' } },
  { value: 'Maize', label: { en: 'Maize', hi: 'मक्का' } },
  { value: 'Millets', label: { en: 'Millets', hi: 'बाजरा' } },
  { value: 'Pulses', label: { en: 'Pulses', hi: 'दलहन' } },
  { value: 'Groundnut', label: { en: 'Groundnut', hi: 'मूंगफली' } },
]

function StepBadge({ number, label, active, done }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={[
          'flex h-10 w-10 items-center justify-center rounded-full border text-sm font-bold',
          done ? 'border-[#1a3a2a] bg-[#1a3a2a] text-white' : '',
          active && !done ? 'border-[#d4a843] bg-[#f8ebca] text-[#1a3a2a]' : '',
          !active && !done ? 'border-gray-300 bg-white text-gray-500' : '',
        ].join(' ')}
      >
        {done ? '✓' : number}
      </div>
      <p className={[active ? 'text-[#1a3a2a]' : 'text-gray-500', 'text-sm font-semibold'].join(' ')}>{label}</p>
    </div>
  )
}

function SliderField({ label, min, max, value, step = 1, suffix = '', onChange }) {
  const percent = ((Number(value) - min) / (max - min)) * 100

  return (
    <div className="space-y-2 rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[#1f2f24]">{label}</p>
        <p className="text-sm font-bold text-[#d4a843]">
          {value}
          {suffix}
        </p>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="soil-slider h-2 w-full cursor-pointer appearance-none rounded-full"
        style={{ background: `linear-gradient(to right, #2f7d47 ${percent}%, #e5e7eb ${percent}%)` }}
      />
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  )
}

export default function InputForm() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()

  const isHindi = (i18n.resolvedLanguage || i18n.language || 'hi').startsWith('hi')
  const locale = isHindi ? 'hi' : 'en'

  const [step, setStep] = useState(0)
  const [activeTab, setActiveTab] = useState('current')

  const [selectedState, setSelectedState] = useState('Maharashtra')
  const [district, setDistrict] = useState('Pune')
  const [landArea, setLandArea] = useState('5')

  const [farmingMonth, setFarmingMonth] = useState('June')
  const [previousCrop, setPreviousCrop] = useState('Rice')
  const [previousCropMonth, setPreviousCropMonth] = useState('February')

  const [nitrogen, setNitrogen] = useState(50)
  const [phosphorus, setPhosphorus] = useState(50)
  const [potassium, setPotassium] = useState(50)
  const [ph, setPh] = useState(7)

  const [autoFillSoilTest, setAutoFillSoilTest] = useState(false)
  const [error, setError] = useState('')

  const { data: weather, loading: weatherLoading, error: weatherError, refetch: refetchWeather } = useWeather()

  const districts = useMemo(() => {
    const selected = STATES.find((stateItem) => stateItem.value === selectedState)
    return selected?.districts || []
  }, [selectedState])

  useEffect(() => {
    if (!districts.find((districtItem) => districtItem.value === district)) {
      setDistrict(districts[0]?.value || '')
    }
  }, [districts, district])

  const validateStep = (stepToValidate) => {
    if (!selectedState || !district) {
      return t('predictForm.validation.locationRequired')
    }

    const area = Number(landArea)
    if (!landArea || Number.isNaN(area) || area <= 0) {
      return t('predictForm.validation.landAreaPositive')
    }

    if (stepToValidate === 1 && activeTab === 'current') {
      if (
        weatherLoading ||
        weatherError ||
        weather?.temperature == null ||
        weather?.humidity == null ||
        weather?.precipitation == null
      ) {
        return t('predictForm.validation.weatherUnavailable')
      }
    }

    if (stepToValidate === 1 && activeTab === 'planning') {
      if (!farmingMonth || !previousCrop || !previousCropMonth) {
        return t('predictForm.validation.planningRequired')
      }
    }

    return ''
  }

  const handleContinue = () => {
    const message = validateStep(step)
    if (message) {
      setError(message)
      return
    }
    setError('')
    setStep((prev) => Math.min(2, prev + 1))
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    const allErrors = [0, 1, 2].map((index) => validateStep(index)).find((msg) => msg)
    if (allErrors) {
      setError(allErrors)
      return
    }

    setError('')

    const payload = {
      activeTab,
      state: selectedState,
      district,
      landArea,
      temperature: weather?.temperature ?? null,
      humidity: weather?.humidity ?? null,
      rainfall: weather?.precipitation ?? null,
      farmingMonth,
      previousCrop,
      previousCropMonth,
      nitrogen,
      phosphorus,
      potassium,
      ph,
      autoFillSoilTest,
      submittedAt: new Date().toISOString(),
    }

    window.localStorage.setItem('cropRecommendation', JSON.stringify(payload))
    console.log(t('predictForm.submitLogPrefix'), payload)
  }

  return (
    <div className={[isHindi ? 'lang-hi' : '', 'min-h-screen bg-[#faf8f2] text-[#1f2f24]'].join(' ')}>
      <MinistryNavbar />

      <main className="mx-auto max-w-[1100px] px-4 pb-14 pt-10 sm:px-6 lg:px-8">
        <section className="reveal-on-scroll is-visible">
          <h1 className="font-heading text-4xl font-bold text-[#1a3a2a] sm:text-5xl">{t('predictForm.header.title')}</h1>
          <p className="mt-2 text-[16px] text-gray-600">{t('predictForm.header.subtitle')}</p>
        </section>

        <section className="mt-8 reveal-on-scroll is-visible">
          <div className="mx-auto max-w-3xl rounded-xl border border-[#d5ddd8] bg-white p-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('current')}
                className={[
                  'min-h-[60px] rounded-lg px-3 text-center font-semibold transition duration-300',
                  isHindi ? 'text-base' : 'text-sm sm:text-base',
                  activeTab === 'current'
                    ? 'bg-[#1a3a2a] text-white'
                    : 'border border-[#1a3a2a] bg-white text-[#1a3a2a] hover:bg-[#f2f6f4]',
                ].join(' ')}
              >
                {t('predictForm.tabs.current')}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('planning')}
                className={[
                  'min-h-[60px] rounded-lg px-3 text-center font-semibold transition duration-300',
                  isHindi ? 'text-base' : 'text-sm sm:text-base',
                  activeTab === 'planning'
                    ? 'bg-[#1a3a2a] text-white'
                    : 'border border-[#1a3a2a] bg-white text-[#1a3a2a] hover:bg-[#f2f6f4]',
                ].join(' ')}
              >
                {t('predictForm.tabs.planning')}
              </button>
            </div>
          </div>
        </section>

        <section className="mt-8 flex flex-wrap items-center gap-5 reveal-on-scroll is-visible">
          <StepBadge number={1} label={t('predictForm.steps.one')} active={step === 0} done={step > 0} />
          <StepBadge
            number={2}
            label={activeTab === 'current' ? t('predictForm.steps.twoCurrent') : t('predictForm.steps.twoPlanning')}
            active={step === 1}
            done={step > 1}
          />
          <StepBadge number={3} label={t('predictForm.steps.three')} active={step === 2} done={false} />
        </section>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {step === 0 ? (
            <section className="space-y-6 animate-rise-in">
              <article className="rounded-xl border border-gray-200 bg-white p-6 sm:p-8">
                <h2 className="text-2xl font-bold text-[#1a3a2a]">{t('predictForm.location.title')}</h2>
                <p className="mt-1 text-sm text-gray-500">{t('predictForm.location.subtitle')}</p>
                <div className="mt-5 h-px bg-gray-200" />

                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  <div>
                    <label htmlFor="state" className="block text-sm font-semibold text-[#1f2f24]">
                      {t('predictForm.location.state')}
                    </label>
                    <select
                      id="state"
                      value={selectedState}
                      onChange={(e) => setSelectedState(e.target.value)}
                      className="mt-2 min-h-11 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-[#1a3a2a] focus:ring-2 focus:ring-[#1a3a2a]/15"
                    >
                      {STATES.map((stateItem) => (
                        <option key={stateItem.value} value={stateItem.value}>
                          {stateItem.label[locale]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="district" className="block text-sm font-semibold text-[#1f2f24]">
                      {t('predictForm.location.district')}
                    </label>
                    <select
                      id="district"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="mt-2 min-h-11 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-[#1a3a2a] focus:ring-2 focus:ring-[#1a3a2a]/15"
                    >
                      {districts.map((districtItem) => (
                        <option key={districtItem.value} value={districtItem.value}>
                          {districtItem.label[locale]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-5">
                  <label htmlFor="landArea" className="block text-sm font-semibold text-[#1f2f24]">
                    {t('predictForm.location.landArea')}
                  </label>
                  <input
                    id="landArea"
                    type="number"
                    min="0"
                    step="0.1"
                    value={landArea}
                    onChange={(e) => setLandArea(e.target.value)}
                    placeholder={t('predictForm.location.landAreaPlaceholder')}
                    className="mt-2 min-h-11 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-[#1a3a2a] focus:ring-2 focus:ring-[#1a3a2a]/15"
                  />
                </div>
              </article>
            </section>
          ) : null}

          {step === 1 ? (
            <section className="space-y-6 animate-rise-in">
              {activeTab === 'current' ? (
                <article className="rounded-xl border border-gray-200 bg-white p-6 sm:p-8">
                  <h2 className="text-2xl font-bold text-[#1a3a2a]">{t('predictForm.weather.title')}</h2>
                  <p className="mt-1 text-sm text-gray-500">{t('predictForm.weather.subtitle')}</p>
                  <div className="mt-5 h-px bg-gray-200" />

                  <p className="mt-4 text-sm text-gray-500">{weather?.locationLabel || t('home.weather.localLabel')}</p>

                  {weatherError ? (
                    <div className="mt-5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-4 text-sm text-amber-800">
                      <p>{t('home.weather.unavailable')}</p>
                      <button
                        type="button"
                        onClick={refetchWeather}
                        className="mt-3 min-h-11 rounded-lg border border-amber-500 px-4 py-2 font-semibold"
                      >
                        {t('home.weather.retry')}
                      </button>
                    </div>
                  ) : (
                    <div className="mt-5 grid gap-5 md:grid-cols-3">
                      <div className="rounded-lg border border-gray-300 bg-[#faf8f2] px-4 py-4">
                        <p className="text-sm font-semibold text-[#1f2f24]">{t('predictForm.weather.temperature')}</p>
                        <p className="mt-2 text-2xl font-bold text-[#1a3a2a]">
                          {weatherLoading || weather?.temperature == null ? '—' : Math.round(weather.temperature)}
                          {weatherLoading || weather?.temperature == null ? '' : '°C'}
                        </p>
                      </div>

                      <div className="rounded-lg border border-gray-300 bg-[#faf8f2] px-4 py-4">
                        <p className="text-sm font-semibold text-[#1f2f24]">{t('predictForm.weather.humidity')}</p>
                        <p className="mt-2 text-2xl font-bold text-[#1a3a2a]">
                          {weatherLoading || weather?.humidity == null ? '—' : Math.round(weather.humidity)}
                          {weatherLoading || weather?.humidity == null ? '' : '%'}
                        </p>
                      </div>

                      <div className="rounded-lg border border-gray-300 bg-[#faf8f2] px-4 py-4">
                        <p className="text-sm font-semibold text-[#1f2f24]">{t('predictForm.weather.rainfall')}</p>
                        <p className="mt-2 text-2xl font-bold text-[#1a3a2a]">
                          {weatherLoading || weather?.precipitation == null ? '—' : weather.precipitation}
                          {weatherLoading || weather?.precipitation == null ? '' : ' mm'}
                        </p>
                      </div>
                    </div>
                  )}
                </article>
              ) : (
                <article className="rounded-xl border border-gray-200 bg-white p-6 sm:p-8">
                  <h2 className="text-2xl font-bold text-[#1a3a2a]">{t('predictForm.planning.title')}</h2>
                  <p className="mt-1 text-sm text-gray-500">{t('predictForm.planning.subtitle')}</p>
                  <div className="mt-5 h-px bg-gray-200" />

                  <div className="mt-5 grid gap-5 md:grid-cols-3">
                    <div>
                      <label htmlFor="farmingMonth" className="block text-sm font-semibold text-[#1f2f24]">
                        {t('predictForm.planning.farmingMonth')}
                      </label>
                      <select
                        id="farmingMonth"
                        value={farmingMonth}
                        onChange={(e) => setFarmingMonth(e.target.value)}
                        className="mt-2 min-h-11 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-[#1a3a2a] focus:ring-2 focus:ring-[#1a3a2a]/15"
                      >
                        {MONTHS.map((month) => (
                          <option key={month.value} value={month.value}>
                            {month.label[locale]}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="previousCrop" className="block text-sm font-semibold text-[#1f2f24]">
                        {t('predictForm.planning.previousCrop')}
                      </label>
                      <select
                        id="previousCrop"
                        value={previousCrop}
                        onChange={(e) => setPreviousCrop(e.target.value)}
                        className="mt-2 min-h-11 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-[#1a3a2a] focus:ring-2 focus:ring-[#1a3a2a]/15"
                      >
                        {CROPS.map((crop) => (
                          <option key={crop.value} value={crop.value}>
                            {crop.label[locale]}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="previousCropMonth" className="block text-sm font-semibold text-[#1f2f24]">
                        {t('predictForm.planning.previousCropMonth')}
                      </label>
                      <select
                        id="previousCropMonth"
                        value={previousCropMonth}
                        onChange={(e) => setPreviousCropMonth(e.target.value)}
                        className="mt-2 min-h-11 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-[#1a3a2a] focus:ring-2 focus:ring-[#1a3a2a]/15"
                      >
                        {MONTHS.map((month) => (
                          <option key={month.value} value={month.value}>
                            {month.label[locale]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </article>
              )}
            </section>
          ) : null}

          {step === 2 ? (
            <section className="space-y-6 animate-rise-in">
              <article className="rounded-xl border border-gray-200 bg-white p-6 sm:p-8">
                <h2 className="text-2xl font-bold text-[#1a3a2a]">{t('predictForm.soil.title')}</h2>
                <p className="mt-1 text-sm text-gray-500">{t('predictForm.soil.subtitle')}</p>
                <div className="mt-5 h-px bg-gray-200" />

                <div className="mt-6 space-y-4">
                  <SliderField
                    label={t('predictForm.soil.nitrogen')}
                    min={0}
                    max={100}
                    value={nitrogen}
                    suffix={` ${t('predictForm.soil.ppmSuffix')}`}
                    onChange={setNitrogen}
                  />
                  <SliderField
                    label={t('predictForm.soil.phosphorus')}
                    min={0}
                    max={100}
                    value={phosphorus}
                    suffix={` ${t('predictForm.soil.ppmSuffix')}`}
                    onChange={setPhosphorus}
                  />
                  <SliderField
                    label={t('predictForm.soil.potassium')}
                    min={0}
                    max={100}
                    value={potassium}
                    suffix={` ${t('predictForm.soil.ppmSuffix')}`}
                    onChange={setPotassium}
                  />
                  <SliderField label={t('predictForm.soil.ph')} min={4} max={9} value={ph} step={0.1} onChange={setPh} />
                </div>

                <button
                  type="button"
                  onClick={() => setAutoFillSoilTest((prev) => !prev)}
                  className="mt-6 min-h-11 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm font-semibold text-[#1a3a2a] transition hover:bg-[#f4f7f5]"
                >
                  {autoFillSoilTest ? '☑' : '☐'} {t('predictForm.soil.autoFill')}
                </button>
                <p className="mt-2 text-xs text-gray-500">{t('predictForm.soil.autoFillHint')}</p>
              </article>
            </section>
          ) : null}

          {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div> : null}

          {step > 0 ? (
            <button
              type="button"
              onClick={() => {
                setError('')
                setStep((prev) => Math.max(0, prev - 1))
              }}
              className="min-h-11 text-sm font-semibold text-[#1a3a2a] underline underline-offset-4"
            >
              {t('predictForm.navigation.previous')}
            </button>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            {step < 2 ? (
              <button
                type="button"
                onClick={handleContinue}
                className="min-h-[56px] rounded-lg bg-[#1a3a2a] px-5 py-3 text-[16px] font-bold text-white transition duration-200 hover:scale-[1.01] hover:bg-[#24513a]"
              >
                {t('predictForm.navigation.continue')}
              </button>
            ) : (
              <button
                type="submit"
                className="min-h-[56px] rounded-lg bg-[#1a3a2a] px-5 py-3 text-[16px] font-bold text-white transition duration-200 hover:scale-[1.01] hover:bg-[#24513a]"
              >
                {t('predictForm.navigation.getRecommendations')}
              </button>
            )}

            <button
              type="button"
              onClick={() => navigate('/')}
              className="min-h-[56px] rounded-lg border-2 border-[#1a3a2a] bg-white px-5 py-3 text-[16px] font-bold text-[#1a3a2a] transition duration-200 hover:bg-[#edf3ef]"
            >
              {t('predictForm.navigation.backHome')}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
