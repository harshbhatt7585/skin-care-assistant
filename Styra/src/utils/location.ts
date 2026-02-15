type ReverseGeocodeResponse = {
  address?: {
    country_code?: string
  }
}

export const getLocaleCountryCode = (): string => {
  const locale = typeof navigator !== 'undefined' ? navigator.language : ''
  const region = locale.split('-')[1]
  return (region || 'US').toLowerCase()
}

export const detectCountryCode = async (): Promise<string | null> => {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return null
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${position.coords.latitude}&lon=${position.coords.longitude}`
          )
          if (!response.ok) {
            resolve(null)
            return
          }

          const data = (await response.json()) as ReverseGeocodeResponse
          const detectedCountry = data.address?.country_code?.toLowerCase() || null
          resolve(detectedCountry)
        } catch (error) {
          console.warn('Reverse geocoding failed', error)
          resolve(null)
        }
      },
      (error) => {
        console.warn('Location detection failed', error)
        resolve(null)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  })
}
