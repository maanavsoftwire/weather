import * as readline from 'readline';

let rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function getForecast(latitude: number, longitude: number, timestep: "hourly" | "three-hourly" | "daily" = "hourly") {
  const url = new URL(`https://data.hub.api.metoffice.gov.uk/sitespecific/v0/point/${timestep}`);
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("includeLocationName", "true");
  url.searchParams.set("excludeParameterMetadata", "true");

  const response = await fetch(url, {
    headers: {
      apikey: process.env.MET_OFFICE_API_KEY!,
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

rl.question('Enter latitude: ',  async (lat) => {
  rl.question('Enter longitude: ', async (lon) => {
    try {
      const forecast = await getForecast(parseInt(lat), parseInt(lon));
      console.log(JSON.stringify(forecast, null, 2));
    } catch (err) {
      console.error('Error fetching forecast:', err);
    } finally {
      rl.close();
    }});
});