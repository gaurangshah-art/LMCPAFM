import type { AnimalAllocation } from "../../api/types";
import { formatDisplayDate } from "../../utils/dateFormat";

interface AllocationTableProps {
  allocation: AnimalAllocation | null;
}

export function AllocationTable({ allocation }: AllocationTableProps) {
  if (!allocation) {
    return <p className="empty-text">No allocation loaded yet.</p>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Allocation ID</th>
            <th>Requisition ID</th>
            <th>Date</th>
            <th>Allocated By</th>
            <th>Remarks</th>
            <th>Items</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{allocation.id}</td>
            <td>{allocation.requisition_id}</td>
            <td>{formatDisplayDate(allocation.date)}</td>
            <td>{allocation.allocated_by}</td>
            <td>{allocation.remarks}</td>
            <td>
              {allocation.items.map((item) => (
                <div key={item.id}>
                  ReqItem {item.requisition_item_id}: allocated {item.allocated_count}, remaining {item.remaining_count}
                </div>
              ))}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
