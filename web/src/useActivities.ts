import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, EMPTY_SUMMARY, createActivity, deleteActivity, fetchFeed, giveKudos, removeKudos } from "./api";
import { readLikes, writeLikes } from "./lib/likes";
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
  // Which activities this browser has already given kudos to.
  const [liked, setLiked] = useState<number[]>(readLikes);

  // Saves and reloads overlap, so an older response must never overwrite the
  // state a newer one already wrote.
  const latestLoad = useRef(0);

  // In-flight guards live in refs, not state. Rapid synchronous clicks all read
  // the same stale state value before React re-renders — and `disabled` has not
  // been applied yet either — so a state-based guard lets every click through.
  // A ref is written and read synchronously, so the second click sees the first.
  const inFlightKudos = useRef<Set<number>>(new Set());
  const inFlightDelete = useRef<Set<number>>(new Set());
  const inFlightSave = useRef(false);

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
      if (inFlightSave.current) return null; // guards double submits
      inFlightSave.current = true;
      setSaving(true);
      try {
        await createActivity(form);
        await load();
        return null;
      } catch (failure) {
        return describe(failure);
      } finally {
        inFlightSave.current = false;
        setSaving(false);
      }
    },
    [load],
  );

  const remove = useCallback(
    async (id: number) => {
      if (inFlightDelete.current.has(id)) return;
      inFlightDelete.current.add(id);
      setDeleting((ids) => [...ids, id]);
      try {
        await deleteActivity(id);
        await load();
      } catch (failure) {
        setFeedError(describe(failure));
      } finally {
        inFlightDelete.current.delete(id);
        setDeleting((ids) => ids.filter((pending) => pending !== id));
      }
    },
    [load],
  );

  /** Toggles this browser's single kudos on an activity. */
  const kudos = useCallback(
    async (id: number) => {
      if (inFlightKudos.current.has(id)) return;
      inFlightKudos.current.add(id);
      const alreadyLiked = liked.includes(id);

      setPendingKudos((ids) => [...ids, id]);
      try {
        const { activity } = alreadyLiked ? await removeKudos(id) : await giveKudos(id);

        setActivities((current) =>
          current.map((item) => (item.id === id ? { ...item, kudos_count: activity.kudos_count } : item)),
        );

        const next = alreadyLiked ? liked.filter((likedId) => likedId !== id) : [...liked, id];
        setLiked(next);
        writeLikes(next);
        setFeedError("");
      } catch (failure) {
        setFeedError(describe(failure));
      } finally {
        inFlightKudos.current.delete(id);
        setPendingKudos((ids) => ids.filter((pending) => pending !== id));
      }
    },
    [liked],
  );

  return { activities, summary, feedError, loading, saving, pendingKudos, deleting, liked, save, kudos, remove };
}
