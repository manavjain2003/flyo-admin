import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, Pencil, Plus } from "lucide-react";
import { PageHeader, LoadingState, EmptyState, ErrorBanner, StatusBadge } from "../../components/common/UI";
import { Modal } from "../../components/common/Modal";
import { FormField } from "../../components/common/FormField";
import { addFareRule, getFareRules, updateFareRule } from "../../api/endpoints";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import { useAirlines, useCountries } from "../../config/useMaster";
import { CABIN_OPTIONS, SECTOR_OPTIONS, WILDCARD } from "../../config/configValidation";
import type { FareRuleDetail } from "../../types";
import {
  CABIN_LABELS,
  IntField,
  OptionSelect,
  ReadOnlyRow,
  SECTOR_LABELS,
  isCanceled,
  isWholeNumber,
  type Errors,
  type ModalMode,
} from "./masterShared";

export const FARERULE_VIEW_ID = "farerulem";

const FARE_TYPE_OPTIONS = [
  { value: "Refundable", label: "Refundable" },
  { value: "Partial Refundable", label: "Partial Refundable" },
];
const REGION_OPTIONS = [{ value: "Ex-India", label: "Ex-India" }];
const UNIT_OPTIONS = [
  { value: "H", label: "Hour (H)" },
  { value: "D", label: "Day (D)" },
];
const UNIT_LABELS: Record<string, string> = { H: "Hour(s)", D: "Day(s)" };

interface FormState {
  AirlineCode: string;
  SectorType: string;
  ClassCode: string;
  FareType: string;
  Region: string;
  OriginCountryCode: string;
  DestinationCountryCode: string;
  BookingStartDate: string;
  BookingEndDate: string;
  TravelStartDate: string;
  TravelEndDate: string;
  DurationStart: string;
  DurationStartUnit: string;
  DurationEnd: string;
  DurationEndUnit: string;
  CancellationRule: string;
  ChangeRule: string;
  NoShowRule: string;
}

const EMPTY_FORM: FormState = {
  AirlineCode: WILDCARD,
  SectorType: "D",
  ClassCode: "E",
  FareType: WILDCARD,
  Region: WILDCARD,
  OriginCountryCode: "",
  DestinationCountryCode: "",
  BookingStartDate: "",
  BookingEndDate: "",
  TravelStartDate: "",
  TravelEndDate: "",
  DurationStart: "0",
  DurationStartUnit: "H",
  DurationEnd: "",
  DurationEndUnit: "D",
  CancellationRule: "",
  ChangeRule: "",
  NoShowRule: "",
};

const day = (v?: string) => (v ?? "").slice(0, 10); // "2026-10-22T00:00:00" -> "2026-10-22"

const toForm = (d: FareRuleDetail): FormState => ({
  AirlineCode: d.AirlineCode,
  SectorType: d.SectorType,
  ClassCode: d.ClassCode,
  FareType: d.FareType,
  Region: d.Region,
  OriginCountryCode: d.OriginCountryCode,
  DestinationCountryCode: d.DestinationCountryCode,
  BookingStartDate: day(d.BookingStartDate),
  BookingEndDate: day(d.BookingEndDate),
  TravelStartDate: day(d.TravelStartDate),
  TravelEndDate: day(d.TravelEndDate),
  DurationStart: String(d.DurationStart ?? ""),
  DurationStartUnit: d.DurationStartUnit,
  DurationEnd: String(d.DurationEnd ?? ""),
  DurationEndUnit: d.DurationEndUnit,
  CancellationRule: d.CancellationRule ?? "",
  ChangeRule: d.ChangeRule ?? "",
  NoShowRule: d.NoShowRule ?? "",
});

