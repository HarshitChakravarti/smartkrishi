import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MinistryNavbar from '../components/MinistryNavbar'
import { useStateWeather } from '../hooks/useStateWeather'

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
    value: 'Madhya Pradesh',
    label: { en: 'Madhya Pradesh', hi: 'मध्य प्रदेश' },
    districts: [
      { value: 'Indore', label: { en: 'Indore', hi: 'इंदौर' } },
      { value: 'Ujjain', label: { en: 'Ujjain', hi: 'उज्जैन' } },
      { value: 'Bhopal', label: { en: 'Bhopal', hi: 'भोपाल' } },
      { value: 'Jabalpur', label: { en: 'Jabalpur', hi: 'जबलपुर' } },
      { value: 'Gwalior', label: { en: 'Gwalior', hi: 'ग्वालियर' } },
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
    value: 'Rajasthan',
    label: { en: 'Rajasthan', hi: 'राजस्थान' },
    districts: [
      { value: 'Jaipur', label: { en: 'Jaipur', hi: 'जयपुर' } },
      { value: 'Jodhpur', label: { en: 'Jodhpur', hi: 'जोधपुर' } },
      { value: 'Udaipur', label: { en: 'Udaipur', hi: 'उदयपुर' } },
      { value: 'Kota', label: { en: 'Kota', hi: 'कोटा' } },
      { value: 'Bikaner', label: { en: 'Bikaner', hi: 'बीकानेर' } },
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
    value: 'Haryana',
    label: { en: 'Haryana', hi: 'हरियाणा' },
    districts: [
      { value: 'Hisar', label: { en: 'Hisar', hi: 'हिसार' } },
      { value: 'Karnal', label: { en: 'Karnal', hi: 'करनाल' } },
      { value: 'Rohtak', label: { en: 'Rohtak', hi: 'रोहतक' } },
      { value: 'Sirsa', label: { en: 'Sirsa', hi: 'सिरसा' } },
      { value: 'Bhiwani', label: { en: 'Bhiwani', hi: 'भिवानी' } },
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
    value: 'West Bengal',
    label: { en: 'West Bengal', hi: 'पश्चिम बंगाल' },
    districts: [
      { value: 'Kolkata', label: { en: 'Kolkata', hi: 'कोलकाता' } },
      { value: 'Hooghly', label: { en: 'Hooghly', hi: 'हुगली' } },
      { value: 'Bardhaman', label: { en: 'Bardhaman', hi: 'बर्धमान' } },
      { value: 'Nadia', label: { en: 'Nadia', hi: 'नदिया' } },
      { value: 'Jalpaiguri', label: { en: 'Jalpaiguri', hi: 'जलपाईगुड़ी' } },
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
  {
    value: 'Kerala',
    label: { en: 'Kerala', hi: 'केरल' },
    districts: [
      { value: 'Alappuzha', label: { en: 'Alappuzha', hi: 'अलप्पुझा' } },
      { value: 'Palakkad', label: { en: 'Palakkad', hi: 'पालक्काड' } },
      { value: 'Thrissur', label: { en: 'Thrissur', hi: 'त्रिशूर' } },
      { value: 'Kottayam', label: { en: 'Kottayam', hi: 'कोट्टायम' } },
      { value: 'Kozhikode', label: { en: 'Kozhikode', hi: 'कोझिकोड' } },
    ],
  },
]

const MONTH_OPTIONS = [
  { value: 'January', label: 'January (जनवरी)' },
  { value: 'February', label: 'February (फरवरी)' },
  { value: 'March', label: 'March (मार्च)' },
  { value: 'April', label: 'April (अप्रैल)' },
  { value: 'May', label: 'May (मई)' },
  { value: 'June', label: 'June (जून)' },
  { value: 'July', label: 'July (जुलाई)' },
  { value: 'August', label: 'August (अगस्त)' },
  { value: 'September', label: 'September (सितंबर)' },
  { value: 'October', label: 'October (अक्टूबर)' },
  { value: 'November', label: 'November (नवंबर)' },
  { value: 'December', label: 'December (दिसंबर)' },
]

const PREVIOUS_CROP_OPTIONS = [
  { value: 'none', label: 'None / First Crop (कोई नहीं / पहली फसल)', category: 'none' },
  { value: 'rice', label: 'Rice (धान)', category: 'cereals' },
  { value: 'wheat', label: 'Wheat (गेहूं)', category: 'cereals' },
  { value: 'maize', label: 'Maize / Corn (मक्का)', category: 'cereals' },
  { value: 'millet', label: 'Millet / Bajra (बाजरा)', category: 'cereals' },
  { value: 'chickpea', label: 'Chickpea / Gram (चना)', category: 'pulses' },
  { value: 'lentil', label: 'Lentil / Masoor (मसूर)', category: 'pulses' },
  { value: 'mungbean', label: 'Mungbean / Moong (मूंग)', category: 'pulses' },
  { value: 'blackgram', label: 'Black Gram / Urad (उड़द)', category: 'pulses' },
  { value: 'pigeonpeas', label: 'Pigeon Pea / Arhar (अरहर / तूर)', category: 'pulses' },
  { value: 'mothbeans', label: 'Moth Beans (मोठ)', category: 'pulses' },
  { value: 'kidneybeans', label: 'Kidney Beans / Rajma (राजमा)', category: 'pulses' },
  { value: 'mustard', label: 'Mustard / Sarson (सरसों)', category: 'oilseeds' },
  { value: 'soybean', label: 'Soybean (सोयाबीन)', category: 'oilseeds' },
  { value: 'cotton', label: 'Cotton (कपास)', category: 'commercial' },
  { value: 'jute', label: 'Jute / Pat (पटसन)', category: 'commercial' },
  { value: 'banana', label: 'Banana (केला)', category: 'fruits' },
  { value: 'mango', label: 'Mango (आम)', category: 'fruits' },
  { value: 'watermelon', label: 'Watermelon (तरबूज)', category: 'fruits' },
  { value: 'muskmelon', label: 'Muskmelon (खरबूजा)', category: 'fruits' },
  { value: 'pomegranate', label: 'Pomegranate (अनार)', category: 'fruits' },
  { value: 'grapes', label: 'Grapes (अंगूर)', category: 'fruits' },
  { value: 'apple', label: 'Apple (सेब)', category: 'fruits' },
  { value: 'orange', label: 'Orange (संतरा)', category: 'fruits' },
  { value: 'papaya', label: 'Papaya (पपीता)', category: 'fruits' },
  { value: 'coconut', label: 'Coconut (नारियल)', category: 'fruits' },
  { value: 'coffee', label: 'Coffee (कॉफी)', category: 'plantation' },
]

const PREVIOUS_CROP_CATEGORY_LABELS = {
  none: '— Select —',
  cereals: '🌾 Cereals (अनाज)',
  pulses: '🫘 Pulses & Legumes (दालें)',
  oilseeds: '🫒 Oilseeds (तिलहन)',
  commercial: '🏭 Fiber & Commercial (व्यावसायिक)',
  fruits: '🍎 Fruits (फल)',
  plantation: '🌿 Plantation (बागान)',
}

const PREVIOUS_CROP_CATEGORY_ORDER = ['none', 'cereals', 'pulses', 'oilseeds', 'commercial', 'fruits', 'plantation']

const SUPPORTED_PREVIOUS_CROPS = new Set(PREVIOUS_CROP_OPTIONS.map((crop) => crop.value))

function normalizePreviousCropValue(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')

  const aliases = {
    '': 'none',
    firstcrop: 'none',
    none: 'none',
    rice: 'rice',
    wheat: 'wheat',
    cotton: 'cotton',
    maize: 'maize',
    corn: 'maize',
    soybean: 'soybean',
    millet: 'millet',
    millets: 'millet',
    chickpea: 'chickpea',
    gram: 'chickpea',
    lentil: 'lentil',
    mungbean: 'mungbean',
    moong: 'mungbean',
    blackgram: 'blackgram',
    urad: 'blackgram',
    pigeonpeas: 'pigeonpeas',
    pigeonpea: 'pigeonpeas',
    arhar: 'pigeonpeas',
    toor: 'pigeonpeas',
    mothbeans: 'mothbeans',
    kidneybeans: 'kidneybeans',
    rajma: 'kidneybeans',
    mustard: 'mustard',
    sarson: 'mustard',
    jute: 'jute',
    banana: 'banana',
    mango: 'mango',
    watermelon: 'watermelon',
    muskmelon: 'muskmelon',
    pomegranate: 'pomegranate',
    grapes: 'grapes',
    apple: 'apple',
    orange: 'orange',
    papaya: 'papaya',
    coconut: 'coconut',
    coffee: 'coffee',
  }

  const mapped = aliases[normalized] || normalized
  return SUPPORTED_PREVIOUS_CROPS.has(mapped) ? mapped : 'none'
}

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
  const location = useLocation()
  const { t, i18n } = useTranslation()

  const isHindi = (i18n.resolvedLanguage || i18n.language || 'hi').startsWith('hi')
  const locale = isHindi ? 'hi' : 'en'

  const [step, setStep] = useState(0)
  const [activeTab, setActiveTab] = useState('current')

  const [selectedState, setSelectedState] = useState('Maharashtra')
  const [district, setDistrict] = useState('Pune')
  const [landArea, setLandArea] = useState('5')

  const [farmingMonth, setFarmingMonth] = useState('June')
  const [previousCrop, setPreviousCrop] = useState('none')
  const [previousCropMonth, setPreviousCropMonth] = useState('February')

  const [nitrogen, setNitrogen] = useState(50)
  const [phosphorus, setPhosphorus] = useState(50)
  const [potassium, setPotassium] = useState(50)
  const [ph, setPh] = useState(7)

  const [autoFillSoilTest, setAutoFillSoilTest] = useState(false)
  const [error, setError] = useState('')

  const [temperatureInput, setTemperatureInput] = useState('')
  const [humidityInput, setHumidityInput] = useState('')
  const [rainfallInput, setRainfallInput] = useState('')

  const { data: weather, loading: weatherLoading, error: weatherError, refetch: refetchWeather } = useStateWeather({
    state: selectedState,
    district,
    mode: activeTab,
    farmingMonth,
  })

  const districts = useMemo(() => {
    const selected = STATES.find((stateItem) => stateItem.value === selectedState)
    return selected?.districts || []
  }, [selectedState])

  const groupedPreviousCrops = useMemo(() => {
    return PREVIOUS_CROP_OPTIONS.reduce((groups, crop) => {
      const current = groups[crop.category] || []
      current.push(crop)
      groups[crop.category] = current
      return groups
    }, {})
  }, [])

  useEffect(() => {
    if (!districts.find((districtItem) => districtItem.value === district)) {
      setDistrict(districts[0]?.value || '')
    }
  }, [districts, district])

  useEffect(() => {
    setStep(0)

    if (location.state?.reset) {
      setSelectedState('Maharashtra')
      setDistrict('Pune')
      setLandArea('5')
      setActiveTab('current')
      setFarmingMonth('June')
      setPreviousCrop('none')
      setPreviousCropMonth('February')
      setNitrogen(50)
      setPhosphorus(50)
      setPotassium(50)
      setPh(7)
      setAutoFillSoilTest(false)
      setTemperatureInput('')
      setHumidityInput('')
      setRainfallInput('')
      setError('')
      return
    }

    if (location.state?.advisoryMissing) {
      setError(t('advisory.redirectMissing', 'Please generate recommendations first to view detailed advisory and profit estimation.'))
    }

    const savedInputs = window.localStorage.getItem('lastInputs')
    if (!savedInputs) {
      return
    }

    try {
      const parsed = JSON.parse(savedInputs)
      setSelectedState(parsed.state || 'Maharashtra')
      setDistrict(parsed.district || 'Pune')
      setLandArea(parsed.landArea || '5')
      setActiveTab(parsed.activeTab || 'current')
      setFarmingMonth(parsed.farmingMonth || 'June')
      setPreviousCrop(normalizePreviousCropValue(parsed.previousCrop))
      setPreviousCropMonth(parsed.previousCropMonth || 'February')
      setNitrogen(Number(parsed.N ?? 50))
      setPhosphorus(Number(parsed.P ?? 50))
      setPotassium(Number(parsed.K ?? 50))
      setPh(Number(parsed.pH ?? 7))
      setTemperatureInput(parsed.temperature != null ? String(parsed.temperature) : '')
      setHumidityInput(parsed.humidity != null ? String(parsed.humidity) : '')
      setRainfallInput(parsed.rainfall != null ? String(parsed.rainfall) : '')
    } catch {
      // Ignore malformed stored input payload.
    }
  }, [location.state])

  useEffect(() => {
    if (!weather) {
      return
    }

    setTemperatureInput(weather.temperature != null ? String(Math.round(weather.temperature * 10) / 10) : '')
    setHumidityInput(weather.humidity != null ? String(Math.round(weather.humidity)) : '')
    setRainfallInput(weather.precipitation != null ? String(Math.round(weather.precipitation * 10) / 10) : '')
  }, [weather, activeTab, selectedState, district, farmingMonth])

  const validateStep = (stepToValidate) => {
    if (!selectedState || !district) {
      return t('predictForm.validation.locationRequired')
    }

    const area = Number(landArea)
    if (!landArea || Number.isNaN(area) || area <= 0) {
      return t('predictForm.validation.landAreaPositive')
    }

    if (stepToValidate === 1 && activeTab === 'current') {
      const temperature = Number(temperatureInput)
      const humidity = Number(humidityInput)
      const rainfall = Number(rainfallInput)
      if (weatherLoading || weatherError || Number.isNaN(temperature) || Number.isNaN(humidity) || Number.isNaN(rainfall)) {
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
    if (step < 2) {
      setStep((prev) => prev + 1)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    // Guard: only submit when on the final step
    if (step !== 2) {
      return
    }

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
      temperature: temperatureInput === '' ? null : Number(temperatureInput),
      humidity: humidityInput === '' ? null : Number(humidityInput),
      rainfall: rainfallInput === '' ? null : Number(rainfallInput),
      farmingMonth,
      previousCrop,
      previousCropMonth,
      N: nitrogen,
      P: phosphorus,
      K: potassium,
      pH: ph,
      autoFillSoilTest,
      submittedAt: new Date().toISOString(),
    }

    window.localStorage.setItem('lastInputs', JSON.stringify(payload))
    window.localStorage.setItem('cropRecommendation', JSON.stringify(payload))
    console.log(t('predictForm.submitLogPrefix'), payload)
    navigate('/results')
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

        <form onSubmit={(e) => e.preventDefault()} className="mt-8 space-y-6">
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

                  <p className="mt-4 text-sm text-gray-500">📍 Live weather for {district}, {selectedState}</p>

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
                    <>
                      <div className="mt-5 grid gap-5 md:grid-cols-3">
                        <div>
                          <label htmlFor="temperatureInput" className="block text-sm font-semibold text-[#1f2f24]">{t('predictForm.weather.temperature')}</label>
                          <input
                            id="temperatureInput"
                            type="number"
                            value={temperatureInput}
                            onChange={(e) => setTemperatureInput(e.target.value)}
                            className="mt-2 min-h-11 w-full rounded-lg border border-gray-300 bg-[#faf8f2] px-4 py-3 outline-none transition focus:border-[#1a3a2a] focus:ring-2 focus:ring-[#1a3a2a]/15"
                          />
                        </div>

                        <div>
                          <label htmlFor="humidityInput" className="block text-sm font-semibold text-[#1f2f24]">{t('predictForm.weather.humidity')}</label>
                          <input
                            id="humidityInput"
                            type="number"
                            value={humidityInput}
                            onChange={(e) => setHumidityInput(e.target.value)}
                            className="mt-2 min-h-11 w-full rounded-lg border border-gray-300 bg-[#faf8f2] px-4 py-3 outline-none transition focus:border-[#1a3a2a] focus:ring-2 focus:ring-[#1a3a2a]/15"
                          />
                        </div>

                        <div>
                          <label htmlFor="rainfallInput" className="block text-sm font-semibold text-[#1f2f24]">{t('predictForm.weather.rainfall')}</label>
                          <input
                            id="rainfallInput"
                            type="number"
                            value={rainfallInput}
                            onChange={(e) => setRainfallInput(e.target.value)}
                            className="mt-2 min-h-11 w-full rounded-lg border border-gray-300 bg-[#faf8f2] px-4 py-3 outline-none transition focus:border-[#1a3a2a] focus:ring-2 focus:ring-[#1a3a2a]/15"
                          />
                        </div>
                      </div>
                      <div className="mt-4 rounded-lg border border-[#d8dfd9] bg-[#faf8f2] px-4 py-3 text-sm text-[#4b5b54]">
                        ℹ️ Values are auto-filled from live weather. You can edit them if you have local measurements.
                      </div>

                      <div className="mt-3 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={refetchWeather}
                          className="min-h-11 rounded-lg border border-[#1a3a2a] bg-white px-4 py-2 text-sm font-semibold text-[#1a3a2a]"
                        >
                          🔄 Refresh Weather
                        </button>
                        {weatherLoading ? <span className="text-sm text-gray-500">Fetching weather...</span> : null}
                      </div>
                    </>
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
                        {MONTH_OPTIONS.map((month) => (
                          <option key={month.value} value={month.value}>
                            {month.label}
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
                        {PREVIOUS_CROP_CATEGORY_ORDER.map((category) => (
                          <optgroup key={category} label={PREVIOUS_CROP_CATEGORY_LABELS[category]}>
                            {(groupedPreviousCrops[category] || []).map((crop) => (
                              <option key={crop.value} value={crop.value}>
                                {crop.label}
                              </option>
                            ))}
                          </optgroup>
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
                        {MONTH_OPTIONS.map((month) => (
                          <option key={month.value} value={month.value}>
                            {month.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-6 rounded-lg border border-[#d8dfd9] bg-[#faf8f2] px-4 py-4">
                    <p className="text-sm font-semibold text-[#1a3a2a]">🌤 Expected climate for {farmingMonth} in {selectedState}</p>
                    <p className="mt-2 text-[15px] text-[#2b3a2f]">
                      🌡 Temp: {temperatureInput || '--'}°C &nbsp;&nbsp; 💧 Humidity: {humidityInput || '--'}% &nbsp;&nbsp; 🌧 Rain: {rainfallInput || '--'} mm
                    </p>
                    <p className="mt-2 text-xs text-[#6b7280]">📊 Based on historical monthly averages</p>
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
            ) : null}

            {step === 2 ? (
              <button
                type="button"
                onClick={handleSubmit}
                className="min-h-[56px] rounded-lg bg-[#1a3a2a] px-5 py-3 text-[16px] font-bold text-white transition duration-200 hover:scale-[1.01] hover:bg-[#24513a]"
              >
                {t('predictForm.navigation.getRecommendations')}
              </button>
            ) : null}

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
