import type { AnimalRequisition } from "../../api/types";
import { formatDisplayDate } from "../../utils/dateFormat";

interface RequisitionTableProps {
  requisition: AnimalRequisition | null;
}

export function RequisitionTable({ requisition }: RequisitionTableProps) {
  if (!requisition) {
    return <p className="empty-text">No requisition loaded yet.</p>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Requisition ID</th>
            <th>Protocol ID</th>
            <th>Requester</th>
            <th>Date</th>
            <th>Purpose</th>
            <th>Items</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{requisition.id}</td>
            <td>{requisition.protocol_id}</td>
            <td>{requisition.requester_name}</td>
            <td>{formatDisplayDate(requisition.date)}</td>
            <td>{requisition.purpose}</td>
            <td>
              {requisition.items.map((item) => (
                <div key={item.id}>
                  Item {item.id}: species {item.species_id}, strain {item.strain_id}, requested {item.requested_count}
                </div>
              ))}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
