import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import {
  PageHeader,
  LoadingState,
  EmptyState,
  ErrorBanner,
} from "../../components/common/UI";
import { SelectField } from "../../components/common/FormField";
import { getRoles, getViews, updateViewsPermission } from "../../api/endpoints";
import { useToast } from "../../context/ToastContext";
import type { RoleDetail, ViewDetail } from "../../types";

export default function Permissions() {
  const [roles, setRoles] = useState<RoleDetail[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [views, setViews] = useState<ViewDetail[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [loadingViews, setLoadingViews] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { showToast } = useToast();

  useEffect(() => {
    getRoles()
      .then((res) => {
        setRoles(res.RoleDetails ?? []);
        if (res.RoleDetails?.length) {
          setSelectedRoleId(String(res.RoleDetails[0].RoleId));
        }
      })
      .catch(() => setError("Failed to load roles."))
      .finally(() => setLoadingRoles(false));
  }, []);

  useEffect(() => {
    if (!selectedRoleId) return;
    setLoadingViews(true);
    setError(null);
    getViews(selectedRoleId)
      .then((res) => setViews(res.Views ?? []))
      .catch(() => setError("Failed to load permissions for this role."))
      .finally(() => setLoadingViews(false));
  }, [selectedRoleId]);

  function togglePermission(viewId: number, perm: "R" | "W") {
    setViews((prev) =>
      prev.map((v) => {
        if (v.Id !== viewId) return v;
        const has = v.Permission.includes(perm);
        return {
          ...v,
          Permission: has
            ? v.Permission.filter((p) => p !== perm)
            : [...v.Permission, perm],
        };
      })
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await updateViewsPermission({
        RoleId: selectedRoleId,
        Views: views.map((v) => ({
          Id: v.Id,
          ViewName: v.ViewName,
          Permission: v.Permission,
        })),
      });
      if (res.ErrorCode) {
        showToast("error", res.Message || "Could not update permissions.");
        return;
      }
      showToast("success", res.Message || "Permissions updated successfully.");
    } catch {
      showToast("error", "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Permissions"
        description="Manage read/write access per role, synced with the Views API."
        action={
          <button className="btn-primary" onClick={handleSave} disabled={saving || loadingViews}>
            <Save size={16} /> {saving ? "Saving..." : "Save Changes"}
          </button>
        }
      />

      <div className="mb-5 max-w-xs">
        <SelectField
          id="role-select"
          label="Role"
          value={selectedRoleId}
          onChange={(e) => setSelectedRoleId(e.target.value)}
          disabled={loadingRoles}
        >
          {roles.map((r) => (
            <option key={r.RoleId} value={r.RoleId}>
              {r.RoleName}
            </option>
          ))}
        </SelectField>
      </div>

      <div className="card-base overflow-hidden">
        {loadingViews ? (
          <LoadingState />
        ) : error ? (
          <div className="p-5">
            <ErrorBanner message={error} />
          </div>
        ) : views.length === 0 ? (
          <EmptyState label="No views found for this role." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border-soft)] text-left text-[var(--color-text-muted)] text-xs uppercase tracking-wider">
                  <th className="px-5 py-3 font-medium">View</th>
                  <th className="px-5 py-3 font-medium text-center">Read</th>
                  <th className="px-5 py-3 font-medium text-center">Write</th>
                </tr>
              </thead>
              <tbody>
                {views.map((v) => (
                  <tr
                    key={v.Id}
                    className="border-b border-[var(--color-border-soft)] last:border-0 hover:bg-[var(--color-surface-2)]/50 transition-colors"
                  >
                    <td className="px-5 py-3 font-medium">{v.ViewName}</td>
                    <td className="px-5 py-3 text-center">
                      <input
                        type="checkbox"
                        className="accent-[var(--color-brand)] w-4 h-4"
                        checked={v.Permission.includes("R")}
                        onChange={() => togglePermission(v.Id, "R")}
                      />
                    </td>
                    <td className="px-5 py-3 text-center">
                      <input
                        type="checkbox"
                        className="accent-[var(--color-brand)] w-4 h-4"
                        checked={v.Permission.includes("W")}
                        onChange={() => togglePermission(v.Id, "W")}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