function validate(f: FormState): Errors {
  const e: Errors = {};
  if (!f.AirlineCode) e.AirlineCode = "Select an airline (or All).";
  if (!f.SectorType) e.SectorType = "Select a sector type.";
  if (!f.ClassCode) e.ClassCode = "Select a class.";
  if (!f.FareType) e.FareType = "Select a fare type (or All).";
  if (!f.Region) e.Region = "Select a region (or All).";
  if (!f.OriginCountryCode) e.OriginCountryCode = "Select an origin country.";
  if (!f.DestinationCountryCode) e.DestinationCountryCode = "Select a destination country.";

  if (!f.BookingStartDate) e.BookingStartDate = "Required.";
  if (!f.BookingEndDate) e.BookingEndDate = "Required.";
  if (!e.BookingStartDate && !e.BookingEndDate && f.BookingEndDate < f.BookingStartDate) {
    e.BookingEndDate = "Must be on or after booking start.";
  }
  if (!f.TravelStartDate) e.TravelStartDate = "Required.";
  if (!f.TravelEndDate) e.TravelEndDate = "Required.";
  if (!e.TravelStartDate && !e.TravelEndDate && f.TravelEndDate < f.TravelStartDate) {
    e.TravelEndDate = "Must be on or after travel start.";
  }

  if (!isWholeNumber(f.DurationStart)) e.DurationStart = "Enter a positive whole number.";
  if (!isWholeNumber(f.DurationEnd)) e.DurationEnd = "Enter a positive whole number.";
  if (!f.DurationStartUnit) e.DurationStartUnit = "Select a unit.";
  if (!f.DurationEndUnit) e.DurationEndUnit = "Select a unit.";

  if (!f.CancellationRule.trim()) e.CancellationRule = "Required.";
  if (!f.ChangeRule.trim()) e.ChangeRule = "Required.";
  if (!f.NoShowRule.trim()) e.NoShowRule = "Required.";
  return e;
}

