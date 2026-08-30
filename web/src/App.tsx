import "./App.css";
import { ActivityLog } from "./components/ActivityLog";
import { EntryForm } from "./components/EntryForm";
import { Masthead } from "./components/Masthead";
import { PersonalRecords } from "./components/PersonalRecords";
import { WeeklyChart } from "./components/WeeklyChart";
import { useActivities } from "./useActivities";

export default function App() {
  const { activities, summary, feedError, loading, saving, pendingKudos, save, kudos } = useActivities();

  return (
    <main className="page">
      <Masthead summary={summary} />
      <WeeklyChart series={summary.weekly_series} />
      <PersonalRecords records={summary.records} />

      <div className="columns">
        <EntryForm saving={saving} onSave={save} />
        <ActivityLog
          activities={activities}
          loading={loading}
          error={feedError}
          pendingKudos={pendingKudos}
          onKudos={kudos}
        />
      </div>
    </main>
  );
}
