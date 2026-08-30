import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, EMPTY_SUMMARY, createActivity, deleteActivity, fetchFeed, giveKudos } from "./api";
import type { Activity, NewActivity, Summary } from "./api";

const describe = (error: unknown) =>
  error instanceof ApiError ? error.message : "Something went wrong. Try again.";

/**
 * Owns every piece of server state the page needs. Kept out of the components
 * so they stay presentational and the request-ordering rules live in one place.
 */
export function useActivities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [summary, setSummary] = useState<Summary>(EMPTY_SUMMARY);
  const [feedError, setFeedError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingKudos, setPendingKudos] = useState<number[]>([]);
  const [deleting, setDeleting] = useState<number[]>([]);

  // Saves and reloads overlap, so an older response must never overwrite the
  // state a newer one already wrote.
  const latestLoad = useRef(0);

  const load = useCallback(async () => {
    const token = ++latestLoad.current;
    try {
      const feed = await fetchFeed();
      if (token !== latestLoad.current) return;
      setActivities(feed.activities);
      setSummary(feed.summary);
      setFeedError("");
    } catch (failure) {
      if (token !== latestLoad.current) return;
      // Failing silently here made saved runs look like they had vanished.
      setFeedError(describe(failure));
    } finally {
      if (token === latestLoad.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** Resolves to an error message, or null when the activity was saved. */
  const save = useCallback(
    async (form: NewActivity): Promise<string | null> => {
      if (saving) return null; // guards double submits, which used to duplicate
      setSaving(true);
      try {
        await createActivity(form);
        await load();
        return null;
      } catch (failure) {
        return describe(failure);
      } finally {
        setSaving(false);
      }
    },
    [load, saving],
  );

  const remove = useCallback(
    async (id: number) => {
      if (deleting.includes(id)) return;
      setDeleting((ids) => [...ids, id]);
      try {
        await deleteActivity(id);
        await load();
      } catch (failure) {
        setFeedError(describe(failure));
      } finally {
        setDeleting((ids) => ids.filter((pending) => pending !== id));
      }
    },
    [deleting, load],
  );

  const kudos = useCallback(
    async (id: number) => {
      if (pendingKudos.includes(id)) return;
      setPendingKudos((ids) => [...ids, id]);
      try {
        const { activity } = await giveKudos(id);
        setActivities((current) =>
          current.map((item) => (item.id === id ? { ...item, kudos_count: activity.kudos_count } : item)),
        );
        setFeedError("");
      } catch (failure) {
        setFeedError(describe(failure));
      } finally {
        setPendingKudos((ids) => ids.filter((pending) => pending !== id));
      }
    },
    [pendingKudos],
  );

  return { activities, summary, feedError, loading, saving, pendingKudos, deleting, save, kudos, remove };
}
