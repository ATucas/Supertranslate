import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type {
  Session,
  SubtitleSegment,
  ClientEvent,
} from "@subtitle/contracts";
import "./style.css";
const api = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
function App() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selected, setSelected] = useState("");
  const [segments, setSegments] = useState<SubtitleSegment[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch(`${api}/sessions`)
      .then((r) => r.json())
      .then(setSessions)
      .catch(() => setError("Could not load sessions"));
  }, []);
  useEffect(() => {
    if (!selected) return;
    setSegments([]);
    const ws = new WebSocket(
      `${api.replace(/^http/, "ws")}/sessions/${selected}/ws`,
    );
    ws.onmessage = (e) => {
      const event = JSON.parse(e.data) as ClientEvent;
      if (event.type === "session.snapshot") setSegments(event.segments);
      else if (event.type === "subtitle.segment")
        setSegments((old) =>
          old.some((x) => x.id === event.segment.id)
            ? old
            : [...old, event.segment],
        );
    };
    ws.onerror = () => setError("WebSocket connection failed");
    return () => ws.close();
  }, [selected]);
  return (
    <main>
      <header>
        <h1>Subtitle Audience</h1>
        <p>Live bilingual captions</p>
      </header>
      <section className="controls">
        <label>
          Session{" "}
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">Choose a session</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </label>
      </section>
      {error && <p className="error">{error}</p>}
      <section className="captions">
        {segments.length === 0 ? (
          <p className="empty">Select a session to watch captions.</p>
        ) : (
          segments.map((s) => (
            <article key={s.id}>
              <div>{s.source}</div>
              <div className="translation">{s.translation}</div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
