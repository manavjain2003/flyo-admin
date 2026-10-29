import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, Pencil, Plus } from "lucide-react";
import { PageHeader, LoadingState, EmptyState, ErrorBanner } from "../../components/common/UI";
import { Modal } from "../../components/common/Modal";
import { addMarkup, getMarkups, updateMarkup } from "../../api/endpoints";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import type { MarkupDetail } from "../../types";
import {
  CABIN_LABELS,
  EMPTY_RULE,
  IntField,
  PaxBadges,
  ReadOnlyRow,
  RuleFields,
  SEARCH_TYPE_LABELS,
  SECTOR_LABELS,
  isCanceled,
  isWholeNumber,
  validateRule,
  type Errors,
  type ModalMode,
  type RuleForm,
  showAll,
} from "./masterShared";

// NOTE: the profile payload you shared has no markup view yet. "markupm" follows the
// existing naming (discountm / farerulem / faretypem) — change it here if the backend uses another id.
export const MARKUP_VIEW_ID = "markupm";

interface FormState extends RuleForm {
  MarkupAmount: string;
}

const EMPTY_FORM: FormState = { ...EMPTY_RULE, MarkupAmount: "" };

const toForm = (d: MarkupDetail): FormState => ({
  ChannelCode: d.ChannelCode,
  AirlineCode: d.AirlineCode,
  Source: d.Source,
  Destination: d.Destination,
  ProductClass: d.ProductClass,
  RangeStart: String(d.RangeStart ?? ""),
  RangeEnd: String(d.RangeEnd ?? ""),
  SectorType: d.SectorType,
  SearchType: d.SearchType,
  Cabin: d.Cabin,
  PaxType: d.PaxType ?? [],
  MarkupAmount: String(d.MarkupAmount ?? ""),
});

function validate(f: FormState): Errors {
  const e = validateRule(f);
  if (!isWholeNumber(f.MarkupAmount)) e.MarkupAmount = "Enter a whole number.";
  return e;
}

export default function MarkupMaster() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission(MARKUP_VIEW_ID, "W");
  const { showToast } = useToast();

  const [items, setItems] = useState<MarkupDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState("");

  const [modal, setModal] = useState<{ mode: ModalMode; item: MarkupDetail | null } | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMarkups(signal);
      if (signal?.aborted) return;
      if (res.ErrorCode) {
        setError(res.Message || "Failed to load markups.");
        return;
      }
      setItems(res.MarkupDetails ?? []);
    } catch (err) {
      if (isCanceled(err)) return;
      setError("Failed to load markups. Please try again.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort();
  }, [loadData]);

  function openModal(mode: ModalMode, item: MarkupDetail | null = null) {
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
        ProductClass: form.ProductClass,
        RangeStart: Number(form.RangeStart),
        RangeEnd: Number(form.RangeEnd),
        SectorType: form.SectorType,
        SearchType: form.SearchType,
        MarkupAmount: Number(form.MarkupAmount),
        Cabin: form.Cabin,
        PaxType: form.PaxType,
      };
      const res =
        modal.mode === "add" ? await addMarkup(body) : await updateMarkup({ Id: modal.item!.Id, ...body });
      if (res.ErrorCode) {
        setFormError(res.Message || "Could not save markup.");
        return;
      }
      showToast("success", res.Message || (modal.mode === "add" ? "Markup added." : "Markup updated."));
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
      return [i.AirlineCode, i.Source, i.Destination, i.ProductClass, i.ChannelCode].some((v) =>
        String(v ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, search, sector]);

  const mode = modal?.mode;

  return (
    <div>
      <PageHeader
        title="MarkUp Master"
        description="Markup rules by airline, route, fare range, cabin and passenger type."
      />

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input
          className="input-base max-w-xs"
          placeholder="Search airline, route, product class..."
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
            <Plus size={16} /> Add Markup
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
          <EmptyState label="No markups found." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border-soft)] text-left text-[var(--color-text-muted)] text-xs uppercase tracking-wider">
                  <th className="px-5 py-3 font-medium">ID</th>
                  <th className="px-5 py-3 font-medium">Channel</th>
                  <th className="px-5 py-3 font-medium">Airline</th>
                  <th className="px-5 py-3 font-medium">Route</th>
                  <th className="px-5 py-3 font-medium">Product Class</th>
                  <th className="px-5 py-3 font-medium">Range</th>
                  <th className="px-5 py-3 font-medium">Sector</th>
                  <th className="px-5 py-3 font-medium">Search</th>
                  <th className="px-5 py-3 font-medium">Cabin</th>
                  <th className="px-5 py-3 font-medium">Pax</th>
                  <th className="px-5 py-3 font-medium text-right">Markup</th>
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
                    <td className="px-5 py-3">{showAll(i.ProductClass)}</td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      {i.RangeStart} – {i.RangeEnd}
                    </td>
                    <td className="px-5 py-3">{SECTOR_LABELS[i.SectorType] ?? i.SectorType}</td>
                    <td className="px-5 py-3">{SEARCH_TYPE_LABELS[i.SearchType] ?? i.SearchType}</td>
                    <td className="px-5 py-3">{showAll(CABIN_LABELS[i.Cabin] ?? i.Cabin)}</td>
                    <td className="px-5 py-3">
                      <PaxBadges pax={i.PaxType} />
                    </td>
                    <td className="px-5 py-3 text-right">{i.MarkupAmount}</td>
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
        title={mode === "add" ? "Add Markup" : mode === "edit" ? "Edit Markup" : "Markup Details"}
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
                {submitting ? "Saving..." : mode === "add" ? "Add Markup" : "Save Changes"}
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
            <ReadOnlyRow label="Product Class" value={showAll(modal.item.ProductClass)} />
            <ReadOnlyRow label="Range Start" value={modal.item.RangeStart} />
            <ReadOnlyRow label="Range End" value={modal.item.RangeEnd} />
            <ReadOnlyRow label="Sector" value={SECTOR_LABELS[modal.item.SectorType] ?? modal.item.SectorType} />
            <ReadOnlyRow label="Search Type" value={SEARCH_TYPE_LABELS[modal.item.SearchType] ?? modal.item.SearchType} />
            <ReadOnlyRow label="Cabin" value={showAll(CABIN_LABELS[modal.item.Cabin] ?? modal.item.Cabin)} />
            <ReadOnlyRow label="Passenger Type" value={<PaxBadges pax={modal.item.PaxType} />} />
            <ReadOnlyRow label="Markup Amount" value={modal.item.MarkupAmount} />
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
            <RuleFields form={form} errors={errors} onChange={patch} idPrefix="mk" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <IntField
                id="mk-amount"
                label="Markup Amount"
                value={form.MarkupAmount}
                error={errors.MarkupAmount}
                onChange={(v) => patch({ MarkupAmount: v })}
              />
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}