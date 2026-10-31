import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, Pencil, Plus } from "lucide-react";
import { PageHeader, LoadingState, EmptyState, ErrorBanner } from "../../components/common/UI";
import { Modal } from "../../components/common/Modal";
import { addDiscount, getDiscounts, updateDiscount } from "../../api/endpoints";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import type { DiscountDetail } from "../../types";
import {
  CABIN_LABELS,
  EMPTY_RULE,
  IntField,
  OptionSelect,
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
import { PrefillNotice } from "./PrefillNotice";
import { useRowDragToAdd } from "./useRowDragToAdd";

export const DISCOUNT_VIEW_ID = "discountm";

interface FormState extends RuleForm {
  DiscountAmount: string;
  IsConvenienceFee: boolean;
  ConvenienceFee: string;
}

const EMPTY_FORM: FormState = {
  ...EMPTY_RULE,
  DiscountAmount: "",
  IsConvenienceFee: false, // default False
  ConvenienceFee: "",
};

const toForm = (d: DiscountDetail): FormState => ({
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
  DiscountAmount: String(d.DiscountAmount ?? ""),
  IsConvenienceFee: !!d.IsConvenienceFee,
  ConvenienceFee: String(d.ConvenienceFee ?? ""),
});

function validate(f: FormState): Errors {
  const e = validateRule(f);
  if (!isWholeNumber(f.DiscountAmount)) e.DiscountAmount = "Enter a whole number.";
  if (f.IsConvenienceFee && !isWholeNumber(f.ConvenienceFee)) e.ConvenienceFee = "Enter a whole number.";
  return e;
}

export default function DiscountMaster() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission(DISCOUNT_VIEW_ID, "W");
  const { showToast } = useToast();

  const [items, setItems] = useState<DiscountDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState("");

  const [modal, setModal] = useState<{ mode: ModalMode; item: DiscountDetail | null } | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getDiscounts(signal);
      if (signal?.aborted) return;
      if (res.ErrorCode) {
        setError(res.Message || "Failed to load discounts.");
        return;
      }
      setItems(res.DiscountDetails ?? []);
    } catch (err) {
      if (isCanceled(err)) return;
      setError("Failed to load discounts. Please try again.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort();
  }, [loadData]);

  function openModal(mode: ModalMode, item: DiscountDetail | null = null) {
    setErrors({});
    setFormError(null);
    setForm(item ? toForm(item) : EMPTY_FORM);
    setModal({ mode, item });
  }

  // Drag a row onto "Add Discount" -> add modal opens pre-filled with that row's values.
  const dnd = useRowDragToAdd<DiscountDetail>({
    enabled: canWrite,
    onDropRow: (row) => openModal("add", row),
  });

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
        DiscountAmount: Number(form.DiscountAmount),
        IsConvenienceFee: form.IsConvenienceFee,
        ConvenienceFee: form.IsConvenienceFee ? Number(form.ConvenienceFee) : 0,
        Cabin: form.Cabin,
        PaxType: form.PaxType,
      };
      const res =
        modal.mode === "add"
          ? await addDiscount(body)
          : await updateDiscount({ Id: modal.item!.Id, ...body });
      if (res.ErrorCode) {
        setFormError(res.Message || "Could not save discount.");
        return;
      }
      showToast("success", res.Message || (modal.mode === "add" ? "Discount added." : "Discount updated."));
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
  const titleNoun = "Discount";

  return (
    <div>
      <PageHeader
        title="Discount Master"
        description="Discount and convenience-fee rules by airline, route, fare range, cabin and passenger type."
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
          <button
            className={`btn-primary ml-auto ${dnd.addButtonClass}`}
            onClick={() => openModal("add")}
            {...dnd.addTargetProps}
          >
            <Plus size={16} /> Add Discount
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
          <EmptyState label="No discounts found." />
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
                  <th className="px-5 py-3 font-medium text-right">Discount</th>
                  <th className="px-5 py-3 font-medium text-right">Conv. Fee</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((i) => (
                  <tr
                    key={i.Id}
                    className={`border-b border-[var(--color-border-soft)] last:border-0 hover:bg-[var(--color-surface-2)]/50 transition-colors ${dnd.rowClass(i.Id)}`}
                    {...dnd.rowProps(i, i.Id)}
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
                    <td className="px-5 py-3 text-right">{i.DiscountAmount}</td>
                    <td className="px-5 py-3 text-right">{i.IsConvenienceFee ? i.ConvenienceFee : "—"}</td>
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
          {canWrite && " · Tip: drag a row onto the Add button to create a copy."}
        </p>
      )}

      <Modal
        size="xl"
        title={mode === "add" ? `Add ${titleNoun}` : mode === "edit" ? `Edit ${titleNoun}` : `${titleNoun} Details`}
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
                {submitting ? "Saving..." : mode === "add" ? `Add ${titleNoun}` : "Save Changes"}
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
            <ReadOnlyRow label="Discount Amount" value={modal.item.DiscountAmount} />
            <ReadOnlyRow label="Convenience Fee Applied" value={modal.item.IsConvenienceFee ? "True" : "False"} />
            <ReadOnlyRow label="Convenience Fee" value={modal.item.IsConvenienceFee ? modal.item.ConvenienceFee : "—"} />
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="flex flex-col gap-4"
          >
            {mode === "add" && modal?.item && <PrefillNotice source={`discount #${modal.item.Id}`} />}
            {formError && <ErrorBanner message={formError} />}
           <RuleFields form={form} errors={errors} onChange={patch} idPrefix="disc" productClassAfterCabin />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <IntField
                id="disc-amount"
                label="Discount Amount"
                value={form.DiscountAmount}
                error={errors.DiscountAmount}
                onChange={(v) => patch({ DiscountAmount: v })}
              />
              <OptionSelect
                id="disc-isconv"
                label="Is Convenience Fee"
                value={String(form.IsConvenienceFee)}
                options={[
                  { value: "true", label: "True" },
                  { value: "false", label: "False" },
                ]}
                onChange={(v) => patch({ IsConvenienceFee: v === "true", ConvenienceFee: v === "true" ? form.ConvenienceFee : "" })}
              />
              <IntField
                id="disc-conv"
                label="Convenience Fee"
                value={form.ConvenienceFee}
                disabled={!form.IsConvenienceFee}
                error={errors.ConvenienceFee}
                onChange={(v) => patch({ ConvenienceFee: v })}
              />
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}