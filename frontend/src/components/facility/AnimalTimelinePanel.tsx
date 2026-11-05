import { useEffect, useState } from "react";
import { getAnimalTimeline, downloadAnimalLabel } from "../../api/facilityApi";
import type { AnimalTimelineEvent, FacilityAnimal } from "../../api/facilityTypes";
import { getApiErrorMessage } from "../../api/errors";
import { formatDisplayDate } from "../../utils/dateFormat";

interface AnimalTimelinePanelProps {
  animal: FacilityAnimal | null;
}

export function AnimalTimelinePanel({ animal }: AnimalTimelinePanelProps) {
  const [events, setEvents] = useState<AnimalTimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTimeline() {
      if (!animal) {
        setEvents([]);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        setEvents(await getAnimalTimeline(animal.id));
      } catch (loadError) {
        setError(getApiErrorMessage(loadError));
        setEvents([]);
      } finally {
        setLoading(false);
      }
    }
    void loadTimeline();
  }, [animal]);

  if (!animal) {
    return (
      <div className="info-card compact-info-card">
        <p>Select an animal to view its audit timeline.</p>
      </div>
    );
  }

  return (
    <section className="dashboard-section">
      <header className="section-header">
        <h3>Audit trail — {animal.animal_number ?? `#${animal.id}`}</h3>
        <button
          type="button"
          className="btn-secondary btn-small"
          onClick={() =>
            void downloadAnimalLabel(animal.id, animal.animal_number ?? String(animal.id))
          }
        >
          Print ear-tag label
        </button>
      </header>
      {loading ? <p>Loading timeline...</p> : null}
      {error ? <p className="field-error">{error}</p> : null}
      {!loading && events.length === 0 ? <p className="empty-text">No timeline events yet.</p> : null}
      <ol className="timeline-list">
        {events.map((event, index) => (
          <li key={`${event.event_type}-${event.date}-${index}`} className="timeline-item">
            <strong>{formatDisplayDate(event.date)}</strong>
            <span className="timeline-type">{event.event_type}</span>
            <p>{event.title}</p>
            {event.details ? <p className="muted-text">{event.details}</p> : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
