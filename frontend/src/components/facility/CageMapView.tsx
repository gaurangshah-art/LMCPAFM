import type { FacilityCageMapRoom } from "../../api/facilityTypes";

interface CageMapViewProps {
  rooms: FacilityCageMapRoom[];
  onSelectAnimal?: (animalId: number) => void;
  onPrintCageLabel?: (cageId: number, cageLabel: string) => void | Promise<void>;
  printingCageId?: number | null;
}

export function CageMapView({ rooms, onSelectAnimal, onPrintCageLabel, printingCageId }: CageMapViewProps) {
  if (rooms.length === 0) {
    return <p className="empty-text">No rooms or cages configured yet.</p>;
  }

  return (
    <div className="cage-map">
      {rooms.map((room) => (
        <section key={room.id} className="cage-map-room">
          <header className="cage-map-room-header">
            <h3>{room.code} — {room.name}</h3>
            {room.building ? <p>{room.building}</p> : null}
          </header>
          {room.cages.length === 0 ? (
            <p className="empty-text">No cages in this room.</p>
          ) : (
            <div className="cage-map-grid">
              {room.cages.map((cage) => {
                const full = cage.animal_count >= cage.capacity;
                return (
                  <article
                    key={cage.id}
                    className={`cage-map-card ${full ? "cage-map-card-full" : ""}`}
                  >
                    <h4>{cage.label}</h4>
                    <p>{cage.location}</p>
                    <p>
                      {cage.animal_count}/{cage.capacity} animals · {cage.status}
                    </p>
                    {onPrintCageLabel && cage.animal_count > 0 ? (
                      <p className="inline-actions">
                        <button
                          type="button"
                          className="btn-secondary btn-small"
                          disabled={printingCageId === cage.id}
                          onClick={() => void onPrintCageLabel(cage.id, cage.label)}
                        >
                          {printingCageId === cage.id ? "Printing..." : "Print cage label"}
                        </button>
                      </p>
                    ) : null}
                    <ul className="cage-map-animal-list">
                      {cage.animals.map((animal) => (
                        <li key={animal.id}>
                          {onSelectAnimal ? (
                            <button
                              type="button"
                              className="link-button"
                              onClick={() => onSelectAnimal(animal.id)}
                            >
                              {animal.animal_number ?? `#${animal.id}`}
                            </button>
                          ) : (
                            <span>{animal.animal_number ?? `#${animal.id}`}</span>
                          )}
                          <span className="muted-text"> · {animal.status}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
