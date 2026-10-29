import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, Pencil, Plus } from "lucide-react";
import { PageHeader, LoadingState, EmptyState, ErrorBanner, StatusBadge } from "../../components/common/UI";
import { FormField } from "../../components/common/FormField";
import { Modal } from "../../components/common/Modal";
import {
  addAmenity,
  getAmenities,
  updateAmenity,
  getProductClassRows,
  type ProductClassRow,
} from "../../api/endpoints";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import { useAirlines, useAirports } from "../../config/useMaster";
import { CHANNEL_OPTIONS, SECTOR_OPTIONS, WILDCARD } from "../../config/configValidation";
import type { AmenityDetail } from "../../types";
import { OptionSelect, ReadOnlyRow, SECTOR_LABELS, isCanceled, type Errors, type ModalMode, showAll } from "./masterShared";

export const AMENITY_VIEW_ID = "amenitym";

interface FormState {
  ChannelCode: string;
  AirlineCode: string;
  Source: string;
  Destination: string;
  SectorType: string;
  ProductClass: string;
  FlightNo: string;
  AmenityType: string;
  AmenityComment: string;
  IsActive: boolean;
}

const AMENITY_TYPE_OPTIONS = [
  { value: "Meal", label: "Meal" },
  { value: "Wifi", label: "Wifi" },
];

const matchesSector = (rowSector: string, selected: string) => {
  const s = (rowSector ?? "").trim().toUpperCase();
  return !s || s === WILDCARD || s.charAt(0) === selected;
};

const EMPTY_FORM: FormState = {
  ChannelCode: CHANNEL_OPTIONS[0].value,
  AirlineCode: "",
  Source: WILDCARD,
  Destination: WILDCARD,
  SectorType: "D",
  ProductClass: WILDCARD,
  FlightNo: WILDCARD,
  AmenityType: "",
  AmenityComment: "",
  IsActive: true,
};

const toForm = (d: AmenityDetail): FormState => ({
  ChannelCode: d.ChannelCode,
  AirlineCode: d.AirlineCode,
  Source: d.Source,
  Destination: d.Destination,
  SectorType: d.SectorType || "D",
  ProductClass: d.ProductClass,
  FlightNo: d.FlightNo,
  AmenityType: d.AmenityType,
  AmenityComment: d.AmenityComment,
  IsActive: d.IsActive,
});

function validate(f: FormState): Errors {
  const e: Errors = {};
  if (!f.ChannelCode) e.ChannelCode = "Select a channel.";
  if (!f.AirlineCode || f.AirlineCode === WILDCARD) e.AirlineCode = "Select an airline.";
  if (!f.Source) e.Source = "Select a source (or All).";
  if (!f.Destination) e.Destination = "Select a destination (or All).";
  if (f.Source !== WILDCARD && f.Source === f.Destination) {
    e.Destination = "Destination must be different from source.";
  }
  if (!f.SectorType) e.SectorType = "Select a sector type.";
  if (!f.ProductClass) e.ProductClass = "Select a Fare Type (or All).";
  if (!f.FlightNo.trim()) e.FlightNo = "Enter a flight number, or * for all.";
  if (!f.AmenityType.trim()) e.AmenityType = "Select the amenity type.";
  if (!f.AmenityComment.trim()) e.AmenityComment = "Enter a comment.";
  return e;
}

