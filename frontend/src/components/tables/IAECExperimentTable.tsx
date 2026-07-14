import type { AnimalExperiment } from "../../api/types";
import { DataTable } from "./DataTable";

interface IAECExperimentTableProps {
  experiments: AnimalExperiment[];
}

export function IAECExperimentTable({ experiments }: IAECExperimentTableProps) {
  return (
    <DataTable
      rows={experiments}
      emptyText="No IAEC experiments found."
      columns={[
        { header: "ID", cell: (row) => row.id },
        { header: "Group ID", cell: (row) => row.group_id },
        { header: "Description", cell: (row) => row.description },
      ]}
    />
  );
}
