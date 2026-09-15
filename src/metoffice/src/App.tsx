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

    return <div className="app">
        <h1>Met Office Weather</h1>

        <form className="postcode-form" onSubmit={formHandler}>
            <label htmlFor="postcodeInput">Postcode</label>
            <div className="postcode-form-controls">
                <input
                    type="text"
                    id="postcodeInput"
                    className="postcode-input"
                    placeholder="e.g. SW1A 1AA"
                    value={postcode}
                    onChange={updatePostcode}
                    autoComplete="postal-code"
                />
                <button type="submit" className="submit-button" disabled={loading || !postcode.trim()}>
                    {loading ? "Loading…" : "Get forecast"}
                </button>
            </div>
        </form>

        {error && <div className="alert alert-error" role="alert">{error}</div>}

        {forecast && <section className="forecast-card">
            <h2>{forecast.locationName}</h2>

            <div className="timesteps">
                {forecast.timesteps.map((step) => (
                    <div className="timestep" key={step.time}>
                        <span className="timestep-time">{step.time}</span>
                        <span className="timestep-temp">{Math.round(step.temperature)}&deg;</span>
                    </div>
                ))}
            </div>

            <div className={`rain-banner ${forecast.rainExpected ? "rain-yes" : "rain-no"}`}>
                <span className="rain-icon" aria-hidden="true">{forecast.rainExpected ? "☂️" : "☀️"}</span>
                <span>{forecast.rainExpected
                    ? "Carry an umbrella! Rain is expected soon."
                    : "No rain expected soon. Enjoy your day!"}</span>
            </div>
        </section>}
    </div>;
}
export default App;
