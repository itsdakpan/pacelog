import type { Summary } from "../api";
import { formatDistance, formatPace } from "../lib/format";
import type { DistanceUnit } from "../lib/format";

export function PersonalRecords({ records, unit }: { records: Summary["records"]; unit: DistanceUnit }) {
  const { longest_run: longest, fastest_pace: fastest } = records;
  if (!longest && !fastest) return null;

  return (
    <dl className="records">
      {longest && (
        <Record
          label="Longest run"
          figure={formatDistance(longest.distance_km, unit)}
          note="furthest single run — walks excluded"
        />
      )}
      {fastest && (
        <Record
          label="Fastest pace"
          figure={formatPace(fastest.pace_per_km, unit)}
          note="best average pace over a whole run"
        />
      )}
    </dl>
  );
}

type RecordProps = { label: string; figure: string; note: string };

function Record({ label, figure, note }: RecordProps) {
  return (
    <div className="record">
      <dt>{label}</dt>
      <dd>
        <span className="num record-figure">{figure}</span>
        <span className="stat-note">{note}</span>
      </dd>
    </div>
  );
}
