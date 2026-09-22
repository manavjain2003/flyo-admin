import { useEffect, useState } from "react";
import { Plus, Search, Pencil } from "lucide-react";
import {
  PageHeader,
  LoadingState,
  EmptyState,
  ErrorBanner,
  StatusBadge,
} from "../../components/common/UI";
import { Modal } from "../../components/common/Modal";
import { FormField } from "../../components/common/FormField";
import { getRoles, addRole, updateRole } from "../../api/endpoints";
import { useToast } from "../../context/ToastContext";
import type { RoleDetail } from "../../types";

export default function Roles() {
  const [roles, setRoles] = useState<RoleDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editRole, setEditRole] = useState<RoleDetail | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [roleName, setRoleName] = useState("");
  const [roleActive, setRoleActive] = useState(true);

  const { showToast } = useToast();

  async function loadData(signal?: AbortSignal) {
    setLoading(true);
    setError(null);
    try {
      const res = await getRoles(signal);
      if (signal?.aborted) return;
      setRoles(res.RoleDetails ?? []);
    } catch (err: unknown) {
      const isCanceled =
        (err as { name?: string; code?: string })?.name === "CanceledError" ||
        (err as { name?: string; code?: string })?.code === "ERR_CANCELED";
      if (isCanceled) return;
      setError("Failed to load roles. Please try again.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort();
  }, []);

  const filtered = roles.filter((r) =>
    r.RoleName.toLowerCase().includes(search.toLowerCase())
  );

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!roleName.trim()) {
      setFormError("Role name is required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await addRole({ RoleName: roleName.trim() });
      if (res.ErrorCode) {
        setFormError(res.Message || "Could not add role.");
        return;
      }
      showToast("success", res.Message || "Role added successfully.");
      setIsAddOpen(false);
      setRoleName("");
      loadData(); // manual refresh — no signal
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editRole) return;
    setFormError(null);
    if (!roleName.trim()) {
      setFormError("Role name is required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await updateRole({
        RoleId: editRole.RoleId,
        RoleName: roleName.trim(),
        IsActive: roleActive,
      });
      if (res.ErrorCode) {
        setFormError(res.Message || "Could not update role.");
        return;
      }
      showToast("success", res.Message || "Role updated successfully.");
      setEditRole(null);
      loadData(); // manual refresh — no signal
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function openEdit(role: RoleDetail) {
    setEditRole(role);
    setRoleName(role.RoleName);
    setRoleActive(role.IsActive ?? true);
    setFormError(null);
  }

  return (
    <div>
      <PageHeader
        title="Roles"
        description="Manage your roles, synced with the Role API."
        action={
          <button
            className="btn-primary"
            onClick={() => {
              setRoleName("");
              setFormError(null);
              setIsAddOpen(true);
            }}
          >
            <Plus size={16} /> Add New Role
          </button>
        }
      />

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
          />
          <input
            className="input-base pl-9"
            placeholder="Search roles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card-base overflow-hidden">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <div className="p-5">
            <ErrorBanner message={error} />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState label="No roles found." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border-soft)] text-left text-[var(--color-text-muted)] text-xs uppercase tracking-wider">
                  <th className="px-5 py-3 font-medium">ID</th>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.RoleId}
                    className="border-b border-[var(--color-border-soft)] last:border-0 hover:bg-[var(--color-surface-2)]/50 transition-colors"
                  >
                    <td className="px-5 py-3 text-[var(--color-text-muted)]">{r.RoleId}</td>
                    <td className="px-5 py-3 font-medium">{r.RoleName}</td>
                    <td className="px-5 py-3">
                      <StatusBadge active={r.IsActive ?? true} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <button className="btn-icon" onClick={() => openEdit(r)}>
                          <Pencil size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Role modal */}
      <Modal
        title="Add New Role"
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setIsAddOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleAdd} disabled={submitting}>
              {submitting ? "Adding..." : "Add Role"}
            </button>
          </>
        }
      >
        <form onSubmit={handleAdd} className="flex flex-col gap-4">
          {formError && <ErrorBanner message={formError} />}
          <FormField
            id="role-name"
            label="Role Name"
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
            autoFocus
          />
        </form>
      </Modal>

      {/* Edit Role modal */}
      <Modal
        title="Edit Role"
        isOpen={!!editRole}
        onClose={() => setEditRole(null)}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setEditRole(null)}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleUpdate} disabled={submitting}>
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </>
        }
      >
        <form onSubmit={handleUpdate} className="flex flex-col gap-4">
          {formError && <ErrorBanner message={formError} />}
          <FormField
            id="edit-role-name"
            label="Role Name"
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
            autoFocus
          />
          <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
            <input
              type="checkbox"
              checked={roleActive}
              onChange={(e) => setRoleActive(e.target.checked)}
              className="accent-[var(--color-brand)]"
            />
            Active
          </label>
        </form>
      </Modal>
    </div>
  );
}