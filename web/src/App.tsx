import "./App.css";
import { ActivityLog } from "./components/ActivityLog";
import { EntryForm } from "./components/EntryForm";
import { Masthead } from "./components/Masthead";
import { PersonalRecords } from "./components/PersonalRecords";
import { RacePredictions } from "./components/RacePredictions";
import { WeeklyChart } from "./components/WeeklyChart";
import { useActivities } from "./useActivities";

export default function App() {
  const { activities, summary, feedError, loading, saving, deleting, save, remove } = useActivities();

  return (
    <main>
      <Masthead summary={summary} />

      <WeeklyChart series={summary.weekly_series} trend={summary.pace_trend} />

      <PersonalRecords records={summary.records} />

      <RacePredictions data={summary.race_predictions} />

      <section className="grid">
        <EntryForm saving={saving} onSave={save} />
        <ActivityLog
          activities={activities}
          loading={loading}
          error={feedError}
          deleting={deleting}
          onDelete={remove}
        />
      </section>
    </main>
  );
}
