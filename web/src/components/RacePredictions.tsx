import type { Summary } from "../api";

const clock = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(secs)}` : `${minutes}:${pad(secs)}`;
};

const pace = (seconds: number, km: number) => {
  const perKm = Math.round(seconds / km);
  return `${Math.floor(perKm / 60)}:${String(perKm % 60).padStart(2, "0")}/km`;
};

/** Projected race times, so the log says what the training is worth. */
export function RacePredictions({ data }: { data: Summary["race_predictions"] }) {
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
              <td className="num table-muted">{pace(prediction.seconds, prediction.distance_km)}</td>
            </tr>
          ))}
        </tbody>
      </table>

    </section>
  );
}