export default function AmenityMaster() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission(AMENITY_VIEW_ID, "W");
  const { showToast } = useToast();

  const airlines = useAirlines();
  const airports = useAirports();

  const [items, setItems] = useState<AmenityDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [modal, setModal] = useState<{ mode: ModalMode; item: AmenityDetail | null } | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [pcRows, setPcRows] = useState<ProductClassRow[]>([]);

  useEffect(() => {
    if (!form.AirlineCode) {
      setPcRows([]);
      return;
    }
    const controller = new AbortController();
    getProductClassRows(form.AirlineCode, controller.signal)
      .then((rows) => {
        if (!controller.signal.aborted) setPcRows(rows);
      })
      .catch(() => {
        if (!controller.signal.aborted) setPcRows([]);
      });
    return () => controller.abort();
  }, [form.AirlineCode]);

  const productClassOptions = useMemo(() => {
    const seen = new Set<string>();
    return pcRows
      .filter((r) => matchesSector(r.SectorType, form.SectorType))
      .filter((r) => !seen.has(r.ProductCode) && seen.add(r.ProductCode))
      .map((r) => ({ value: r.ProductCode, label: r.ProductCode }));
  }, [pcRows, form.SectorType]);

  const airlineOptions = useMemo(
    () => (airlines.options ?? []).filter((o) => o.value !== WILDCARD),
    [airlines.options]
  );

  const loadData = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAmenities(signal);
      if (signal?.aborted) return;
      if (res.ErrorCode) {
        setError(res.Message || "Failed to load amenities.");
        return;
      }
      setItems(res.AmenityDetails ?? []);
    } catch (err) {
      if (isCanceled(err)) return;
      setError("Failed to load amenities. Please try again.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort();
  }, [loadData]);

  function openModal(mode: ModalMode, item: AmenityDetail | null = null) {
    setErrors({});
    setFormError(null);
    setForm(item ? toForm(item) : EMPTY_FORM);
    setModal({ mode, item });
  }

  const patch = (p: Partial<FormState>) => setForm((f) => ({ ...f, ...p }));

  async function handleSubmit() {
    if (!modal || modal.mode === "view") return;
    const e = validate(form);
    setErrors(e);
    if (Object.keys(e).length) {
      setFormError("Please fix the highlighted fields.");
      return;
    }
    setFormError(null);
    setSubmitting(true);
    try {
      const body = {
        ChannelCode: form.ChannelCode,
        AirlineCode: form.AirlineCode,
        Source: form.Source,
        Destination: form.Destination,
        SectorType: form.SectorType,
        ProductClass: form.ProductClass,
        FlightNo: form.FlightNo.trim(),
        AmenityType: form.AmenityType.trim(),
        AmenityComment: form.AmenityComment.trim(),
      };

      const res =
        modal.mode === "add"
          ? await addAmenity(body)
          : await updateAmenity({
              Id: modal.item!.Id,
              IsActive: form.IsActive,
              ...body,
            });
      if (res.ErrorCode) {
        setFormError(res.Message || "Could not save amenity.");
        return;
      }
      showToast("success", res.Message || (modal.mode === "add" ? "Amenity added." : "Amenity updated."));
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
    if (!q) return items;
    return items.filter((i) =>
      [i.AirlineCode, i.Source, i.Destination, i.ProductClass, i.FlightNo, i.AmenityType, i.AmenityComment].some((v) =>
        String(v ?? "").toLowerCase().includes(q)
      )
    );
  }, [items, search]);

  const mode = modal?.mode;

  return (
    <div>
      <PageHeader
        title="Amenity Master"
        description="In-flight amenities (meal, wifi, etc.) by airline, route, fare type and flight number."
      />

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input
          className="input-base max-w-xs"
          placeholder="Search airline, route, amenity..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {canWrite && (
          <button className="btn-primary ml-auto" onClick={() => openModal("add")}>
            <Plus size={16} /> Add Amenity
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
          <EmptyState label="No amenities found." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border-soft)] text-left text-[var(--color-text-muted)] text-xs uppercase tracking-wider">
                  <th className="px-5 py-3 font-medium">ID</th>
                  <th className="px-5 py-3 font-medium">Channel</th>
                  <th className="px-5 py-3 font-medium">Airline</th>
                  <th className="px-5 py-3 font-medium">Route</th>
                  <th className="px-5 py-3 font-medium">Sector</th>
                  <th className="px-5 py-3 font-medium">Fare Type</th>
                  <th className="px-5 py-3 font-medium">Flight No</th>
                  <th className="px-5 py-3 font-medium">Amenity</th>
                  <th className="px-5 py-3 font-medium">Comment</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((i) => (
                  <tr
                    key={i.Id}
                    className="border-b border-[var(--color-border-soft)] last:border-0 hover:bg-[var(--color-surface-2)]/50 transition-colors"
                  >
                    <td className="px-5 py-3 text-[var(--color-text-muted)]">{i.Id}</td>
                    <td className="px-5 py-3">{i.ChannelCode}</td>
                    <td className="px-5 py-3 font-medium">{showAll(i.AirlineCode)}</td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      {showAll(i.Source)} → {showAll(i.Destination)}
                    </td>
                    <td className="px-5 py-3">{i.SectorType ? SECTOR_LABELS[i.SectorType] ?? i.SectorType : "—"}</td>
                    <td className="px-5 py-3">{showAll(i.ProductClass)}</td>
                    <td className="px-5 py-3">{showAll(i.FlightNo)}</td>
                    <td className="px-5 py-3">{i.AmenityType}</td>
                    <td className="px-5 py-3 text-[var(--color-text-secondary)]">{i.AmenityComment}</td>
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
        size="xl"
        title={mode === "add" ? "Add Amenity" : mode === "edit" ? "Edit Amenity" : "Amenity Details"}
        isOpen={!!modal}
        onClose={() => setModal(null)}
        footer={
          mode === "view" ? (
            <button className="btn-secondary" onClick={() => setModal(null)}>
              Close
            </button>
          ) : (
            <>
              <button className="btn-secondary" onClick={() => setModal(null)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Saving..." : mode === "add" ? "Add Amenity" : "Save Changes"}
              </button>
            </>
          )
        }
      >
        {mode === "view" && modal?.item ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <ReadOnlyRow label="ID" value={modal.item.Id} />
            <ReadOnlyRow label="Channel" value={modal.item.ChannelCode} />
            <ReadOnlyRow label="Airline" value={showAll(modal.item.AirlineCode)} />
            <ReadOnlyRow label="Source" value={showAll(modal.item.Source)} />
            <ReadOnlyRow label="Destination" value={showAll(modal.item.Destination)} />
            <ReadOnlyRow label="Sector" value={modal.item.SectorType ? SECTOR_LABELS[modal.item.SectorType] ?? modal.item.SectorType : "—"} />
            <ReadOnlyRow label="Fare Type" value={showAll(modal.item.ProductClass)} />
            <ReadOnlyRow label="Flight No" value={showAll(modal.item.FlightNo)} />
            <ReadOnlyRow label="Amenity Type" value={modal.item.AmenityType} />
            <ReadOnlyRow label="Status" value={<StatusBadge active={modal.item.IsActive} />} />
            <div className="col-span-2 sm:col-span-3">
              <ReadOnlyRow label="Comment" value={modal.item.AmenityComment} />
            </div>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="flex flex-col gap-4"
          >
            {formError && <ErrorBanner message={formError} />}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <OptionSelect
                id="am-channel"
                label="Channel"
                value={form.ChannelCode}
                options={CHANNEL_OPTIONS}
                error={errors.ChannelCode}
                onChange={(v) => patch({ ChannelCode: v })}
              />
              <OptionSelect
                id="am-airline"
                label="Airline"
                placeholder="Select airline"
                value={form.AirlineCode}
                options={airlineOptions}
                error={errors.AirlineCode}
                onChange={(v) => patch({ AirlineCode: v, ProductClass: WILDCARD })}
              />
              <OptionSelect
                id="am-source"
                label="Source"
                withAll
                value={form.Source}
                options={airports.options ?? []}
                error={errors.Source}
                onChange={(v) => patch({ Source: v })}
              />
              <OptionSelect
                id="am-destination"
                label="Destination"
                withAll
                value={form.Destination}
                options={airports.options ?? []}
                error={errors.Destination}
                onChange={(v) => patch({ Destination: v })}
              />
              <OptionSelect
                id="am-sector"
                label="Sector Type"
                value={form.SectorType}
                options={SECTOR_OPTIONS}
                error={errors.SectorType}
                onChange={(v) => patch({ SectorType: v, ProductClass: WILDCARD })}
              />
              <OptionSelect
                id="am-pc"
                label="Fare Type"
                withAll
                value={form.ProductClass}
                options={productClassOptions}
                error={errors.ProductClass}
                onChange={(v) => patch({ ProductClass: v })}
              />
              <FormField
                id="am-flight"
                label="Flight No"
                placeholder="* for all flights"
                autoComplete="off"
                value={form.FlightNo}
                error={errors.FlightNo}
                onChange={(e) => patch({ FlightNo: e.target.value })}
              />
              <OptionSelect
                id="am-type"
                label="Amenity Type"
                placeholder="Select amenity type"
                value={form.AmenityType}
                options={AMENITY_TYPE_OPTIONS}
                error={errors.AmenityType}
                onChange={(v) => patch({ AmenityType: v })}
              />
              <FormField
                id="am-comment"
                label="Amenity Comment"
                placeholder="e.g. Free meal on-board"
                autoComplete="off"
                value={form.AmenityComment}
                error={errors.AmenityComment}
                onChange={(e) => patch({ AmenityComment: e.target.value })}
              />
              <OptionSelect
                id="am-active"
                label="Status"
                value={form.IsActive ? "true" : "false"}
                options={[
                  { value: "true", label: "Active" },
                  { value: "false", label: "Inactive" },
                ]}
                onChange={(v) => patch({ IsActive: v === "true" })}
              />
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}