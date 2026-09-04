import type { Summary } from "../api";
import { KM_PER_MILE } from "../lib/format";
import type { DistanceUnit } from "../lib/format";

const clock = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(secs)}` : `${minutes}:${pad(secs)}`;
};

const pace = (seconds: number, km: number, unit: DistanceUnit) => {
  const perUnit = Math.round(seconds / km * (unit === "mi" ? KM_PER_MILE : 1));
  return `${Math.floor(perUnit / 60)}:${String(perUnit % 60).padStart(2, "0")}/${unit}`;
};

/** Projected race times, so the log says what the training is worth. */
export function RacePredictions({ data, unit }: { data: Summary["race_predictions"]; unit: DistanceUnit }) {
  if (!data) return null;

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>If you raced today</h2>
      </div>

      <table className="table">
        <tbody>
          {data.predictions.map((prediction) => (
            <tr key={prediction.label}>
              <th scope="row">{prediction.label}</th>
              <td className="num table-figure">{clock(prediction.seconds)}</td>
              <td className="num table-muted">{pace(prediction.seconds, prediction.distance_km, unit)}</td>
            </tr>
          ))}
        </tbody>
      </table>

    </section>
  );
}
