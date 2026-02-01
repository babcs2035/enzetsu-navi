import { prisma } from "@/lib/prisma";

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

/**
 * ジオコーディングの結果を表すインターフェース．
 */
interface GeocodeResult {
  lat: number;
  lng: number;
  address: string;
}

/**
 * 場所名から緯度・経度および住所を取得する．
 * 結果はデータベースにキャッシュされ，不要な API 呼び出しを抑制する．
 *
 * @param locationName 場所名（駅名，施設名など）
 * @returns ジオコーディング結果，または取得失敗時は null
 */
export async function geocodeLocation(
  locationName: string,
): Promise<GeocodeResult | null> {
  // キャッシュから既存の結果を確認する
  const cache = await prisma.geocodeCache.findUnique({
    where: { locationName },
  });

  if (cache) {
    if (cache.lat !== null && cache.lng !== null && cache.address !== null) {
      return {
        lat: cache.lat,
        lng: cache.lng,
        address: cache.address,
      };
    }
    // 過去に失敗した（座標が null）場合は再試行をスキップする
    return null;
  }

  if (!GOOGLE_PLACES_API_KEY) {
    console.warn("⚠️ GOOGLE_PLACES_API_KEY is not configured.");
    return null;
  }

  try {
    const response = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
          "X-Goog-FieldMask": "places.location,places.formattedAddress",
        },
        body: JSON.stringify({
          textQuery: `${locationName} Japan`,
          languageCode: "ja",
          regionCode: "JP",
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`API response error: ${response.statusText}`);
    }

    const data = await response.json();
    const places = data.places || [];

    let result: GeocodeResult | null = null;

    if (places.length > 0) {
      const place = places[0];
      if (place.location && place.formattedAddress) {
        result = {
          lat: place.location.latitude,
          lng: place.location.longitude,
          address: place.formattedAddress,
        };
      }
    }

    // 新しいジオコーディング結果をキャッシュに保存する
    await prisma.geocodeCache.create({
      data: {
        locationName,
        address: result?.address ?? null,
        lat: result?.lat ?? null,
        lng: result?.lng ?? null,
      },
    });

    return result;
  } catch (error) {
    console.error("❌ Geocoding error:", error);
    return null;
  }
}
