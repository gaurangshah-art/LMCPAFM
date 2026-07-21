import { useState } from "react";
import type { AnimalExperiment, AnimalExperimentCreate } from "../../api/types";
import { IAECAnimalExperimentForm } from "../forms/IAECAnimalExperimentForm";
import { DataTable } from "./DataTable";

interface IAECExperimentTableProps {
  experiments: AnimalExperiment[];
  onEdit: (id: number, values: AnimalExperimentCreate) => void;
  onDelete: (id: number) => void;
}

export function IAECExperimentTable({
  experiments,
  onEdit,
  onDelete,
}: IAECExperimentTableProps) {
  const [editingId, setEditingId] = useState<number | null>(null);

  return (
    <>
      <DataTable
        rows={experiments}
        emptyText="No IAEC experiments found."
        columns={[
          { header: "ID", cell: (row) => row.id },
          { header: "Group ID", cell: (row) => row.group_id },
          { header: "Description", cell: (row) => row.description },

          {
            header: "Actions",
            cell: (row) => (
              <div className="actions">
                <button
                  className="btn-small"
                  onClick={() => setEditingId(row.id)}
                >
                  Edit
                </button>

                <button
                  className="btn-small danger"
                  onClick={() => onDelete(row.id)}
                >
                  Delete
                </button>
              </div>
            ),
          },
        ]}
      />

      {/* Inline Edit Form */}
      {editingId !== null && (
        <div className="inline-edit-form">
          <IAECAnimalExperimentForm
            initialValues={experiments.find((e) => e.id === editingId)}
            submitLabel="Update Experiment"
            onSubmit={(values) => {
              onEdit(editingId, values);
              setEditingId(null);
            }}
          />
        </div>
      )}
    </>
  );
}
