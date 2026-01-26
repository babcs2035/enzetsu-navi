import { prisma } from '@/lib/prisma'

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY

interface GeocodeResult {
  lat: number
  lng: number
  address: string
}

export async function geocodeLocation(locationName: string): Promise<GeocodeResult | null> {
  // キャッシュチェック
  const cache = await prisma.geocodeCache.findUnique({
    where: { locationName },
  })

  if (cache) {
    if (cache.lat !== null && cache.lng !== null && cache.address !== null) {
      return {
        lat: cache.lat,
        lng: cache.lng,
        address: cache.address,
      }
    }
    // キャッシュにあってnullなら過去に失敗したので再試行しない（API節約）
    // （要件次第だが、Python版はキャッシュモデルにsaveしているか確認が必要だが、一旦そうする）
    // NOTE: Python版の実装を見ると GeocodeCache モデルがあったので、キャッシュ機構はあるはず。
    return null
  }

  if (!GOOGLE_PLACES_API_KEY) {
    console.warn('GOOGLE_PLACES_API_KEY is not set')
    return null
  }

  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
        'X-Goog-FieldMask': 'places.location,places.formattedAddress',
      },
      body: JSON.stringify({
        textQuery: `${locationName} Japan`,
        languageCode: 'ja',
        regionCode: 'JP',
      }),
    })

    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.statusText}`)
    }

    const data = await response.json()
    const places = data.places || []

    let result: GeocodeResult | null = null

    if (places.length > 0) {
      const place = places[0]
      if (place.location && place.formattedAddress) {
        result = {
          lat: place.location.latitude,
          lng: place.location.longitude,
          address: place.formattedAddress,
        }
      }
    }

    // キャッシュ保存
    await prisma.geocodeCache.create({
      data: {
        locationName,
        address: result?.address ?? null,
        lat: result?.lat ?? null,
        lng: result?.lng ?? null,
      },
    })

    return result
  } catch (error) {
    console.error('Geocoding error:', error)
    return null
  }
}
