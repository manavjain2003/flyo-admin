import { useEffect, useState } from "react";
import { Plus, Search, Eye, Pencil } from "lucide-react";
import {
  PageHeader,
  LoadingState,
  EmptyState,
  ErrorBanner,
  StatusBadge,
} from "../../components/common/UI";
import { Modal } from "../../components/common/Modal";
import { FormField, SelectField } from "../../components/common/FormField";
import { getUsers, addUser, getRoles } from "../../api/endpoints";
import { useToast } from "../../context/ToastContext";
import type { RoleDetail, UserDetail } from "../../types";

export default function Admins() {
  const [users, setUsers] = useState<UserDetail[]>([]);
  const [roles, setRoles] = useState<RoleDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewUser, setViewUser] = useState<UserDetail | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [form, setForm] = useState({
    Title: "Mr.",
    Name: "",
    Email: "",
    Phone: "",
    RoleId: "",
    IsActive: true,
  });

  const { showToast } = useToast();

  async function loadData(signal?: AbortSignal) {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        getUsers(signal),
        getRoles(signal),
      ]);
      if (signal?.aborted) return;
      setUsers(usersRes.UserDetails ?? []);
      setRoles(rolesRes.RoleDetails ?? []);
    } catch (err: unknown) {
      const isCanceled =
        (err as { name?: string; code?: string })?.name === "CanceledError" ||
        (err as { name?: string; code?: string })?.code === "ERR_CANCELED";
      if (isCanceled) return;
      setError("Failed to load admins. Please try again.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort();
  }, []);

  const filtered = users.filter(
    (u) =>
      u.Name.toLowerCase().includes(search.toLowerCase()) ||
      u.Email.toLowerCase().includes(search.toLowerCase())
  );

  function resetForm() {
    setForm({ Title: "Mr.", Name: "", Email: "", Phone: "", RoleId: "", IsActive: true });
    setFormError(null);
  }

  async function handleAddAdmin(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!form.Name.trim() || !form.Email.trim() || !/^\d{10}$/.test(form.Phone) || !form.RoleId) {
      setFormError("Please fill in all fields correctly.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await addUser({
        Title: form.Title,
        Name: form.Name,
        Email: form.Email,
        Phone: form.Phone,
        RoleId: Number(form.RoleId),
        IsActive: form.IsActive,
      });
      if (res.ErrorCode) {
        setFormError(res.Message || "Could not add admin.");
        return;
      }
      showToast("success", res.Message || "Admin added successfully.");
      setIsModalOpen(false);
      resetForm();
      loadData(); // manual refresh — no signal needed
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Admins"
        description="Manage your admins, synced with the User API."
        action={
          <button
            className="btn-primary"
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
          >
            <Plus size={16} /> Add New Admin
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
            placeholder="Search admins..."
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
          <EmptyState label="No admins found." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border-soft)] text-left text-[var(--color-text-muted)] text-xs uppercase tracking-wider">
                  <th className="px-5 py-3 font-medium">ID</th>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr
                    key={u.StaffId}
                    className="border-b border-[var(--color-border-soft)] last:border-0 hover:bg-[var(--color-surface-2)]/50 transition-colors"
                  >
                    <td className="px-5 py-3 text-[var(--color-text-muted)]">{u.StaffId}</td>
                    <td className="px-5 py-3 font-medium">{u.Name}</td>
                    <td className="px-5 py-3 text-[var(--color-text-secondary)]">{u.Email}</td>
                    <td className="px-5 py-3 text-[var(--color-text-secondary)]">{u.RoleName}</td>
                    <td className="px-5 py-3">
                      <StatusBadge active={u.IsActive} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <button className="btn-icon" onClick={() => setViewUser(u)}>
                          <Eye size={15} />
                        </button>
                        <button className="btn-icon">
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

      {/* Add Admin modal */}
      <Modal
        title="Add New Admin"
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleAddAdmin} disabled={submitting}>
              {submitting ? "Adding..." : "Add Admin"}
            </button>
          </>
        }
      >
        <form onSubmit={handleAddAdmin} className="flex flex-col gap-4">
          {formError && <ErrorBanner message={formError} />}
          <div className="grid grid-cols-3 gap-3">
            <SelectField
              id="add-title"
              label="Title"
              value={form.Title}
              onChange={(e) => setForm({ ...form, Title: e.target.value })}
            >
              <option value="Mr.">Mr.</option>
              <option value="Mrs.">Mrs.</option>
              <option value="Ms.">Ms.</option>
            </SelectField>
            <div className="col-span-2">
              <FormField
                id="add-name"
                label="Full Name"
                value={form.Name}
                onChange={(e) => setForm({ ...form, Name: e.target.value })}
              />
            </div>
          </div>
          <FormField
            id="add-email"
            label="Email"
            type="email"
            value={form.Email}
            onChange={(e) => setForm({ ...form, Email: e.target.value })}
          />
          <FormField
            id="add-phone"
            label="Mobile Number"
            inputMode="numeric"
            maxLength={10}
            value={form.Phone}
            onChange={(e) => setForm({ ...form, Phone: e.target.value.replace(/\D/g, "") })}
          />
          <SelectField
            id="add-role"
            label="Role"
            value={form.RoleId}
            onChange={(e) => setForm({ ...form, RoleId: e.target.value })}
          >
            <option value="">Select a role</option>
            {roles.map((r) => (
              <option key={r.RoleId} value={r.RoleId}>
                {r.RoleName}
              </option>
            ))}
          </SelectField>
          <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
            <input
              type="checkbox"
              checked={form.IsActive}
              onChange={(e) => setForm({ ...form, IsActive: e.target.checked })}
              className="accent-[var(--color-brand)]"
            />
            Active
          </label>
        </form>
      </Modal>

      {/* View Admin modal */}
      <Modal
        title="Admin Details"
        isOpen={!!viewUser}
        onClose={() => setViewUser(null)}
      >
        {viewUser && (
          <div className="flex flex-col gap-3 text-sm">
            <Row label="Name" value={viewUser.Name} />
            <Row label="Title" value={viewUser.Title} />
            <Row label="Email" value={viewUser.Email} />
            <Row label="Phone" value={viewUser.Phone} />
            <Row label="Role" value={viewUser.RoleName} />
            <Row label="Status" value={viewUser.IsActive ? "Active" : "Inactive"} />
          </div>
        )}
      </Modal>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-[var(--color-border-soft)] pb-2">
      <span className="text-[var(--color-text-muted)]">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}