import "./App.css";
import { ActivityLog } from "./components/ActivityLog";
import { EntryForm } from "./components/EntryForm";
import { Masthead } from "./components/Masthead";
import { PersonalRecords } from "./components/PersonalRecords";
import { RacePredictions } from "./components/RacePredictions";
import { WeeklyChart } from "./components/WeeklyChart";
import { useActivities } from "./useActivities";
import type { DistanceUnit } from "./lib/format";

export default function App() {
  const [unit, setUnit] = useState<DistanceUnit>("km");
  const { activities, summary, feedError, loading, saving, deleting, save, remove } = useActivities();

  return (
    <main>
      <Masthead summary={summary} unit={unit} onUnitChange={setUnit} />

      <WeeklyChart series={summary.weekly_series} trend={summary.pace_trend} unit={unit} />

      <PersonalRecords records={summary.records} unit={unit} />

      <RacePredictions data={summary.race_predictions} unit={unit} />

      <section className="grid">
        <EntryForm saving={saving} onSave={save} unit={unit} />
        <ActivityLog
          activities={activities}
          loading={loading}
          error={feedError}
          deleting={deleting}
          onDelete={remove}
          unit={unit}
        />
      </section>
    </main>
  );
}
import { useState } from "react";
