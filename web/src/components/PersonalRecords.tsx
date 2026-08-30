import type { Summary } from "../api";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const shortDate = (iso: string) => {
  const [, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]}`;
};

const paceLabel = (paceMinutes: number) => {
  const total = Math.round(paceMinutes * 60);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}/km`;
};

export function PersonalRecords({ records }: { records: Summary["records"] }) {
  const { longest_run: longest, fastest_pace: fastest, biggest_week: biggest } = records;
  if (!longest && !fastest && !biggest) return null;

  return (
    <dl className="records">
      {longest && (
        <Record label="Longest run" name={longest.title} figure={`${longest.distance_km} km`} />
      )}
      {fastest && (
        <Record label="Fastest pace" name={fastest.title} figure={paceLabel(fastest.pace_per_km)} />
      )}
      {biggest && (
        <Record label="Biggest week" name={shortDate(biggest.week_start)} figure={`${biggest.distance_km} km`} />
      )}
    </dl>
  );
}

function Record({ label, name, figure }: { label: string; name: string; figure: string }) {
  return (
    <div className="record">
      <dt>{label}</dt>
      <dd>
        {name} <span className="num record-figure">{figure}</span>
      </dd>
    </div>
  );
}
