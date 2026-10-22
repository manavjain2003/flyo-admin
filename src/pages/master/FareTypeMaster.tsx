import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, Pencil, Plus } from "lucide-react";
import {
  PageHeader,
  LoadingState,
  EmptyState,
  ErrorBanner,
  StatusBadge,
} from "../../components/common/UI";
import { Modal } from "../../components/common/Modal";
import { FormField, SelectField } from "../../components/common/FormField";
import { addFareType, getFareTypes, updateFareType } from "../../api/endpoints";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import { useAirlines } from "../../config/useMaster";
import { CABIN_OPTIONS, CHANNEL_OPTIONS, SECTOR_OPTIONS } from "../../config/configValidation";
import type { FareTypeDetail } from "../../types";

const SECTOR_LABELS: Record<string, string> = { D: "Domestic", I: "International" };
const CABIN_LABELS: Record<string, string> = {
  E: "Economy",
  PE: "Premium Economy",
  B: "Business",
  F: "First",
};

type StatusFilter = "all" | "active" | "inactive";
type ModalMode = "view" | "add" | "edit";

interface FormState {
  ProductCode: string;
  AirlineCode: string;
  ProviderCode: string;
  SectorType: string;
  CabinCode: string;
  IsActive: boolean;
}

const EMPTY_FORM: FormState = {
  ProductCode: "",
  AirlineCode: "",
  ProviderCode: CHANNEL_OPTIONS[0].value,
  SectorType: "",
  CabinCode: "",
  IsActive: true,
};

function ReadOnlyRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-[var(--color-text-secondary)]">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

