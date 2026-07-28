import type { ExperimentGroup, ExperimentGroupAssignmentSummary } from "../../api/types";
import { DataTable } from "./DataTable";

interface ExperimentGroupTableProps {
  groups: ExperimentGroup[];
  assignments?: ExperimentGroupAssignmentSummary[];
}

export function ExperimentGroupTable({ groups, assignments = [] }: ExperimentGroupTableProps) {
  const assignmentByGroupId = new Map(assignments.map((row) => [row.group_id, row]));

  return (
    <DataTable
      rows={groups}
      emptyText="No experiment groups found."
      columns={[
        { header: "ID", cell: (row) => row.id },
        { header: "Name", cell: (row) => row.name },
        { header: "Planned Animals", cell: (row) => row.planned_animal_count },
        {
          header: "Assigned",
          cell: (row) => {
            const summary = assignmentByGroupId.get(row.id);
            return summary ? `${summary.assigned_count}/${row.planned_animal_count}` : "0";
          },
        },
        { header: "Project ID", cell: (row) => row.project_id },
        { header: "Experiments", cell: (row) => row.experiments?.length ?? 0 },
      ]}
    />
  );
}
