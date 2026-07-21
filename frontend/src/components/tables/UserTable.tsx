import type { User } from "../../api/types";
import { DataTable, type TableColumn } from "./DataTable";

const columns: TableColumn<User>[] = [
  {
    header: "ID",
    cell: (user) => user.id,
  },
  {
    header: "Name",
    cell: (user) => user.name ?? "-",
  },
  {
    header: "Email",
    cell: (user) => user.email,
  },
  {
    header: "Roles",
    cell: (user) => user.roles.join(", "),
  },
  {
    header: "Status",
    cell: (user) => (user.status ? "Active" : "Inactive"),
  },
];

interface UserTableProps {
  users: User[];
}

export function UserTable({ users }: UserTableProps) {
  return <DataTable columns={columns} rows={users} emptyText="No users found." />;
}