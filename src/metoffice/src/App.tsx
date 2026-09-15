import React, { useState } from 'react';
import { convertPostcodeToCoordinates, getForecast } from './api';
import MapPicker from './MapPicker';
import { resolveTimeZone, formatLocalTime, getCurrentHourInTimeZone } from './timezone';

interface ForecastSummary {
  locationName: string;
  timesteps: { time: string; temperature: number }[];
  rainExpected: boolean;
  timeZone: string;
}

function willRain(probOfPrecipitation: number, precipitationRate: number): boolean {
  return probOfPrecipitation >= 50 && precipitationRate > 0.1;
}

function isNightTime(hour: number): boolean {
    return hour >= 19 || hour < 5;
}

async function fetchForecastSummary(postcode: string): Promise<ForecastSummary>;
async function fetchForecastSummary(latitude: number, longitude: number): Promise<ForecastSummary>;
async function fetchForecastSummary(
  postcodeOrLat: string | number,
  longitude?: number
): Promise<ForecastSummary> {
  let latitude: number;
  let lng: number;

  if (typeof postcodeOrLat === 'string') {
    const coords = await convertPostcodeToCoordinates(postcodeOrLat);
    latitude = coords.latitude;
    lng = coords.longitude;
  } else {
    latitude = postcodeOrLat;
    lng = longitude!;
  }

  const forecast = await getForecast(latitude, lng);
  const feature = forecast.features[0];
  const nextTimesteps = feature.properties.timeSeries.slice(0, 3);
  const timeZone = resolveTimeZone(latitude, lng);

  return {
    locationName: feature.properties.location.name,
    timesteps: nextTimesteps.map((step) => ({
      time: formatLocalTime(step.time, timeZone),
      temperature: step.screenTemperature,
    })),
    rainExpected: nextTimesteps.some((step) => willRain(step.probOfPrecipitation, step.precipitationRate)),
    timeZone,
  };
}

function App(): React.ReactElement {
    const [postcode, setPostcode] = useState<string>("");
    const [forecast, setForecast] = useState<ForecastSummary | null>(null);
    const [error, setError] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);
    const [pickedCoords, setPickedCoords] = useState<{ lat: number; lon: number } | null>(null);

    async function loadForecast(fetcher: () => Promise<ForecastSummary>): Promise<void> {
        setError("");
        setForecast(null);
        setLoading(true);
        try {
            const summary = await fetcher();
            setForecast(summary);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fetch forecast");
        } finally {
            setLoading(false);
        }
    }

    async function formHandler(event: React.FormEvent<HTMLFormElement>): Promise<void> {
        event.preventDefault(); // to stop the form refreshing the page when it submits
        await loadForecast(() => fetchForecastSummary(postcode));
    }

    function updatePostcode(data: React.ChangeEvent<HTMLInputElement>): void {
        setPostcode(data.target.value)
    }

    async function handleMapPick(lat: number, lon: number): Promise<void> {
        setPickedCoords({ lat, lon });
        await loadForecast(() => fetchForecastSummary(lat, lon));
    }

    const isRaining = forecast?.rainExpected ?? false;
    const displayTimeZone = forecast?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
    const isNight = isNightTime(getCurrentHourInTimeZone(displayTimeZone));

    return <>
        <div className="weather-scene" aria-hidden="true">
            {isRaining ? (
                <>
                    <div className="pixel-cloud pixel-cloud-left" />
                    <div className="pixel-cloud pixel-cloud-right" />
                    <div className="pixel-cloud pixel-cloud-middle" />
                    <div className="rain-overlay" />
                </>
            ) : isNight ? (
                <div className="pixel-moon">
                    <span className="pixel-star pixel-star-a" />
                    <span className="pixel-star pixel-star-b" />
                    <span className="pixel-star pixel-star-c" />
                </div>
            ) : (
                <div className="pixel-sun" />
            )}
        </div>

        <div className="app">
        <h1>Met Office Weather</h1>

        <form className="postcode-form" onSubmit={formHandler}>
            <label htmlFor="postcodeInput">Postcode</label>
            <div className="postcode-form-controls">
                <input
                    type="text"
                    id="postcodeInput"
                    className="postcode-input"
                    placeholder="e.g. NW5 1TL"
                    value={postcode}
                    onChange={updatePostcode}
                    autoComplete="postal-code"
                />
                <button type="submit" className="submit-button" disabled={loading || !postcode.trim()}>
                    {loading ? "Loading…" : "Get forecast"}
                </button>
            </div>
        </form>

        <section className="map-card">
            <h2>Pick a location</h2>
            <MapPicker onPick={handleMapPick} />
            {pickedCoords && (
                <div className="coords-readout">
                    lat: {pickedCoords.lat.toFixed(5)}, lon: {pickedCoords.lon.toFixed(5)}
                </div>
            )}
        </section>

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
        </div>
    </>;
}
export default App;
