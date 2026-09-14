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

function willRain(probOfPrecipitation: number, precipitationRate: number): boolean {
  return probOfPrecipitation >= 50 && precipitationRate > 0.1;
}

rl.question('Enter latitude: ',  async (lat) => {
  rl.question('Enter longitude: ', async (lon) => {
    try {
      const forecast = await getForecast(parseInt(lat), parseInt(lon));
      // console.log(JSON.stringify(forecast, null, 2));
      console.log('Location name:', forecast.features[0].properties.location.name);
      console.log('Forecast for the next 3 timesteps:');
      process.stdout.write(forecast.features[0].properties.timeSeries[0].time.substring(11, 16)+': ') 
      console.log(forecast.features[0].properties.timeSeries[0].screenTemperature);
      process.stdout.write(forecast.features[0].properties.timeSeries[1].time.substring(11, 16)+': ') 
      console.log(forecast.features[0].properties.timeSeries[1].screenTemperature);
      process.stdout.write(forecast.features[0].properties.timeSeries[2].time.substring(11, 16)+': ') 
      console.log(forecast.features[0].properties.timeSeries[2].screenTemperature);

      if (willRain(forecast.features[0].properties.timeSeries[0].probOfPrecipitation, forecast.features[0].properties.timeSeries[0].precipitationRate) || 
          willRain(forecast.features[0].properties.timeSeries[1].probOfPrecipitation, forecast.features[0].properties.timeSeries[1].precipitationRate) || 
          willRain(forecast.features[0].properties.timeSeries[2].probOfPrecipitation, forecast.features[0].properties.timeSeries[2].precipitationRate)) {
        console.log('Carry an umbrella! Rain is expected in the next hour.');
      } else {
        console.log('No rain expected in the next hour. Enjoy your day!');
      }
    } catch (err) {
      console.error('Error fetching forecast:', err);
    } finally {
      rl.close();
    }});
});