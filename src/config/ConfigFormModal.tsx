import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "../components/common/Modal";
import { FormField, SelectField } from "../components/common/FormField";
import { addConfig, updateConfig } from "../api/endpoints";
import { useToast } from "../context/ToastContext";
import type {
  ConfigAddRequest,
  ConfigItem,
  ConfigUpdateRequest,
  FareTypeConfig,
  HandBagConfig,
  ProductClassDisplayDetail,
} from "../types";
import {
  CABIN_OPTIONS,
  CHANNEL_OPTIONS,
  SECTOR_OPTIONS,
  WILDCARD,
  lookupsFor,
  normaliseDraft,
  validateDraft,
  type Draft,
  type Errors,
} from "./configValidation";
import { useAirlines, useAirports, useFareModes, useProductClasses, type MasterOption } from "./useMaster";

const newHandBag = (): HandBagConfig => ({
  Display_HandBag: true,
  IsSeparateNode_HandBag: false,
  Priority_HandBag: "MIN",
  FareDisplayMode: 1,
  ProductName: "",
  IsMarginLogic: false,
});

const newFareType = (): FareTypeConfig => ({
  Display_Fare: true,
  IsSeparateNode: false,
  ProductClass: [],
  Priority_Fare: "MIN",
  FareDisplayMode: 1,
  ProductName: "",
  IsMarginLogic: false,
});

const newDetail = (): ProductClassDisplayDetail => ({
  ProductClass: [],
  Priority: "MIN",
  FareDisplayMode: 1,
  SeparateNode: false,
  MarginProductClass: [],
  MarginRestrictedProductClass: [],
  MarginPriority: "",
  ProductName: "",
  ValidateRefundStatus: false,
  ValidateCheckBag: false,
  IsFixedProductClass: false,
  IsFixedMarginProductClass: false,
  IsMarginLogic: false,
});

function emptyDraft(): Draft {
  return {
    ChannelCode: "TJ",
    AirlineCode: WILDCARD,
    Cabin: WILDCARD,
    Source: WILDCARD,
    Destination: WILDCARD,
    SectorType: "D",
    HandBag_Config: null,
    Student_Config: null,
    SrCitizen_Config: null,
    Restricted_ProductClass_Display: [],
    Restricted_ProductClass_Margin: [],
    ProductClassDisplayDetails: [],
  };
}

function fromItem(item: ConfigItem): Draft {
  const c: ConfigItem = JSON.parse(JSON.stringify(item));
  return {
    ...c,
    HandBag_Config: c.HandBag_Config ?? null,
    Student_Config: c.Student_Config ?? null,
    SrCitizen_Config: c.SrCitizen_Config ?? null,
    Restricted_ProductClass_Display: c.Restricted_ProductClass_Display ?? [],
    Restricted_ProductClass_Margin: c.Restricted_ProductClass_Margin ?? [],
    ProductClassDisplayDetails: c.ProductClassDisplayDetails ?? [],
  };
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
      <input
        type="checkbox"
        className="accent-[var(--color-brand)] w-4 h-4"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

function BoolSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <SelectField label={label} value={String(value)} onChange={(e) => onChange(e.target.value === "true")}>
      <option value="true">True</option>
      <option value="false">False</option>
    </SelectField>
  );
}

function OptionSelect({
  id,
  label,
  value,
  options,
  onChange,
  error,
  withAll,
}: {
  id?: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  error?: string;
  withAll?: boolean;
}) {
  const all = withAll ? [{ value: WILDCARD, label: "All (*)" }, ...options] : options;
  const list = value && !all.some((o) => o.value === value) ? [...all, { value, label: value }] : all;
  return (
    <SelectField
      id={id}
      label={label}
      value={value}
      error={error}
      aria-invalid={error ? true : undefined}
      onChange={(e) => onChange(e.target.value)}
    >
      {list.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </SelectField>
  );
}

function ListInput({
  label,
  value,
  onChange,
  error,
  hint,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  error?: string;
  hint?: string | null;
}) {
  const [text, setText] = useState(value.join(", "));
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-[var(--color-text-secondary)]">{label}</label>
      <input
        className="input-base"
        placeholder="Comma separated, e.g. STUDENT, SENIOR_CITIZEN"
        value={text}
        aria-invalid={error ? true : undefined}
        onChange={(e) => {
          setText(e.target.value);
          onChange(e.target.value.split(",").map((s) => s.trim()).filter(Boolean));
        }}
      />
      {hint && <span className="text-xs text-[var(--color-text-muted)]">{hint}</span>}
      {error && <span className="text-xs text-[var(--color-danger)]">{error}</span>}
    </div>
  );
}

