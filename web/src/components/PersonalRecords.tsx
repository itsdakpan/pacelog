import type { Summary } from "../api";

const paceLabel = (paceMinutes: number) => {
  const total = Math.round(paceMinutes * 60);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}/km`;
};

export function PersonalRecords({ records }: { records: Summary["records"] }) {
  const { longest_run: longest, fastest_pace: fastest } = records;
  if (!longest && !fastest) return null;

  return (
    <dl className="records">
      {longest && (
        <Record
          label="Longest run"
          figure={`${longest.distance_km} km`}
          note="furthest single run — rides and walks excluded"
        />
      )}
      {fastest && (
        <Record
          label="Fastest pace"
          figure={paceLabel(fastest.pace_per_km)}
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
