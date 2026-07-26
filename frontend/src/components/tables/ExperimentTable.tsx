import type { Experiment } from "../../api/types";
import { formatDisplayDate } from "../../utils/dateFormat";

interface ExperimentTableProps {
  experiment: Experiment | null;
}

export function ExperimentTable({ experiment }: ExperimentTableProps) {
  if (!experiment) {
    return <p className="empty-text">No experiment loaded yet.</p>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Protocol</th>
            <th>Allocation</th>
            <th>Performed By</th>
            <th>Date</th>
            <th>Animals</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{experiment.id}</td>
            <td>{experiment.protocol_id}</td>
            <td>{experiment.allocation_id}</td>
            <td>{experiment.performed_by}</td>
            <td>{formatDisplayDate(experiment.date)}</td>
            <td>{experiment.animals.map((a) => a.animal_id).join(", ")}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