function ProductClassPicker({
  label,
  value,
  onChange,
  error,
  master,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  error?: string;
  master: MasterBundle;
}) {
  const options = master.productClasses;
  if (!options || options.length === 0) {
    return <ListInput label={label} value={value} onChange={onChange} error={error} hint={master.productClassHint} />;
  }

  const known = new Set(options.map((o) => o.value.toUpperCase()));
  const extras = value.filter((v) => !known.has(v.toUpperCase()));
  const toggle = (v: string, on: boolean) =>
    onChange(on ? [...value, v] : value.filter((x) => x.toUpperCase() !== v.toUpperCase()));

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-[var(--color-text-secondary)]">{label}</span>
      <div
        tabIndex={-1}
        aria-invalid={error ? true : undefined}
        className={`rounded-md border p-2 max-h-36 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 ${
          error ? "border-[var(--color-danger)]" : "border-[var(--color-border)]"
        }`}
      >
        {options.map((o) => (
          <Check
            key={o.value}
            label={o.label}
            checked={value.some((v) => v.toUpperCase() === o.value.toUpperCase())}
            onChange={(on) => toggle(o.value, on)}
          />
        ))}
        {extras.map((v) => (
          <Check key={v} label={`${v} (not in list)`} checked onChange={(on) => toggle(v, on)} />
        ))}
      </div>
      {error && <span className="text-xs text-[var(--color-danger)]">{error}</span>}
    </div>
  );
}

function FareModeField({
  value,
  onChange,
  error,
  master,
}: {
  value: number;
  onChange: (v: number) => void;
  error?: string;
  master: MasterBundle;
}) {
  const options = master.fareModes;
  if (!options || options.length === 0) {
    return (
      <FormField
        label="Fare Display Mode"
        type="number"
        min={0}
        step={1}
        value={Number.isFinite(value) ? value : 0}
        error={error}
        aria-invalid={error ? true : undefined}
        onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
      />
    );
  }
  return (
    <OptionSelect
      label="Fare Display Mode"
      value={String(value)}
      options={options}
      error={error}
      onChange={(v) => onChange(Number(v))}
    />
  );
}

function PrioritySelect({
  label = "Priority",
  value,
  options,
  onChange,
  error,
  optional,
}: {
  label?: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  error?: string;
  optional?: boolean;
}) {
  return (
    <SelectField
      label={label}
      value={value}
      error={error}
      aria-invalid={error ? true : undefined}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{optional ? "Select priority" : "Select priority"}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </SelectField>
  );
}

function Section({
  title,
  enabled,
  onToggle,
  children,
  action,
}: {
  title: string;
  enabled?: boolean;
  onToggle?: (v: boolean) => void;
  children?: ReactNode;
  action?: ReactNode;
}) {
  const optional = onToggle !== undefined;
  return (
    <div className="rounded-lg border border-[var(--color-border-soft)] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">{title}</p>
        {optional ? <Check label="Include" checked={!!enabled} onChange={onToggle!} /> : action}
      </div>
      {(!optional || enabled) && children && <div className="mt-4">{children}</div>}
    </div>
  );
}


const grid = "grid grid-cols-1 sm:grid-cols-2 gap-4";
const grid3 = "grid grid-cols-1 sm:grid-cols-3 gap-4";

interface MasterBundle {
  fareModes: MasterOption[] | null;
  productClasses: MasterOption[] | null;
  productClassHint: string | null;
}

interface FieldsProps<T> {
  value: T;
  onChange: (v: T) => void;
  err: (key: string) => string | undefined;
  priorities: string[];
  master: MasterBundle;
  resetKey: string;
}

