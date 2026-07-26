import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createUser, listUsers } from "../api/userApi";
import { getApiErrorMessage } from "../api/errors";
import type { User, UserCreate, UserRole } from "../api/types";
import { ErrorAlert } from "../components/common/ErrorAlert";
import { LoadingState } from "../components/common/LoadingState";
import { PageSection } from "../components/common/PageSection";
import { SuccessNote } from "../components/common/SuccessNote";
import { UserTable } from "../components/tables/UserTable";
import { useSubmitState } from "../hooks/useSubmitState";

const availableRoles = ["investigator", "iaec", "staff"] as const;
type AssignableRole = (typeof availableRoles)[number];

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  status: z.boolean(),
  roles: z.array(z.enum(availableRoles)).min(1, "Select at least one role."),
});

type FormValues = z.infer<typeof schema>;

interface UsersPageProps {
  currentUser: User | null;
}

export function UsersPage({ currentUser }: UsersPageProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      status: true,
      roles: ["investigator"],
    },
  });
  const { isSubmitting, errorMessage, successMessage, start, fail, succeed } = useSubmitState();
  const selectedRoles = watch("roles");

  useEffect(() => {
    void loadUsers();
  }, []);

  async function loadUsers() {
    try {
      setIsLoading(true);
      setLoadError(null);
      const data = await listUsers();
      setUsers(data);
    } catch (error) {
      setLoadError(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  function toggleRole(role: AssignableRole, checked: boolean) {
    const nextRoles = checked
      ? Array.from(new Set([...selectedRoles, role]))
      : selectedRoles.filter((value) => value !== role);

    setValue("roles", nextRoles, { shouldValidate: true });
  }

  const onSubmit = handleSubmit(async (values) => {
    start();

    try {
      const payload: UserCreate = {
        name: values.name,
        email: values.email,
        password: values.password,
        role: values.roles[0],
        roles: [...values.roles],
      };
      const created = await createUser(payload);
      setUsers((prev) => [created, ...prev]);
      succeed(`Created user ${created.email}.`);
      reset({
        name: "",
        email: "",
        password: "",
        status: true,
        roles: ["investigator"],
      });
    } catch (error) {
      fail(getApiErrorMessage(error));
    }
  });

  return (
    <div className="page-grid">
      <PageSection title="Create User" subtitle="POST /users/">
        <form className="form-grid" onSubmit={onSubmit}>
          <label>
            Name
            <input {...register("name")} />
            {errors.name ? <small className="field-error">{errors.name.message}</small> : null}
          </label>
          <label>
            Email
            <input type="email" {...register("email")} />
            {errors.email ? <small className="field-error">{errors.email.message}</small> : null}
          </label>
          <label>
            Password
            <input type="password" {...register("password")} />
            {errors.password ? <small className="field-error">{errors.password.message}</small> : null}
          </label>
          <label className="toggle-field">
            <span>Active</span>
            <input type="checkbox" {...register("status")} />
          </label>
          <div className="full-width">
            <span className="checkbox-group-label">Roles</span>
            <div className="checkbox-grid">
              {availableRoles.map((role) => (
                <label key={role} className="checkbox-card">
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(role)}
                    onChange={(event) => toggleRole(role, event.target.checked)}
                  />
                  <span>{role}</span>
                </label>
              ))}
            </div>
            {errors.roles ? <small className="field-error">{errors.roles.message}</small> : null}
          </div>
          <button className="btn" type="submit" disabled={isSubmitting}>
            Create User
          </button>
          {errorMessage ? <ErrorAlert message={errorMessage} /> : null}
          {successMessage ? <SuccessNote message={successMessage} /> : null}
        </form>
      </PageSection>

      <PageSection title="User Directory" subtitle="GET /users/">
        <div className="user-directory-header">
          <div className="info-card compact-info-card">
            <strong>Current Session</strong>
            <p>{currentUser?.email ?? "Guest session"}</p>
            <p>{currentUser?.roles.join(", ") ?? "Create an account or log in."}</p>
          </div>
          <button type="button" className="btn btn-secondary" onClick={() => void loadUsers()}>
            Refresh Users
          </button>
        </div>
        {isLoading ? <LoadingState label="Loading users..." /> : null}
        {loadError ? <ErrorAlert message={loadError} /> : null}
        {!isLoading && !loadError ? <UserTable users={users} /> : null}
      </PageSection>
    </div>
  );
}