export default function FareTypeMaster() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission("faretypem", "W");
  const { showToast } = useToast();
  const airlines = useAirlines();

  const [modal, setModal] = useState<{ mode: ModalMode; item: FareTypeDetail | null } | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [items, setItems] = useState<FareTypeDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState("");
  const [cabin, setCabin] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const loadData = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getFareTypes(signal);
      if (signal?.aborted) return;
      if (res.ErrorCode) {
        setError(res.Message || "Failed to load fare types.");
        return;
      }
      setItems(res.ProductClassDetails ?? []);
    } catch (err) {
      const e = err as { name?: string; code?: string };
      if (e?.name === "CanceledError" || e?.code === "ERR_CANCELED") return;
      setError("Failed to load fare types. Please try again.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort();
  }, [loadData]);

  function openModal(mode: ModalMode, item: FareTypeDetail | null = null) {
    setFormError(null);
    setForm(
      item
        ? {
            ProductCode: item.ProductCode,
            AirlineCode: item.AirlineCode,
            ProviderCode: item.ProviderCode,
            SectorType: item.SectorType,
            CabinCode: item.CabinCode,
            IsActive: item.IsActive,
          }
        : EMPTY_FORM
    );
    setModal({ mode, item });
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!modal || modal.mode === "view") return;
    const missing =
      !form.ProductCode.trim() ? "Fare Type is required."
      : !form.AirlineCode ? "Airline is required."
      : !form.ProviderCode ? "Provider is required."
      : !form.SectorType ? "Sector type is required."
      : !form.CabinCode ? "Cabin is required."
      : null;
    if (missing) {
      setFormError(missing);
      return;
    }
    setFormError(null);
    setSubmitting(true);
    try {
      const base = {
        ProductCode: form.ProductCode.trim(),
        AirlineCode: form.AirlineCode,
        ProviderCode: form.ProviderCode,
        SectorType: form.SectorType,
        CabinCode: form.CabinCode,
      };
      const res =
        modal.mode === "add"
          ? await addFareType(base)
          : await updateFareType({ ProductId: modal.item!.ProductId, ...base, IsActive: form.IsActive });
      if (res.ErrorCode) {
        setFormError(res.Message || "Could not save fare type.");
        return;
      }
      showToast("success", res.Message || (modal.mode === "add" ? "Fare type added." : "Fare type updated."));
      setModal(null);
      loadData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (sector && i.SectorType !== sector) return false;
      if (cabin && i.CabinCode !== cabin) return false;
      if (status === "active" && !i.IsActive) return false;
      if (status === "inactive" && i.IsActive) return false;
      if (!q) return true;
      return (
        i.ProductCode.toLowerCase().includes(q) ||
        i.AirlineCode.toLowerCase().includes(q) ||
        i.ProviderCode.toLowerCase().includes(q)
      );
    });
  }, [items, search, sector, cabin, status]);

  return (
    <div>
      <PageHeader
        title="FareType Master"
        description="Fare types (product classes) available per airline, sector and cabin."
      />

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input
          className="input-base max-w-xs"
          placeholder="Search product, airline or provider..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex flex-row flex-nowrap items-center gap-3">
          <select className="input-base" style={{ width: "auto" }} value={sector} onChange={(e) => setSector(e.target.value)}>
            <option value="">All sectors</option>
            <option value="D">Domestic</option>
            <option value="I">International</option>
          </select>
          <select className="input-base" style={{ width: "auto" }} value={cabin} onChange={(e) => setCabin(e.target.value)}>
            <option value="">All cabins</option>
            {Object.entries(CABIN_LABELS).map(([code, label]) => (
              <option key={code} value={code}>{label}</option>
            ))}
          </select>
          <select
            className="input-base" style={{ width: "auto" }}
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        {canWrite && (
          <button className="btn-primary ml-auto" onClick={() => openModal("add")}>
            <Plus size={16} /> Add Fare Type
          </button>
        )}
      </div>

      <div className="card-base overflow-hidden">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <div className="p-5">
            <ErrorBanner message={error} />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState label="No fare types found." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border-soft)] text-left text-[var(--color-text-muted)] text-xs uppercase tracking-wider">
                  <th className="px-5 py-3 font-medium">ID</th>
                  <th className="px-5 py-3 font-medium">Fare Type</th>
                  <th className="px-5 py-3 font-medium">Airline</th>
                  <th className="px-5 py-3 font-medium">Provider</th>
                  <th className="px-5 py-3 font-medium">Sector</th>
                  <th className="px-5 py-3 font-medium">Cabin</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((i) => (
                  <tr
                    key={i.ProductId}
                    className="border-b border-[var(--color-border-soft)] last:border-0 hover:bg-[var(--color-surface-2)]/50 transition-colors"
                  >
                    <td className="px-5 py-3 text-[var(--color-text-muted)]">{i.ProductId}</td>
                    <td className="px-5 py-3 font-medium">{i.ProductCode}</td>
                    <td className="px-5 py-3">{i.AirlineCode}</td>
                    <td className="px-5 py-3">{i.ProviderCode}</td>
                    <td className="px-5 py-3">{SECTOR_LABELS[i.SectorType] ?? i.SectorType}</td>
                    <td className="px-5 py-3">{CABIN_LABELS[i.CabinCode] ?? i.CabinCode}</td>
                    <td className="px-5 py-3">
                      <StatusBadge active={i.IsActive} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <button className="btn-icon" title="View" onClick={() => openModal("view", i)}>
                          <Eye size={15} />
                        </button>
                        {canWrite && (
                          <button className="btn-icon" title="Edit" onClick={() => openModal("edit", i)}>
                            <Pencil size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {!loading && !error && (
        <p className="mt-3 text-xs text-[var(--color-text-muted)]">
          Showing {filtered.length} of {items.length}
        </p>
      )}

      <Modal
        title={
          modal?.mode === "add" ? "Add Fare Type" : modal?.mode === "edit" ? "Edit Fare Type" : "Fare Type Details"
        }
        isOpen={!!modal}
        onClose={() => setModal(null)}
        footer={
          modal?.mode === "view" ? (
            <button className="btn-secondary" onClick={() => setModal(null)}>Close</button>
          ) : (
            <>
              <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn-primary" onClick={() => handleSubmit()} disabled={submitting}>
                {submitting ? "Saving..." : modal?.mode === "add" ? "Add Fare Type" : "Save Changes"}
              </button>
            </>
          )
        }
      >
        {modal?.mode === "view" && modal.item ? (
          <div className="grid grid-cols-2 gap-4">
            <ReadOnlyRow label="ID" value={modal.item.ProductId} />
            <ReadOnlyRow label="Fare Type" value={modal.item.ProductCode} />
            <ReadOnlyRow label="Airline" value={modal.item.AirlineCode} />
            <ReadOnlyRow label="Provider" value={modal.item.ProviderCode} />
            <ReadOnlyRow label="Sector" value={SECTOR_LABELS[modal.item.SectorType] ?? modal.item.SectorType} />
            <ReadOnlyRow label="Cabin" value={CABIN_LABELS[modal.item.CabinCode] ?? modal.item.CabinCode} />
            <ReadOnlyRow label="Status" value={<StatusBadge active={modal.item.IsActive} />} />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {formError && <ErrorBanner message={formError} />}
            <FormField
              id="ft-code"
              label="Fare Type"
              value={form.ProductCode}
              onChange={(e) => setForm({ ...form, ProductCode: e.target.value })}
              autoFocus
            />
            <SelectField
              id="ft-airline"
              label="Airline"
              value={form.AirlineCode}
              onChange={(e) => setForm({ ...form, AirlineCode: e.target.value })}
            >
              <option value="">Select airline</option>
              {(airlines.options ?? []).map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </SelectField>
            <SelectField
              id="ft-provider"
              label="Provider"
              value={form.ProviderCode}
              onChange={(e) => setForm({ ...form, ProviderCode: e.target.value })}
            >
              {CHANNEL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </SelectField>
            <SelectField
              id="ft-sector"
              label="Sector Type"
              value={form.SectorType}
              onChange={(e) => setForm({ ...form, SectorType: e.target.value })}
            >
              <option value="">Select sector</option>
              {SECTOR_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </SelectField>
            <SelectField
              id="ft-cabin"
              label="Cabin"
              value={form.CabinCode}
              onChange={(e) => setForm({ ...form, CabinCode: e.target.value })}
            >
              <option value="">Select cabin</option>
              {CABIN_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </SelectField>
            {modal?.mode === "edit" && (
              <SelectField
                id="ft-active"
                label="Is Active"
                value={form.IsActive ? "true" : "false"}
                onChange={(e) => setForm({ ...form, IsActive: e.target.value === "true" })}
              >
                <option value="true">True</option>
                <option value="false">False</option>
              </SelectField>
            )}
          </form>
        )}
      </Modal>
    </div>
  );
}