function HandBagFields({ value, onChange, err, priorities, master }: FieldsProps<HandBagConfig>) {
  const set = <K extends keyof HandBagConfig>(k: K, v: HandBagConfig[K]) => onChange({ ...value, [k]: v });
  return (
    <div className="space-y-4">
      <div className={grid}>
        <FormField
          label="Product Name"
          value={value.ProductName}
          error={err("ProductName")}
          aria-invalid={err("ProductName") ? true : undefined}
          onChange={(e) => set("ProductName", e.target.value)}
        />
        <PrioritySelect
          value={value.Priority_HandBag}
          options={priorities}
          error={err("Priority")}
          onChange={(v) => set("Priority_HandBag", v)}
        />
        <FareModeField
          value={value.FareDisplayMode}
          error={err("FareDisplayMode")}
          master={master}
          onChange={(v) => set("FareDisplayMode", v)}
        />
      </div>
      <div className={grid3}>
        <BoolSelect label="Display Hand Bag" value={value.Display_HandBag} onChange={(v) => set("Display_HandBag", v)} />
        <BoolSelect label="Separate Node" value={value.IsSeparateNode_HandBag} onChange={(v) => set("IsSeparateNode_HandBag", v)} />
        <BoolSelect label="Margin Logic" value={value.IsMarginLogic} onChange={(v) => set("IsMarginLogic", v)} />
      </div>
    </div>
  );
}

function FareTypeFields({ value, onChange, err, priorities, master, resetKey }: FieldsProps<FareTypeConfig>) {
  const set = <K extends keyof FareTypeConfig>(k: K, v: FareTypeConfig[K]) => onChange({ ...value, [k]: v });
  return (
    <div className="space-y-4">
      <div className={grid}>
        <FormField
          label="Product Name"
          value={value.ProductName}
          error={err("ProductName")}
          aria-invalid={err("ProductName") ? true : undefined}
          onChange={(e) => set("ProductName", e.target.value)}
        />
        <PrioritySelect
          value={value.Priority_Fare}
          options={priorities}
          error={err("Priority")}
          onChange={(v) => set("Priority_Fare", v)}
        />
        <FareModeField
          value={value.FareDisplayMode}
          error={err("FareDisplayMode")}
          master={master}
          onChange={(v) => set("FareDisplayMode", v)}
        />
        <ProductClassPicker
          key={`${resetKey}|${master.productClasses ? "list" : "text"}`}
          label="Product Class"
          value={value.ProductClass}
          error={err("ProductClass")}
          master={master}
          onChange={(v) => set("ProductClass", v)}
        />
      </div>
      <div className={grid3}>
        <BoolSelect label="Display Fare" value={value.Display_Fare} onChange={(v) => set("Display_Fare", v)} />
        <BoolSelect label="Separate Node" value={value.IsSeparateNode} onChange={(v) => set("IsSeparateNode", v)} />
        <BoolSelect label="Margin Logic" value={value.IsMarginLogic} onChange={(v) => set("IsMarginLogic", v)} />
      </div>
    </div>
  );
}

