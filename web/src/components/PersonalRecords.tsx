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
      {longest && <Record label="Longest run" name={longest.title} figure={`${longest.distance_km} km`} />}
      {fastest && <Record label="Fastest pace" name={fastest.title} figure={paceLabel(fastest.pace_per_km)} />}
    </dl>
  );
}

function Record({ label, name, figure }: { label: string; name: string; figure: string }) {
  return (
    <div className="record">
      <dt>{label}</dt>
      <dd>
        {name}
        <span className="num record-figure">{figure}</span>
      </dd>
    </div>
  );
}
