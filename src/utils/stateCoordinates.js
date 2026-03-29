const INDIA_FALLBACK_COORDINATES = { lat: 20.5937, lon: 78.9629 }

const STATE_COORDINATES = {
  Maharashtra: { lat: 19.7515, lon: 75.7139 },
  Punjab: { lat: 31.1471, lon: 75.3412 },
  Haryana: { lat: 29.0588, lon: 76.0856 },
  'Uttar Pradesh': { lat: 26.8467, lon: 80.9462 },
  'Madhya Pradesh': { lat: 22.9734, lon: 78.6569 },
  Rajasthan: { lat: 27.0238, lon: 74.2179 },
  Gujarat: { lat: 22.2587, lon: 71.1924 },
  Karnataka: { lat: 15.3173, lon: 75.7139 },
  'Tamil Nadu': { lat: 11.1271, lon: 78.6569 },
  Kerala: { lat: 10.8505, lon: 76.2711 },
  'West Bengal': { lat: 22.9868, lon: 87.855 },
  Bihar: { lat: 25.0961, lon: 85.3131 },
  Odisha: { lat: 20.9517, lon: 85.0985 },
  'Andhra Pradesh': { lat: 15.9129, lon: 79.74 },
  Telangana: { lat: 18.1124, lon: 79.0193 },
}

const DISTRICT_COORDINATES = {
  Maharashtra: {
    Pune: { lat: 18.5204, lon: 73.8567 },
    Nashik: { lat: 19.9975, lon: 73.7898 },
    Nagpur: { lat: 21.1458, lon: 79.0882 },
    Aurangabad: { lat: 19.8762, lon: 75.3433 },
    Kolhapur: { lat: 16.705, lon: 74.2433 },
  },
  'Madhya Pradesh': {
    Indore: { lat: 22.7196, lon: 75.8577 },
    Ujjain: { lat: 23.1765, lon: 75.7885 },
    Bhopal: { lat: 23.2599, lon: 77.4126 },
    Jabalpur: { lat: 23.1815, lon: 79.9864 },
    Gwalior: { lat: 26.2183, lon: 78.1828 },
  },
  Karnataka: {
    'Bengaluru Rural': { lat: 13.2257, lon: 77.575 },
    Mysuru: { lat: 12.2958, lon: 76.6394 },
    Belagavi: { lat: 15.8497, lon: 74.4977 },
    Dharwad: { lat: 15.4589, lon: 75.0078 },
    Raichur: { lat: 16.2076, lon: 77.3463 },
  },
  Gujarat: {
    Ahmedabad: { lat: 23.0225, lon: 72.5714 },
    Surat: { lat: 21.1702, lon: 72.8311 },
    Rajkot: { lat: 22.3039, lon: 70.8022 },
    Vadodara: { lat: 22.3072, lon: 73.1812 },
    Bhavnagar: { lat: 21.7645, lon: 72.1519 },
  },
  Rajasthan: {
    Jaipur: { lat: 26.9124, lon: 75.7873 },
    Jodhpur: { lat: 26.2389, lon: 73.0243 },
    Udaipur: { lat: 24.5854, lon: 73.7125 },
    Kota: { lat: 25.2138, lon: 75.8648 },
    Bikaner: { lat: 28.0229, lon: 73.3119 },
  },
  Punjab: {
    Ludhiana: { lat: 30.901, lon: 75.8573 },
    Amritsar: { lat: 31.634, lon: 74.8723 },
    Patiala: { lat: 30.3398, lon: 76.3869 },
    Bathinda: { lat: 30.211, lon: 74.9455 },
    Jalandhar: { lat: 31.326, lon: 75.5762 },
  },
  Haryana: {
    Hisar: { lat: 29.1492, lon: 75.7217 },
    Karnal: { lat: 29.6857, lon: 76.9905 },
    Rohtak: { lat: 28.8955, lon: 76.6066 },
    Sirsa: { lat: 29.5349, lon: 75.0289 },
    Bhiwani: { lat: 28.793, lon: 76.1397 },
  },
  'Uttar Pradesh': {
    Lucknow: { lat: 26.8467, lon: 80.9462 },
    Kanpur: { lat: 26.4499, lon: 80.3319 },
    Varanasi: { lat: 25.3176, lon: 82.9739 },
    Prayagraj: { lat: 25.4358, lon: 81.8463 },
    Agra: { lat: 27.1767, lon: 78.0081 },
  },
  'West Bengal': {
    Kolkata: { lat: 22.5726, lon: 88.3639 },
    Hooghly: { lat: 22.9088, lon: 88.3967 },
    Bardhaman: { lat: 23.2324, lon: 87.8615 },
    Nadia: { lat: 23.471, lon: 88.5565 },
    Jalpaiguri: { lat: 26.5435, lon: 88.7205 },
  },
  'Tamil Nadu': {
    Coimbatore: { lat: 11.0168, lon: 76.9558 },
    Madurai: { lat: 9.9252, lon: 78.1198 },
    Salem: { lat: 11.6643, lon: 78.146 },
    Thanjavur: { lat: 10.787, lon: 79.1378 },
    Erode: { lat: 11.341, lon: 77.7172 },
  },
  Kerala: {
    Alappuzha: { lat: 9.4981, lon: 76.3388 },
    Palakkad: { lat: 10.7867, lon: 76.6548 },
    Thrissur: { lat: 10.5276, lon: 76.2144 },
    Kottayam: { lat: 9.5916, lon: 76.5222 },
    Kozhikode: { lat: 11.2588, lon: 75.7804 },
  },
}

export function getCoordinates(state, district) {
  const districtCoordinates = DISTRICT_COORDINATES?.[state]?.[district]
  if (districtCoordinates) {
    return districtCoordinates
  }

  const stateCoordinates = STATE_COORDINATES?.[state]
  if (stateCoordinates) {
    return stateCoordinates
  }

  return INDIA_FALLBACK_COORDINATES
}

export { INDIA_FALLBACK_COORDINATES, STATE_COORDINATES, DISTRICT_COORDINATES }