function DetailFields({
  value,
  onChange,
  err,
  priorities,
  master,
  resetKey,
}: FieldsProps<ProductClassDisplayDetail>) {
  const set = <K extends keyof ProductClassDisplayDetail>(k: K, v: ProductClassDisplayDetail[K]) =>
    onChange({ ...value, [k]: v });
  const listKey = `${resetKey}|${master.productClasses ? "list" : "text"}`;
  return (
    <div className="space-y-4">
      <div className={grid}>
        <FormField
          label="Product Name"
          value={value.ProductName}
          error={err("ProductName")}
          aria-invalid={err("ProductName") ? true : undefined}
          onChange={(e) => set("ProductName", e.target.value)}
        />
        <FareModeField
          value={value.FareDisplayMode}
          error={err("FareDisplayMode")}
          master={master}
          onChange={(v) => set("FareDisplayMode", v)}
        />
        <PrioritySelect
          value={value.Priority}
          options={priorities}
          error={err("Priority")}
          onChange={(v) => set("Priority", v)}
        />
        <PrioritySelect
          label="Margin Priority"
          optional
          value={value.MarginPriority}
          options={priorities}
          error={err("MarginPriority")}
          onChange={(v) => set("MarginPriority", v)}
        />
        <ProductClassPicker
          key={`pc|${listKey}`}
          label="Product Class"
          value={value.ProductClass}
          error={err("ProductClass")}
          master={master}
          onChange={(v) => set("ProductClass", v)}
        />
        <ProductClassPicker
          key={`mpc|${listKey}`}
          label="Margin Product Class"
          value={value.MarginProductClass}
          error={err("MarginProductClass")}
          master={master}
          onChange={(v) => set("MarginProductClass", v)}
        />
        <ProductClassPicker
          key={`mrpc|${listKey}`}
          label="Margin Restricted Product Class"
          value={value.MarginRestrictedProductClass}
          error={err("MarginRestrictedProductClass")}
          master={master}
          onChange={(v) => set("MarginRestrictedProductClass", v)}
        />
      </div>
      <div className={grid3}>
        <BoolSelect label="Separate Node" value={value.SeparateNode} onChange={(v) => set("SeparateNode", v)} />
        <BoolSelect label="Validate Refund Status" value={value.ValidateRefundStatus} onChange={(v) => set("ValidateRefundStatus", v)} />
        <BoolSelect label="Validate Check Bag" value={value.ValidateCheckBag} onChange={(v) => set("ValidateCheckBag", v)} />
        <BoolSelect label="Fixed Product Class" value={value.IsFixedProductClass} onChange={(v) => set("IsFixedProductClass", v)} />
        <BoolSelect label="Fixed Margin Product Class" value={value.IsFixedMarginProductClass} onChange={(v) => set("IsFixedMarginProductClass", v)} />
        <BoolSelect label="Margin Logic" value={value.IsMarginLogic} onChange={(v) => set("IsMarginLogic", v)} />
      </div>
    </div>
  );
}