export default function FareRuleMaster() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission(FARERULE_VIEW_ID, "W");
  const { showToast } = useToast();

  const [items, setItems] = useState<FareRuleDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState("");

  const [modal, setModal] = useState<{ mode: ModalMode; item: FareRuleDetail | null } | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const airlines = useAirlines();
  const countries = useCountries();

  const loadData = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getFareRules(signal);
      if (signal?.aborted) return;
      if (res.ErrorCode) {
        setError(res.Message || "Failed to load fare rules.");
        return;
      }
      setItems(res.FareRuleDetails ?? []);
    } catch (err) {
      if (isCanceled(err)) return;
      setError("Failed to load fare rules. Please try again.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort();
  }, [loadData]);

  function openModal(mode: ModalMode, item: FareRuleDetail | null = null) {
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
        AirlineCode: form.AirlineCode,
        SectorType: form.SectorType,
        ClassCode: form.ClassCode,
        FareType: form.FareType,
        Region: form.Region,
        OriginCountryCode: form.OriginCountryCode,
        DestinationCountryCode: form.DestinationCountryCode,
        BookingStartDate: form.BookingStartDate,
        BookingEndDate: form.BookingEndDate,
        TravelStartDate: form.TravelStartDate,
        TravelEndDate: form.TravelEndDate,
        DurationStart: Number(form.DurationStart),
        DurationStartUnit: form.DurationStartUnit,
        DurationEnd: Number(form.DurationEnd),
        DurationEndUnit: form.DurationEndUnit,
        CancellationRule: form.CancellationRule.trim(),
        ChangeRule: form.ChangeRule.trim(),
        NoShowRule: form.NoShowRule.trim(),
      };
      const res =
        modal.mode === "add" ? await addFareRule(body) : await updateFareRule({ Id: modal.item!.Id, ...body });
      if (res.ErrorCode) {
        setFormError(res.Message || "Could not save fare rule.");
        return;
      }
      showToast("success", res.Message || (modal.mode === "add" ? "Fare rule added." : "Fare rule updated."));
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
      if (!q) return true;
      return [i.AirlineCode, i.OriginCountryCode, i.DestinationCountryCode, i.FareType, i.Region].some((v) =>
        String(v ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, search, sector]);

  const mode = modal?.mode;
  const countryOptions = countries.options ?? [];

  return (
    <div>
      <PageHeader
        title="Farerule Master"
        description="Cancellation, change and no-show rules by airline, class, country and validity window."
      />

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input
          className="input-base max-w-xs"
          placeholder="Search airline, country, fare type..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input-base" style={{ width: "auto" }} value={sector} onChange={(e) => setSector(e.target.value)}>
          <option value="">All sectors</option>
          <option value="D">Domestic</option>
          <option value="I">International</option>
        </select>
        {canWrite && (
          <button className="btn-primary ml-auto" onClick={() => openModal("add")}>
            <Plus size={16} /> Add Fare Rule
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
          <EmptyState label="No fare rules found." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border-soft)] text-left text-[var(--color-text-muted)] text-xs uppercase tracking-wider">
                  <th className="px-5 py-3 font-medium">ID</th>
                  <th className="px-5 py-3 font-medium">Airline</th>
                  <th className="px-5 py-3 font-medium">Sector</th>
                  <th className="px-5 py-3 font-medium">Class</th>
                  <th className="px-5 py-3 font-medium">Fare Type</th>
                  <th className="px-5 py-3 font-medium">Region</th>
                  <th className="px-5 py-3 font-medium">Countries</th>
                  <th className="px-5 py-3 font-medium">Booking Window</th>
                  <th className="px-5 py-3 font-medium">Travel Window</th>
                  <th className="px-5 py-3 font-medium">Duration</th>
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
                    <td className="px-5 py-3 font-medium">{i.AirlineCode}</td>
                    <td className="px-5 py-3">{SECTOR_LABELS[i.SectorType] ?? i.SectorType}</td>
                    <td className="px-5 py-3">{CABIN_LABELS[i.ClassCode] ?? i.ClassCode}</td>
                    <td className="px-5 py-3">{i.FareType}</td>
                    <td className="px-5 py-3">{i.Region}</td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      {i.OriginCountryCode} → {i.DestinationCountryCode}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      {day(i.BookingStartDate)} – {day(i.BookingEndDate)}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      {day(i.TravelStartDate)} – {day(i.TravelEndDate)}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      {i.DurationStart}
                      {i.DurationStartUnit} – {i.DurationEnd}
                      {i.DurationEndUnit}
                    </td>
                    <td className="px-5 py-3">
                      {typeof i.IsActive === "boolean" ? <StatusBadge active={i.IsActive} /> : "—"}
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
        title={mode === "add" ? "Add Fare Rule" : mode === "edit" ? "Edit Fare Rule" : "Fare Rule Details"}
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
                {submitting ? "Saving..." : mode === "add" ? "Add Fare Rule" : "Save Changes"}
              </button>
            </>
          )
        }
      >
        {mode === "view" && modal?.item ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <ReadOnlyRow label="ID" value={modal.item.Id} />
            <ReadOnlyRow label="Airline" value={modal.item.AirlineCode} />
            <ReadOnlyRow label="Sector" value={SECTOR_LABELS[modal.item.SectorType] ?? modal.item.SectorType} />
            <ReadOnlyRow label="Class" value={CABIN_LABELS[modal.item.ClassCode] ?? modal.item.ClassCode} />
            <ReadOnlyRow label="Fare Type" value={modal.item.FareType} />
            <ReadOnlyRow label="Region" value={modal.item.Region} />
            <ReadOnlyRow label="Origin Country" value={modal.item.OriginCountryCode} />
            <ReadOnlyRow label="Destination Country" value={modal.item.DestinationCountryCode} />
            <ReadOnlyRow
              label="Status"
              value={typeof modal.item.IsActive === "boolean" ? <StatusBadge active={modal.item.IsActive} /> : "—"}
            />
            <ReadOnlyRow label="Booking Start" value={day(modal.item.BookingStartDate)} />
            <ReadOnlyRow label="Booking End" value={day(modal.item.BookingEndDate)} />
            <ReadOnlyRow label="Created" value={day(modal.item.CreatedDate) || "—"} />
            <ReadOnlyRow label="Travel Start" value={day(modal.item.TravelStartDate)} />
            <ReadOnlyRow label="Travel End" value={day(modal.item.TravelEndDate)} />
            <div />
            <ReadOnlyRow
              label="Duration Start"
              value={`${modal.item.DurationStart} ${UNIT_LABELS[modal.item.DurationStartUnit] ?? modal.item.DurationStartUnit}`}
            />
            <ReadOnlyRow
              label="Duration End"
              value={`${modal.item.DurationEnd} ${UNIT_LABELS[modal.item.DurationEndUnit] ?? modal.item.DurationEndUnit}`}
            />
            <div />
            <ReadOnlyRow label="Cancellation Rule" value={modal.item.CancellationRule} />
            <ReadOnlyRow label="Change Rule" value={modal.item.ChangeRule} />
            <ReadOnlyRow label="No-Show Rule" value={modal.item.NoShowRule} />
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
                id="fr-airline"
                label="Airline"
                withAll
                value={form.AirlineCode}
                options={airlines.options ?? []}
                error={errors.AirlineCode}
                onChange={(v) => patch({ AirlineCode: v })}
              />
              <OptionSelect
                id="fr-sector"
                label="Sector Type"
                value={form.SectorType}
                options={SECTOR_OPTIONS}
                error={errors.SectorType}
                onChange={(v) => patch({ SectorType: v })}
              />
              <OptionSelect
                id="fr-class"
                label="Class"
                value={form.ClassCode}
                options={CABIN_OPTIONS}
                error={errors.ClassCode}
                onChange={(v) => patch({ ClassCode: v })}
              />
              <OptionSelect
                id="fr-faretype"
                label="Fare Type"
                withAll
                value={form.FareType}
                options={FARE_TYPE_OPTIONS}
                error={errors.FareType}
                onChange={(v) => patch({ FareType: v })}
              />
              <OptionSelect
                id="fr-region"
                label="Region"
                withAll
                value={form.Region}
                options={REGION_OPTIONS}
                error={errors.Region}
                onChange={(v) => patch({ Region: v })}
              />
              <div />
              <OptionSelect
                id="fr-origin"
                label="Origin Country"
                placeholder="Select country"
                value={form.OriginCountryCode}
                options={countryOptions}
                error={errors.OriginCountryCode}
                onChange={(v) => patch({ OriginCountryCode: v })}
              />
              <OptionSelect
                id="fr-dest"
                label="Destination Country"
                placeholder="Select country"
                value={form.DestinationCountryCode}
                options={countryOptions}
                error={errors.DestinationCountryCode}
                onChange={(v) => patch({ DestinationCountryCode: v })}
              />
              <FormField
                id="fr-bs"
                type="date"
                label="Booking Start Date"
                value={form.BookingStartDate}
                error={errors.BookingStartDate}
                onChange={(e) => patch({ BookingStartDate: e.target.value })}
              />
              <FormField
                id="fr-be"
                type="date"
                label="Booking End Date"
                value={form.BookingEndDate}
                min={form.BookingStartDate || undefined}
                error={errors.BookingEndDate}
                onChange={(e) => patch({ BookingEndDate: e.target.value })}
              />
              <FormField
                id="fr-ts"
                type="date"
                label="Travel Start Date"
                value={form.TravelStartDate}
                error={errors.TravelStartDate}
                onChange={(e) => patch({ TravelStartDate: e.target.value })}
              />
              <FormField
                id="fr-te"
                type="date"
                label="Travel End Date"
                value={form.TravelEndDate}
                min={form.TravelStartDate || undefined}
                error={errors.TravelEndDate}
                onChange={(e) => patch({ TravelEndDate: e.target.value })}
              />
              <IntField
                id="fr-ds"
                label="Duration Start"
                value={form.DurationStart}
                error={errors.DurationStart}
                onChange={(v) => patch({ DurationStart: v })}
              />
              <OptionSelect
                id="fr-dsu"
                label="Duration Start Unit"
                value={form.DurationStartUnit}
                options={UNIT_OPTIONS}
                error={errors.DurationStartUnit}
                onChange={(v) => patch({ DurationStartUnit: v })}
              />
              <IntField
                id="fr-de"
                label="Duration End"
                value={form.DurationEnd}
                error={errors.DurationEnd}
                onChange={(v) => patch({ DurationEnd: v })}
              />
              <OptionSelect
                id="fr-deu"
                label="Duration End Unit"
                value={form.DurationEndUnit}
                options={UNIT_OPTIONS}
                error={errors.DurationEndUnit}
                onChange={(v) => patch({ DurationEndUnit: v })}
              />
            </div>
            <FormField
              id="fr-cancel"
              label="Cancellation Rule"
              value={form.CancellationRule}
              error={errors.CancellationRule}
              onChange={(e) => patch({ CancellationRule: e.target.value })}
            />
            <FormField
              id="fr-change"
              label="Change Rule"
              value={form.ChangeRule}
              error={errors.ChangeRule}
              onChange={(e) => patch({ ChangeRule: e.target.value })}
            />
            <FormField
              id="fr-noshow"
              label="No-Show Rule"
              value={form.NoShowRule}
              error={errors.NoShowRule}
              onChange={(e) => patch({ NoShowRule: e.target.value })}
            />
          </form>
        )}
      </Modal>
    </div>
  );
}
