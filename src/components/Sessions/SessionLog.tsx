import { useEffect, useState } from "react";
import {
  deleteSession,
  listSessions,
  saveSession,
} from "../../services/sessions";
import type { Session } from "../../services/sessions";
import { errorMessage } from "../../utils/errors";
import "./SessionLog.scss";

type Draft = Omit<Session, "id"> & { id?: string };

const today = () => new Date().toISOString().slice(0, 10);

const formatDate = (iso: string) =>
  iso
    ? new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

const SessionForm = ({
  initial,
  onSave,
  onCancel,
}: {
  initial: Draft;
  onSave: (draft: Draft) => Promise<void>;
  onCancel: () => void;
}) => {
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const set = (change: Partial<Draft>) => setDraft({ ...draft, ...change });

  // Not a <form>: the session log sits inside the campaign form
  return (
    <div className="session-form" aria-label="Session details" role="group">
      <label htmlFor="session-date">Date</label>
      <input
        id="session-date"
        type="date"
        value={draft.date}
        onChange={(e) => set({ date: e.target.value })}
      />
      <label htmlFor="session-title">Title</label>
      <input
        id="session-title"
        type="text"
        maxLength={100}
        value={draft.title}
        onChange={(e) => set({ title: e.target.value })}
        placeholder="e.g. The road to Barovia"
      />
      <label htmlFor="session-recap">Recap (everyone sees this)</label>
      <textarea
        id="session-recap"
        rows={5}
        value={draft.recap}
        onChange={(e) => set({ recap: e.target.value })}
      />
      <label htmlFor="session-notes">DM notes (only you see these)</label>
      <textarea
        id="session-notes"
        rows={3}
        value={draft.dmNotes}
        onChange={(e) => set({ dmNotes: e.target.value })}
      />
      <div className="session-form__actions">
        <button
          type="button"
          disabled={saving || !draft.date || !draft.title.trim()}
          onClick={async () => {
            setSaving(true);
            try {
              await onSave({ ...draft, title: draft.title.trim() });
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? "Saving..." : "Save session"}
        </button>
        <button type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </div>
  );
};

const SessionLog = ({
  campaignId,
  isDm,
}: {
  campaignId: string;
  isDm: boolean;
}) => {
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listSessions(campaignId, isDm)
      .then(setSessions)
      .catch((err) => setError(errorMessage(err, "Couldn't load sessions")));
  }, [campaignId, isDm]);

  const save = async (draft: Draft) => {
    try {
      const id = await saveSession(campaignId, draft);
      const saved = { ...draft, id };
      setSessions((prev) =>
        [saved, ...(prev ?? []).filter((s) => s.id !== id)].sort(
          (a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id)
        )
      );
      setEditing(null);
      setError(null);
    } catch (err) {
      setError(errorMessage(err, "Couldn't save the session"));
    }
  };

  const remove = async (session: Session) => {
    if (!window.confirm(`Delete "${session.title}"?`)) return;
    try {
      await deleteSession(campaignId, session.id);
      setSessions((prev) => prev?.filter((s) => s.id !== session.id) ?? null);
    } catch (err) {
      setError(errorMessage(err, "Couldn't delete the session"));
    }
  };

  return (
    <section className="campaign-form__section session-log">
      <h3>📜 Session log</h3>
      {error && (
        <p className="session-log__error" role="alert">
          {error}
        </p>
      )}

      {isDm && !editing && (
        <button
          type="button"
          className="session-log__new"
          onClick={() =>
            setEditing({ date: today(), title: "", recap: "", dmNotes: "" })
          }
        >
          New session
        </button>
      )}
      {editing && !editing.id && (
        <SessionForm
          initial={editing}
          onSave={save}
          onCancel={() => setEditing(null)}
        />
      )}

      {sessions === null ? (
        <p>Loading sessions…</p>
      ) : sessions.length === 0 ? (
        <p className="session-log__empty">No sessions logged yet.</p>
      ) : (
        <ol className="session-log__list" aria-label="Sessions">
          {sessions.map((session) =>
            editing?.id === session.id ? (
              <li key={session.id}>
                <SessionForm
                  initial={editing}
                  onSave={save}
                  onCancel={() => setEditing(null)}
                />
              </li>
            ) : (
              <li key={session.id} className="session-log__entry">
                <h4>
                  {session.title}{" "}
                  <span className="session-log__date">
                    {formatDate(session.date)}
                  </span>
                </h4>
                {session.recap && (
                  <p className="session-log__recap">{session.recap}</p>
                )}
                {isDm && session.dmNotes && (
                  <p className="session-log__notes">
                    <strong>DM notes:</strong> {session.dmNotes}
                  </p>
                )}
                {isDm && (
                  <div className="session-log__actions">
                    <button
                      type="button"
                      onClick={() => setEditing(session)}
                      aria-label={`Edit ${session.title}`}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(session)}
                      aria-label={`Delete ${session.title}`}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </li>
            )
          )}
        </ol>
      )}
    </section>
  );
};

export default SessionLog;
