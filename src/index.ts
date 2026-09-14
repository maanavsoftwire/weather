import * as readline from 'readline';

let rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

function willRain(probOfPrecipitation: number, precipitationRate: number): boolean {
  return probOfPrecipitation >= 50 && precipitationRate > 0.1;
}

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


async function convertPostcodeToCoordinates(postcode: string): Promise<{ latitude: number, longitude: number }> {
  const url = new URL(`https://api.postcodes.io/postcodes/${postcode}`);

  const fetchData = await fetch(url, {
    method: "GET"
  });
  let data = await fetchData.json();

  if (fetchData.status !== 200 || !fetchData.ok) {
      throw new Error(`Invalid postcode: ${postcode}`);
    }
  console.log(`Successfully converted postcode ${postcode} to coordinates ${data.result.latitude}, ${data.result.longitude}`);
  return { latitude: data.result.latitude, longitude: data.result.longitude };
}


function postcodeInput(): Promise<{ latitude: number, longitude: number }> {
  return new Promise((resolve, reject) => {
    rl.question('Enter postcode: ', async (postcode) => {
      try {
        const { latitude, longitude } = await convertPostcodeToCoordinates(postcode);
        resolve({ latitude, longitude });
      } catch (err) {
        console.error('Error while fetching coordinates:', err);
        reject(err);
      } finally {
        rl.close();
      }
    });
  });
}

function coordinatesInput(): Promise<{ latitude: number, longitude: number }> {
  return new Promise((resolve, reject) => {
    rl.question('Enter latitude: ',  async (lat) => {
      rl.question('Enter longitude: ', async (lon) => {
        try {
          const latitude = parseFloat(lat);
          const longitude = parseFloat(lon);
          if (isNaN(latitude) || isNaN(longitude)) {
            throw new Error('Invalid coordinates');
          }
          resolve({ latitude, longitude });
        } catch (err) {
          console.error('Error while fetching coordinates:', err);
          reject(err);
        } finally {
          rl.close();
        }});
    }); 
})}



async function main() {
  try {
    const answer = await askQuestion(
      'Do you want to enter a postcode(P) or coordinates(C)? (Enter "P" or "C"): '
    );

    let latitude: number, longitude: number;

    if (answer.toLowerCase() === 'p') {
      ({ latitude, longitude } = await postcodeInput());
    } else if (answer.toLowerCase() === 'c') {
      ({ latitude, longitude } = await coordinatesInput());
    } else {
      throw new Error(`Unrecognised answer: "${answer}"`);
    }

    const forecast = await getForecast(latitude, longitude);
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
    console.error('Error:', err);
  } finally {
    rl.close();
  }
}

main();
