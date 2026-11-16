// River weather display (Open-Meteo, live from a real river place, or a labelled backup).
//   WeatherLine   : one short line, for River Map markers
//   WeatherSummary: two short lines, for the River Map details panel
//   WeatherCard   : full card, for Route Details
//   WeatherBadge  : small badge at the top of a crossing
//   WeatherEffects: rain / storm drawn AROUND the page (never over the fish picture). Looks only.
// Text always says the condition in words, so nothing depends on colour or animation alone.
import { WEATHER_KIND_LABEL, type RegionWeather } from '@riverbound/shared';
import '../../styles/components/weather.css';

const ICON: Record<RegionWeather['kind'], string> = { calm: '☀', rain: '🌧', storm: '⛈' };

/** Open-Meteo's licence (CC BY 4.0) asks for this link next to every place its data is shown. */
function Credit({ short }: { short?: boolean }) {
  return (
    <a className="weather-credit" href="https://open-meteo.com/" target="_blank" rel="noreferrer">
      {short ? 'Open-Meteo' : 'Weather data by Open-Meteo.com'}
    </a>
  );
}

function sourceText(w: RegionWeather): string {
  return w.source === 'live' ? `Live weather from ${w.place}, ${w.country}` : `Backup ${WEATHER_KIND_LABEL[w.kind].toLowerCase()} (not live)`;
}

export function WeatherLine({ weather }: { weather: RegionWeather | undefined }) {
  if (!weather) return null;
  return (
    <span className={`weather-line weather-line--${weather.kind}`}>
      <span aria-hidden="true">{ICON[weather.kind]} </span>
      {weather.condition} · {Math.round(weather.windKmh)} km/h{weather.source === 'backup' ? ' · backup' : ''}
    </span>
  );
}

export function WeatherCard({ weather, timed }: { weather: RegionWeather | undefined; timed?: boolean }) {
  if (!weather) return null;
  return (
    <section className={`weather-card weather-card--${weather.kind}`} aria-label="River weather">
      <p className="weather-card__eyebrow">
        <span aria-hidden="true">{ICON[weather.kind]} </span>
        {WEATHER_KIND_LABEL[weather.kind]} on the {weather.river}
      </p>
      <p className="weather-card__main">{weather.condition}</p>
      <dl className="weather-card__facts">
        <div>
          <dt>Wind</dt>
          <dd>{Math.round(weather.windKmh)} km/h</dd>
        </div>
        <div>
          <dt>Gusts</dt>
          <dd>{Math.round(weather.gustKmh)} km/h</dd>
        </div>
        <div>
          <dt>Rain</dt>
          <dd>{weather.rainMm.toFixed(1)} mm</dd>
        </div>
      </dl>
      <p className="weather-card__source">
        {sourceText(weather)} · <Credit />
      </p>
      {weather.liveNow && (
        <p className="weather-card__live">
          Real {weather.place} right now: {weather.liveNow}.
        </p>
      )}
      {weather.timerPenaltySeconds > 0 && (
        <p className="weather-card__effect">
          {timed === false
            ? `Timed mode would be ${weather.timerPenaltySeconds} s shorter in this weather.`
            : `The weather takes ${weather.timerPenaltySeconds} s off each timed crossing.`}
        </p>
      )}
    </section>
  );
}

/** Two short lines, for the River Map details panel (the full card would cover the navigation bar). */
export function WeatherSummary({ weather }: { weather: RegionWeather | undefined }) {
  if (!weather) return null;
  return (
    <p className={`weather-summary weather-summary--${weather.kind}`}>
      <span aria-hidden="true">{ICON[weather.kind]} </span>
      <strong>{weather.condition}</strong> · wind {Math.round(weather.windKmh)} km/h · rain {weather.rainMm.toFixed(1)} mm
      <br />
      <span className="weather-summary__source">
        {sourceText(weather)}
        {weather.timerPenaltySeconds > 0 ? ` · timed crossings ${weather.timerPenaltySeconds} s shorter` : ''} · <Credit short />
      </span>
    </p>
  );
}

export function WeatherBadge({ weather }: { weather: RegionWeather | null | undefined }) {
  if (!weather) return null;
  return (
    <p className={`weather-badge weather-badge--${weather.kind}`}>
      <span aria-hidden="true">{ICON[weather.kind]} </span>
      {weather.condition} · wind {Math.round(weather.windKmh)} km/h · {weather.source === 'live' ? `live, ${weather.place}` : 'backup'} ·{' '}
      <Credit short />
    </p>
  );
}

/** Full-screen rain or storm behind the page panels. Hidden from screen readers; still with reduced motion. */
export function WeatherEffects({ weather }: { weather: RegionWeather | null | undefined }) {
  if (!weather || weather.kind === 'calm') return null;
  return <div className={`weather-fx weather-fx--${weather.kind}`} aria-hidden="true" />;
}
