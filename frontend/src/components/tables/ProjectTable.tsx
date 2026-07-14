import type { IAECProject } from "../../api/types";
import { DataTable } from "./DataTable";

interface ProjectTableProps {
  projects: IAECProject[];
}

export function ProjectTable({ projects }: ProjectTableProps) {
  return (
    <DataTable
      rows={projects}
      emptyText="No IAEC projects found."
      columns={[
        { header: "ID", cell: (row) => row.id },
        { header: "Title", cell: (row) => row.title },
        { header: "Investigator", cell: (row) => row.investigator_name },
        { header: "Protocol", cell: (row) => row.protocol_number ?? "-" },
        { header: "Status", cell: (row) => row.status ?? "-" },
      ]}
    />
  );
}