interface Props {
  item: ConfigItem | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function ConfigFormModal({ item, onClose, onSaved }: Props) {
  const isEdit = !!item;
  const { showToast } = useToast();
  const bodyRef = useRef<HTMLDivElement>(null);

  const [draft, setDraft] = useState<Draft>(() => (item ? fromItem(item) : emptyDraft()));
  const nextKey = useRef(draft.ProductClassDisplayDetails.length);
  const [detailKeys, setDetailKeys] = useState<number[]>(() =>
    draft.ProductClassDisplayDetails.map((_, i) => i)
  );
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  const fareModes = useFareModes();
  const airlines = useAirlines();
  const airports = useAirports();

  const airlineCode = draft.AirlineCode.trim().toUpperCase();
  const activeAirline = useMemo(
    () => (/^[A-Z0-9]{2,3}$/.test(airlineCode) ? airlineCode : null),
    [airlineCode]
  );

const productClasses = useProductClasses(activeAirline, draft.SectorType);

const lastAirline = useRef<string | null>(activeAirline);
useEffect(() => {
  if (lastAirline.current === activeAirline) return;
  lastAirline.current = activeAirline;
  setDraft((d) => ({
    ...d,
    Student_Config: d.Student_Config ? { ...d.Student_Config, ProductClass: [] } : null,
    SrCitizen_Config: d.SrCitizen_Config ? { ...d.SrCitizen_Config, ProductClass: [] } : null,
    Restricted_ProductClass_Display: [],
    Restricted_ProductClass_Margin: [],
    ProductClassDisplayDetails: d.ProductClassDisplayDetails.map((x) => ({
      ...x,
      ProductClass: [],
      MarginProductClass: [],
      MarginRestrictedProductClass: [],
    })),
  }));
}, [activeAirline]);

  const master: MasterBundle = {
    fareModes: fareModes.options,
    productClasses: productClasses.options,
productClassHint: productClasses.loading
  ? "Loading product classes…"
  : productClasses.failed
  ? "Couldn't load product classes. Type codes instead."
  : "No product classes found. Type codes instead.",
  };

  const lookups = useMemo(
    () =>
      lookupsFor(item, {
        airlines: airlines.options?.map((o) => o.value.toUpperCase()) ?? null,
        airports: airports.options?.map((o) => o.value.toUpperCase()) ?? null,
        fareModes: fareModes.options?.map((o) => Number(o.value)).filter((n) => Number.isFinite(n)) ?? null,
        productClasses: productClasses.options?.map((o) => o.value) ?? null,
      }),
    [item, airlines.options, airports.options, fareModes.options, productClasses.options]
  );

  const errors: Errors = useMemo(() => validateDraft(draft, lookups), [draft, lookups]);
  const errorCount = Object.keys(errors).length;

  const err = (key: string) => (showErrors ? errors[key] : undefined);
  const sectionErr = (prefix: string) => (key: string) => err(`${prefix}.${key}`);

  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));

  function setDetail(i: number, v: ProductClassDisplayDetail) {
    setDraft((d) => ({
      ...d,
      ProductClassDisplayDetails: d.ProductClassDisplayDetails.map((x, idx) => (idx === i ? v : x)),
    }));
  }

  function addDetail() {
    setDraft((d) => ({ ...d, ProductClassDisplayDetails: [...d.ProductClassDisplayDetails, newDetail()] }));
    setDetailKeys((k) => [...k, nextKey.current++]);
  }

  function removeDetail(i: number) {
    setDraft((d) => ({
      ...d,
      ProductClassDisplayDetails: d.ProductClassDisplayDetails.filter((_, idx) => idx !== i),
    }));
    setDetailKeys((k) => k.filter((_, idx) => idx !== i));
  }

  async function handleSubmit() {
    setFormError(null);
    if (errorCount > 0) {
      setShowErrors(true);
      setTimeout(() => {
        const first = bodyRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
        first?.scrollIntoView({ block: "center", behavior: "smooth" });
        first?.focus();
      }, 0);
      return;
    }

    setSubmitting(true);
    try {
      const { ConfigId, ...body } = normaliseDraft(draft);
      const res =
        isEdit && ConfigId !== undefined
          ? await updateConfig({ ConfigId, ...body } as ConfigUpdateRequest)
          : await addConfig(body as ConfigAddRequest);

      if (res?.ErrorCode) {
        setFormError(res.Message || "Could not save configuration.");
        return;
      }
      showToast("success", res?.Message || (isEdit ? "Configuration updated." : "Configuration added."));
      onSaved();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const listsFailed = fareModes.failed;
  const summary =
    formError ??
    (showErrors && errorCount > 0
      ? `Please fix ${errorCount} highlighted ${errorCount === 1 ? "field" : "fields"} before saving.`
      : null);

const resetKey = `${activeAirline ?? ""}|${draft.SectorType}`;

  return (
    <Modal
      isOpen
      size="xl"
      title={isEdit ? `Edit Configuration #${item!.ConfigId}` : "Add Configuration"}
      onClose={onClose}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Saving..." : isEdit ? "Save Changes" : "Add Configuration"}
          </button>
        </>
      }
    >
      <div className="space-y-5" ref={bodyRef}>
        {summary && (
          <div className="rounded-lg border border-[var(--color-danger)]/40 bg-[var(--color-danger-soft)] px-3 py-2 text-sm text-[var(--color-danger)]">
            {summary}
          </div>
        )}
        {listsFailed && (
          <div className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-text-muted)]">
            The fare display mode list could not be loaded, so those fields accept typed numbers. Close and reopen
            this form to retry.
          </div>
        )}

        <Section title="Applies to">
          <p className="text-xs text-[var(--color-text-muted)] -mt-2 mb-4">
            Choose * to match everything for that field.
          </p>
          <div className={grid3}>
            <OptionSelect
              id="cfg-channel"
              label="Channel"
              withAll
              value={draft.ChannelCode}
              options={CHANNEL_OPTIONS}
              error={err("ChannelCode")}
              onChange={(v) => patch({ ChannelCode: v })}
            />
            <OptionSelect
              id="cfg-airline"
              label="Airline Code"
              withAll
              value={draft.AirlineCode}
              options={airlines.options ?? []}
              error={err("AirlineCode")}
              onChange={(v) => patch({ AirlineCode: v })}
            />
            <OptionSelect
              id="cfg-cabin"
              label="Cabin"
              withAll
              value={draft.Cabin}
              options={CABIN_OPTIONS}
              error={err("Cabin")}
              onChange={(v) => patch({ Cabin: v })}
            />
            <OptionSelect
              id="cfg-source"
              label="Source"
              withAll
              value={draft.Source}
              options={airports.options ?? []}
              error={err("Source")}
              onChange={(v) => patch({ Source: v })}
            />
            <OptionSelect
              id="cfg-dest"
              label="Destination"
              withAll
              value={draft.Destination}
              options={airports.options ?? []}
              error={err("Destination")}
              onChange={(v) => patch({ Destination: v })}
            />
            <OptionSelect
              id="cfg-sector"
              label="Sector Type"
              value={draft.SectorType}
              options={SECTOR_OPTIONS}
              error={err("SectorType")}
              onChange={(v) => patch({ SectorType: v })}
            />
          </div>
        </Section>

        <Section
          title="Hand Bag Config"
          enabled={!!draft.HandBag_Config}
          onToggle={(on) => patch({ HandBag_Config: on ? newHandBag() : null })}
        >
          {draft.HandBag_Config && (
            <HandBagFields
              value={draft.HandBag_Config}
              onChange={(v) => patch({ HandBag_Config: v })}
              err={sectionErr("HandBag")}
              priorities={lookups.priorities}
              master={master}
              resetKey={resetKey}
            />
          )}
        </Section>

        <Section
          title="Student Config"
          enabled={!!draft.Student_Config}
          onToggle={(on) => patch({ Student_Config: on ? newFareType() : null })}
        >
          {draft.Student_Config && (
            <FareTypeFields
              value={draft.Student_Config}
              onChange={(v) => patch({ Student_Config: v })}
              err={sectionErr("Student")}
              priorities={lookups.priorities}
              master={master}
              resetKey={`s|${resetKey}`}
            />
          )}
        </Section>

        <Section
          title="Sr. Citizen Config"
          enabled={!!draft.SrCitizen_Config}
          onToggle={(on) => patch({ SrCitizen_Config: on ? newFareType() : null })}
        >
          {draft.SrCitizen_Config && (
            <FareTypeFields
              value={draft.SrCitizen_Config}
              onChange={(v) => patch({ SrCitizen_Config: v })}
              err={sectionErr("SrCitizen")}
              priorities={lookups.priorities}
              master={master}
              resetKey={`c|${resetKey}`}
            />
          )}
        </Section>

        <Section title="Restricted Product Classes">
          <div className={grid}>
            <ProductClassPicker
              key={`rd|${resetKey}|${master.productClasses ? "list" : "text"}`}
              label="Restricted (Display)"
              value={draft.Restricted_ProductClass_Display}
              error={err("RestrictedDisplay")}
              master={master}
              onChange={(v) => patch({ Restricted_ProductClass_Display: v })}
            />
            <ProductClassPicker
              key={`rm|${resetKey}|${master.productClasses ? "list" : "text"}`}
              label="Restricted (Margin)"
              value={draft.Restricted_ProductClass_Margin}
              error={err("RestrictedMargin")}
              master={master}
              onChange={(v) => patch({ Restricted_ProductClass_Margin: v })}
            />
          </div>
        </Section>

        <Section
          title="Product Class Display Details"
          action={
            <button type="button" className="btn-secondary !py-1 !px-3 text-xs" onClick={addDetail}>
              <Plus size={14} /> Add detail
            </button>
          }
        >
          {draft.ProductClassDisplayDetails.length === 0 ? (
            <p className="text-xs text-[var(--color-text-muted)]">No details added.</p>
          ) : (
            <div className="space-y-4">
              {draft.ProductClassDisplayDetails.map((d, i) => (
                <div key={detailKeys[i]} className="rounded-md border border-[var(--color-border-soft)] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold">{d.ProductName || `Detail ${i + 1}`}</p>
                    <button type="button" className="btn-icon" title="Remove detail" onClick={() => removeDetail(i)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <DetailFields
                    value={d}
                    onChange={(v) => setDetail(i, v)}
                    err={sectionErr(`Details.${i}`)}
                    priorities={lookups.priorities}
                    master={master}
                    resetKey={resetKey}
                  />
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </Modal>
  );
}