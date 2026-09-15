import React, { useState } from 'react';
import { convertPostcodeToCoordinates, getForecast } from './api';

interface ForecastSummary {
  locationName: string;
  timesteps: { time: string; temperature: number }[];
  rainExpected: boolean;
}

function willRain(probOfPrecipitation: number, precipitationRate: number): boolean {
  return probOfPrecipitation >= 50 && precipitationRate > 0.1;
}

async function fetchForecastSummary(postcode: string): Promise<ForecastSummary> {
  const { latitude, longitude } = await convertPostcodeToCoordinates(postcode);
  const forecast = await getForecast(latitude, longitude);
  const feature = forecast.features[0];
  const nextTimesteps = feature.properties.timeSeries.slice(0, 3);

  return {
    locationName: feature.properties.location.name,
    timesteps: nextTimesteps.map((step) => ({
      time: step.time.substring(11, 16),
      temperature: step.screenTemperature,
    })),
    rainExpected: nextTimesteps.some((step) => willRain(step.probOfPrecipitation, step.precipitationRate)),
  };
}

function App(): React.ReactElement {
    const [postcode, setPostcode] = useState<string>("");
    const [forecast, setForecast] = useState<ForecastSummary | null>(null);
    const [error, setError] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);

    async function formHandler(event: React.FormEvent<HTMLFormElement>): Promise<void> {
        event.preventDefault(); // to stop the form refreshing the page when it submits
        setError("");
        setForecast(null);
        setLoading(true);
        try {
            const summary = await fetchForecastSummary(postcode);
            setForecast(summary);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fetch forecast");
        } finally {
            setLoading(false);
        }
    }

    function updatePostcode(data: React.ChangeEvent<HTMLInputElement>): void {
        setPostcode(data.target.value)
    }

    return <>
        <h1> Met Office Weather </h1>
        <form onSubmit={formHandler}>
            <label htmlFor="postcodeInput"> Postcode: </label>
            <input type="text" id="postcodeInput" onChange={updatePostcode}/>
            <input type="submit" value="Submit" disabled={loading}/>
        </form>
        {loading && <p>Loading forecast...</p>}
        {error && <p style={{ color: "red" }}>{error}</p>}
        {forecast && <div>
            <h2>{forecast.locationName}</h2>
            <table>
                <thead>
                    <tr><th>Time</th><th>Temperature (&deg;C)</th></tr>
                </thead>
                <tbody>
                    {forecast.timesteps.map((step) => (
                        <tr key={step.time}><td>{step.time}</td><td>{step.temperature}</td></tr>
                    ))}
                </tbody>
            </table>
            <p>{forecast.rainExpected
                ? "Carry an umbrella! Rain is expected soon."
                : "No rain expected soon. Enjoy your day!"}</p>
        </div>}
    </>;
}
export default App;
