export interface PexelsPhotoSources {
  original: string;
  large2x: string;
  large: string;
  medium: string;
  small: string;
  portrait: string;
  landscape: string;
  tiny: string;
}

export interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  photographer_id: number;
  avg_color: string;
  src: PexelsPhotoSources;
  liked: boolean;
  alt: string;
}

export interface PexelsSearchResponse {
  total_results: number;
  page: number;
  per_page: number;
  photos: PexelsPhoto[];
  next_page?: string;
}

/** Shared Pexels API key and base logic */
const PEXELS_API_KEY: string = "CNGrl2jH56uHNF8UyIpWe8gbM18ojMN8EaPXHpZidLDCCdclIqFrSBuX";

/**
 * Searches Pexels for car images matching the given query.
 * Returns the full list of photos so the user can pick one.
 */
export async function searchCarImages(query: string): Promise<PexelsPhoto[]> {
  const url: string = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=80&size=small`;

  try {
    const response: Response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": PEXELS_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`Pexels API error: ${response.status} ${response.statusText}`);
    }

    const data: PexelsSearchResponse = await response.json();
    return data.photos || [];
  } catch (error) {
    console.error("Error fetching car images from Pexels:", error);
    return [];
  }
}

/**
 * Returns only the first image URL for a given search query.
 */
export async function getFirstCarImage(query: string): Promise<string | null> {
  const photos = await searchCarImages(query);
  if (photos.length > 0) {
    return photos[0].src.large;
  }
  console.warn(`No image found for query: "${query}"`);
  return null;
}
