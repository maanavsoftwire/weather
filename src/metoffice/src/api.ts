export interface ForecastTimestep {
  time: string;
  screenTemperature: number;
  probOfPrecipitation: number;
  precipitationRate: number;
}

export interface ForecastResponse {
  features: {
    properties: {
      location: { name: string };
      timeSeries: ForecastTimestep[];
    };
  }[];
}

export async function getForecast(latitude: number, longitude: number, timestep: "hourly" | "three-hourly" | "daily" = "hourly"): Promise<ForecastResponse> {
  const url = new URL(`https://data.hub.api.metoffice.gov.uk/sitespecific/v0/point/${timestep}`);
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("includeLocationName", "true");
  url.searchParams.set("excludeParameterMetadata", "true");

  const response = await fetch(url, {
    headers: {
      apikey: import.meta.env.VITE_MET_OFFICE_API_KEY,
      accept: "application/json",
    },
    method: "GET"
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Met Office API error ${response.status}: ${body}`);
  }

  return response.json();
}

export async function convertPostcodeToCoordinates(postcode: string): Promise<{ latitude: number, longitude: number }> {
  const url = new URL(`https://api.postcodes.io/postcodes/${postcode}`);

  const fetchData = await fetch(url, {
    method: "GET"
  });

  if (fetchData.status !== 200 || !fetchData.ok) {
    throw new Error(`Invalid postcode: ${postcode}`);
  }

  const data = await fetchData.json();
  return { latitude: data.result.latitude, longitude: data.result.longitude };
}
