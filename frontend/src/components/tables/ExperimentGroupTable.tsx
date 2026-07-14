import type { ExperimentGroup } from "../../api/types";
import { DataTable } from "./DataTable";

interface ExperimentGroupTableProps {
  groups: ExperimentGroup[];
}

export function ExperimentGroupTable({ groups }: ExperimentGroupTableProps) {
  return (
    <DataTable
      rows={groups}
      emptyText="No experiment groups found."
      columns={[
        { header: "ID", cell: (row) => row.id },
        { header: "Name", cell: (row) => row.name },
        { header: "Project ID", cell: (row) => row.project_id },
        { header: "Experiments", cell: (row) => row.experiments.length },
      ]}
    />
  );
}
