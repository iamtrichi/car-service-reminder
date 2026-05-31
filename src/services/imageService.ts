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

export async function getFirstCarImage(query: string): Promise<string | null> {
  // Remplacez par votre clé API gratuite obtenue sur ://pexels.com
  const apiKey: string = "CNGrl2jH56uHNF8UyIpWe8gbM18ojMN8EaPXHpZidLDCCdclIqFrSBuX"; 
  
  const url: string = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=20&size=small`;

  try {
    const response: Response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Erreur Pexels API: ${response.status} ${response.statusText}`);
    }

    const data: PexelsSearchResponse = await response.json();

    console.log(data);

    if (data.photos && data.photos.length > 0) {
      // .medium (350px) ou .large (940px) ou .original selon vos besoins
      return data.photos[0].src.large; 
    }

    console.warn(`Aucune image trouvée pour la recherche : "${query}"`);
    return null;

  } catch (error) {
    console.error("Erreur lors de la récupération de l'image :", error);
    return null;
  }
}