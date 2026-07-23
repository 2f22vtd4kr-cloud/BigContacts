import { useState, useMemo, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useListEntities, useCreateEntity, useDeleteEntity } from "@workspace/api-client-react";
import { formatCurrency, formatEntityName, AccessScoreBadge } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  Plus, Search, Trash2, Globe, ChevronDown, ChevronUp, X, Loader2,
  ChevronRight, Network, Target as TargetIcon, Download, ShieldAlert,
  Filter, UserCheck, Building2, Briefcase, Shield, IdCard,
  CheckSquare, Square, Users2, ListPlus, CheckCheck, Database, XCircle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type EntityType = "HNWI" | "Corporation" | "Trust" | "Gatekeeper";

interface AddEntityForm {
  name: string;
  type: EntityType;
  nationality: string;
  estimatedNetWorth: string;
  knownResidences: string;
  phone: string;
  email: string;
  contactMethod: string;
  notes: string;
  sourceRegistries: string;
}

interface RegistryResult {
  name: string;
  type: "Corporation" | "HNWI" | "Gatekeeper";
  nationality?: string;
  knownResidences?: string;
  sourceRegistries?: string;
  notes?: string;
  metadata?: string;
}

const EMPTY_FORM: AddEntityForm = {
  name: "", type: "HNWI", nationality: "", estimatedNetWorth: "",
  knownResidences: "", phone: "", email: "", contactMethod: "",
  notes: "", sourceRegistries: "",
};

const TYPE_COLORS: Record<string, string> = {
  HNWI: "#10B981",
  Corporation: "#3B82F6",
  Trust: "#A855F7",
  Gatekeeper: "#F59E0B",
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  HNWI:        <UserCheck className="w-3 h-3" />,
  Corporation: <Building2 className="w-3 h-3" />,
  Trust:       <Briefcase className="w-3 h-3" />,
  Gatekeeper:  <Shield className="w-3 h-3" />,
};

// ─── CSV export ───────────────────────────────────────────────────────────────

function exportToCsv(entities: any[]) {
  const cols = [
    "id","name","type","nationality","bayesianScore","estimatedNetWorth",
    "knownResidences","contactMethod","isHot","notes","sourceRegistries","createdAt",
  ];
  const rows = [
    cols.join(","),
    ...entities.map((e) =>
      cols.map((c) => {
        const v = e[c];
        if (v === null || v === undefined) return "";
        const s = String(v).replace(/"/g, '""');
        return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s}"` : s;
      }).join(",")
    ),
  ];
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `apex-entities-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Mobile card ──────────────────────────────────────────────────────────────

function MobileEntityCard({
  entity, selected, onToggleSelect, isExpanded, onToggleExpand,
}: {
  entity: any; selected: boolean; isExpanded: boolean;
  onToggleSelect: (e: React.MouseEvent) => void;
  onToggleExpand: () => void;
}) {
  const typeColor = TYPE_COLORS[entity.type] ?? "#64748B";
  let registries: string[] = [];
  try { registries = JSON.parse(entity.sourceRegistries ?? "[]"); } catch { registries = []; }

  return (
    <div className={cn("border-b border-border bg-card", selected && "bg-primary/5")}>
      <div 
        onClick={onToggleExpand}
        className="flex items-center px-4 py-3 cursor-pointer"
      >
        <button onClick={onToggleSelect} className="shrink-0 mr-3" aria-label={selected ? "Deselect" : "Select"}>
          {selected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-muted-foreground" />}
        </button>
        <div className="flex-1 min-w-0 pr-2">
          <div className="font-semibold text-[14px] text-foreground truncate">
            {formatEntityName(entity.name)}
          </div>
          <div className="mt-1">
            <span
              className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded flex items-center gap-1 w-max"
              style={{ color: typeColor, backgroundColor: typeColor + "18" }}
            >
              {TYPE_ICONS[entity.type]} {entity.type}
            </span>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <AccessScoreBadge score={entity.accessScore} />
          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 pt-1 animate-in slide-in-from-top-2 fade-in duration-200">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mb-0.5">Nationality</div>
              <div className="text-xs text-foreground font-mono">{entity.nationality ?? "—"}</div>
            </div>
            <div>
              <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mb-0.5">Net Worth</div>
              <div className="text-xs text-foreground font-mono">{entity.estimatedNetWorth ? formatCurrency(entity.estimatedNetWorth) : "—"}</div>
            </div>
          </div>
          
          <div className="mb-3">
            <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mb-0.5">Contact Vector</div>
            <div className="text-xs text-foreground font-mono">
              {entity.email ? entity.email : entity.phone ? entity.phone : entity.linkedinUrl ? "LinkedIn" : "No contact trace"}
            </div>
          </div>

          {registries.length > 0 && (
            <div className="mb-4">
              <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5">Source Registries</div>
              <div className="flex flex-wrap gap-1">
                {registries.map((r) => (
                  <span key={r} className="text-[9px] font-mono px-1.5 py-0.5 bg-muted border border-border rounded text-muted-foreground">{r}</span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <Link
              href={`/profile/${entity.id}`}
              className="flex flex-col items-center justify-center gap-1.5 py-2 bg-muted border border-border rounded text-muted-foreground hover:text-primary transition-colors"
            >
              <IdCard className="w-3.5 h-3.5" />
              <span className="text-[9px] font-mono uppercase">Profile</span>
            </Link>
            <Link
              href={`/graph?entity=${entity.id}`}
              className="flex flex-col items-center justify-center gap-1.5 py-2 bg-muted border border-border rounded text-muted-foreground hover:text-primary transition-colors"
            >
              <Network className="w-3.5 h-3.5" />
              <span className="text-[9px] font-mono uppercase">Network</span>
            </Link>
            <Link
              href={`/research?entity=${entity.id}`}
              className="flex flex-col items-center justify-center gap-1.5 py-2 bg-primary/10 border border-primary/20 rounded text-primary hover:bg-primary/20 transition-colors"
            >
              <TargetIcon className="w-3.5 h-3.5" />
              <span className="text-[9px] font-mono uppercase">Research</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function MobileLedgerState({ kind }: { kind: "loading" | "unavailable" | "empty" }) {
  if (kind === "loading") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center text-muted-foreground">
        <Loader2 className="w-6 h-6 text-primary animate-spin" aria-hidden="true" />
        <p className="text-xs font-mono uppercase tracking-wider">Loading entity ledger</p>
      </div>
    );
  }

  if (kind === "unavailable") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center text-muted-foreground">
        <XCircle className="w-7 h-7 text-amber-400/80" aria-hidden="true" />
        <div>
          <p className="text-sm font-mono text-foreground">Entity data is temporarily unavailable.</p>
          <p className="text-xs leading-relaxed mt-1">
            The registry database did not respond. Try again shortly or review active tasks.
          </p>
        </div>
        <Link href="/jobs" className="text-xs font-mono text-primary hover:underline">
          View background tasks →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center text-muted-foreground">
      <Database className="w-8 h-8 opacity-30" aria-hidden="true" />
      <div>
        <p className="text-sm font-mono text-foreground">No entities match these filters.</p>
        <p className="text-xs leading-relaxed mt-1">Clear a filter or run ingestion to populate the ledger.</p>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function EntityLedger() {
  const [, navigate] = useLocation();
  const searchStr = useSearch();
  const urlParams = new URLSearchParams(searchStr);

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [proximityMin, setProximityMin] = useState<number>(0);
  const [hotOnly, setHotOnly] = useState(() => urlParams.get("hot") === "1");
  const [contactableOnly, setContactableOnly] = useState(() => urlParams.get("contactable") === "1");
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState<AddEntityForm>(EMPTY_FORM);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkDone, setBulkDone]   = useState<string | null>(null);
  const [page, setPage]           = useState(0);

  // Reset to page 0 when filters change
  useEffect(() => { setPage(0); }, [searchTerm, typeFilter, proximityMin, hotOnly, contactableOnly]);

  const toggleSelect = (id: number) =>
    setSelectedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  const toggleSelectAll = (list: any[]) =>
    setSelectedIds((prev) => prev.size === list.length ? new Set() : new Set(list.map((e: any) => e.id)));

  const handleBulkExportCsv = () => {
    const sel = (entities ?? []).filter((e: any) => selectedIds.has(e.id));
    exportToCsv(sel);
  };

  const handleBulkAddToCrm = async () => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    setBulkDone(null);
    let added = 0;
    const base = (import.meta as any).env.BASE_URL.replace(/\/$/, "");
    for (const id of selectedIds) {
      try {
        await fetch(`${base}/api/research/lead`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetEntityId: id }),
        });
        added++;
      } catch { /* non-fatal */ }
    }
    setBulkLoading(false);
    setBulkDone(`${added} lead${added !== 1 ? "s" : ""} added to CRM`);
    setTimeout(() => setBulkDone(null), 3000);
  };

  const handleBulkMcts = () => {
    const first = [...selectedIds][0];
    if (first) navigate(`/research?entity=${first}`);
  };

  const [showRegistry, setShowRegistry] = useState(false);
  const [registryQuery, setRegistryQuery] = useState("");
  const [registrySource, setRegistrySource] = useState<"opencorporates" | "companies-house" | "sec-edgar">("opencorporates");
  const [registryResults, setRegistryResults] = useState<RegistryResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [registryError, setRegistryError] = useState<string | null>(null);
  const [searchedOnce, setSearchedOnce] = useState(false);

  const [mobileSelectedEntity, setMobileSelectedEntity] = useState<any>(null);
  const [mobileTypeFilter, setMobileTypeFilter] = useState<string | null>(null);

  const isSpecialFilter = hotOnly || contactableOnly;

  const { data: rawEntities, isLoading: isLoadingEntities, isError: isEntitiesError, refetch } = useListEntities({
    search: searchTerm.length > 2 ? searchTerm : undefined,
    type: typeFilter ?? undefined,
    limit: isSpecialFilter ? 500 : 50,
    offset: isSpecialFilter ? 0 : page * 50,
  });
  const deleteEntity = useDeleteEntity();
  const createEntity = useCreateEntity();

  // Client-side filters: proximity + hot + contactable
  const entities = useMemo(() => {
    if (!rawEntities) return [];
    let list = rawEntities as any[];
    if (hotOnly) list = list.filter((e: any) => e.isHot);
    if (contactableOnly) list = list.filter((e: any) =>
      e.contactEmail || e.contactPhone || e.contactMethod
    );
    if (proximityMin > 0) list = list.filter((e: any) => {
      try {
        const meta = JSON.parse((e as any).metadata ?? "{}");
        return (meta.proximityScore ?? 0) >= proximityMin;
      } catch { return false; }
    });
    return list;
  }, [rawEntities, proximityMin, hotOnly, contactableOnly]);

  const handleDelete = (id: number) => {
    if (confirm("Purge entity from registry?")) {
      deleteEntity.mutate({ id }, { onSuccess: () => refetch() });
    }
  };

  const openAddModal = (prefill?: Partial<AddEntityForm>) => {
    setAddForm(prefill ? { ...EMPTY_FORM, ...prefill } : EMPTY_FORM);
    setShowAddModal(true);
  };

  const handleAddEntity = () => {
    if (!addForm.name.trim()) return;
    const body: Record<string, unknown> = { name: addForm.name.trim(), type: addForm.type };
    if (addForm.nationality.trim()) body.nationality = addForm.nationality.trim();
    if (addForm.estimatedNetWorth) body.estimatedNetWorth = parseFloat(addForm.estimatedNetWorth);
    if (addForm.knownResidences.trim()) body.knownResidences = addForm.knownResidences.trim();
    if (addForm.phone.trim()) body.phone = addForm.phone.trim();
    if (addForm.email.trim()) body.email = addForm.email.trim();
    if (addForm.contactMethod.trim()) body.contactMethod = addForm.contactMethod.trim();
    if (addForm.notes.trim()) body.notes = addForm.notes.trim();
    if (addForm.sourceRegistries.trim()) {
      body.sourceRegistries = JSON.stringify(
        addForm.sourceRegistries.split(",").map((s) => s.trim()).filter(Boolean),
      );
    }
    createEntity.mutate({ data: body as any }, {
      onSuccess: () => { setShowAddModal(false); setAddForm(EMPTY_FORM); refetch(); },
    });
  };

  const handleRegistrySearch = async () => {
    if (!registryQuery.trim()) return;
    setIsSearching(true); setRegistryError(null); setRegistryResults([]); setSearchedOnce(true);
    try {
      const resp = await fetch("/api/registry-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: registryQuery.trim(), registry: registrySource, limit: 15 }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error ?? "Registry search failed.");
      setRegistryResults(data.results ?? []);
    } catch (err: any) {
      setRegistryError(err.message ?? "Registry search failed.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleIngestResult = (r: RegistryResult) => {
    let regsStr = "";
    try { regsStr = JSON.parse(r.sourceRegistries ?? "[]").join(", "); }
    catch { regsStr = r.sourceRegistries ?? ""; }
    openAddModal({
      name: r.name,
      type: r.type === "Corporation" ? "Corporation" : r.type === "Gatekeeper" ? "Gatekeeper" : "HNWI",
      nationality: r.nationality ?? "",
      knownResidences: r.knownResidences ?? "",
      notes: r.notes ?? "",
      sourceRegistries: regsStr,
    });
  };

  // Mobile filtered list (typeFilter already applied server-side; hotOnly applied client-side in entities)
  const mobileEntities = useMemo(() => {
    if (!entities) return [];
    return entities;
  }, [entities]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Desktop ── */}
      <div className="hidden md:flex flex-col h-full overflow-hidden">
        {/* Active filter banner */}
        {(hotOnly || contactableOnly) && (
          <div className={cn(
            "flex items-center justify-between px-4 py-2 border-b text-xs font-mono flex-shrink-0",
            hotOnly ? "bg-amber-500/10 border-amber-500/30 text-amber-400" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
          )}>
            <div className="flex items-center gap-2">
              <Filter className="w-3 h-3 shrink-0" />
              <span className="font-bold uppercase tracking-wider">
                {hotOnly ? "Filtered: Hot Leads only" : "Filtered: Contactable only"}
              </span>
              <span className="opacity-60">— {entities.length} shown</span>
            </div>
            <button
              onClick={() => { setHotOnly(false); setContactableOnly(false); }}
              className="flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" /> Clear filter
            </button>
          </div>
        )}
        {/* Header toolbar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/30 flex-shrink-0">
          <div className="flex items-center gap-2 flex-1 px-3 py-1.5 rounded-full bg-background border border-border">
            <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <input
              type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search entities…"
              className="flex-1 bg-transparent text-sm font-mono text-foreground outline-none placeholder:text-muted-foreground/50"
            />
            {searchTerm && <button onClick={() => setSearchTerm("")}><X className="w-3.5 h-3.5 text-muted-foreground" /></button>}
          </div>

          {/* Type filter */}
          <div className="flex items-center gap-1.5">
            {[null, "HNWI", "Corporation", "Trust", "Gatekeeper"].map((t) => {
              const c = t ? (TYPE_COLORS[t] ?? "#64748B") : "#10B981";
              return (
                <button
                  key={t ?? "all"}
                  onClick={() => setTypeFilter(t)}
                  className="px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase transition-all flex items-center gap-1.5"
                  style={{
                    backgroundColor: typeFilter === t ? c : "transparent",
                    color: typeFilter === t ? "#000" : "hsl(var(--muted-foreground))",
                    border: `1px solid ${typeFilter === t ? c : "hsl(var(--border))"}`,
                  }}
                >
                  {t ? TYPE_ICONS[t] : null} {t ?? "ALL"}
                </button>
              );
            })}
          </div>

          {/* Action buttons */}
          <button
            onClick={() => setShowRegistry(!showRegistry)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full border font-mono text-[10px] uppercase tracking-wider transition-all ml-2",
              showRegistry ? "bg-secondary/20 border-secondary text-secondary" : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            <Globe className="w-3 h-3" /> Live Intel
          </button>

          {entities && entities.length > 0 && (
            <button
              onClick={() => exportToCsv(entities)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground font-mono text-[10px] uppercase tracking-wider transition-all"
            >
              <Download className="w-3 h-3" /> CSV
            </button>
          )}

          <button
            onClick={() => openAddModal()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-transparent text-muted-foreground hover:bg-muted font-mono text-[10px] uppercase tracking-wider transition-colors ml-auto"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>

        {/* Live Intel slide-over sidebar */}
        <div className={cn(
          "fixed top-0 right-0 h-full w-[min(380px,100vw)] bg-card border-l border-border shadow-2xl z-40 flex flex-col transition-transform duration-300 ease-in-out",
          showRegistry ? "translate-x-0" : "translate-x-full"
        )}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm flex-shrink-0">
            <span className="text-xs font-mono text-secondary uppercase tracking-widest flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" /> Live Registry Query
            </span>
            <button onClick={() => setShowRegistry(false)} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-4">
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
              OpenCorporates · Companies House · SEC EDGAR
            </p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 px-3 py-2 rounded bg-background border border-border focus-within:border-secondary/60 transition-colors">
                <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <input
                  type="text" value={registryQuery} onChange={(e) => setRegistryQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRegistrySearch()}
                  placeholder="Search name, company, or filing…"
                  className="flex-1 bg-transparent text-sm font-mono text-foreground outline-none placeholder:text-muted-foreground/50"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={registrySource} onChange={(e) => setRegistrySource(e.target.value as any)}
                  className="flex-1 bg-background border border-border rounded px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-secondary/60"
                >
                  <option value="opencorporates">OpenCorporates</option>
                  <option value="companies-house">Companies House UK</option>
                  <option value="sec-edgar">SEC EDGAR</option>
                </select>
                <button
                  onClick={handleRegistrySearch} disabled={isSearching}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded font-mono text-xs uppercase tracking-wider hover:bg-secondary/90 disabled:opacity-50 flex items-center gap-2 flex-shrink-0"
                >
                  {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  Search
                </button>
              </div>
            </div>

            {registryError && (
              <div className="text-xs font-mono text-destructive bg-destructive/10 border border-destructive/20 rounded px-3 py-2">{registryError}</div>
            )}
            {registryResults.length > 0 && (
              <div className="border border-border rounded overflow-hidden">
                {registryResults.map((r, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2.5 border-b border-border last:border-b-0 hover:bg-muted/20">
                    <div>
                      <div className="text-xs font-mono font-bold text-foreground">{r.name}</div>
                      <div className="text-[10px] font-mono text-muted-foreground">{r.nationality} · {r.type}</div>
                    </div>
                    <button
                      onClick={() => handleIngestResult(r)}
                      className="text-[10px] font-mono text-primary hover:underline px-2 py-1 border border-primary/30 rounded flex-shrink-0 ml-2"
                    >
                      + Ingest
                    </button>
                  </div>
                ))}
              </div>
            )}
            {registryResults.length === 0 && !isSearching && !registryError && (
              <div className="flex-1 border border-border/50 border-dashed rounded-lg flex flex-col items-center justify-center p-8 text-center">
                <Globe className="w-8 h-8 text-muted-foreground/20 mb-3" />
                <p className="text-xs font-mono text-muted-foreground/60 leading-relaxed">
                  Connect to global registries to instantly ingest entity data, directors, and proxy connections.
                </p>
              </div>
            )}
            {searchedOnce && !isSearching && registryResults.length === 0 && !registryError && (
              <div className="text-xs font-mono text-muted-foreground">No results found.</div>
            )}
          </div>
        </div>

        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="flex-shrink-0 flex items-center gap-3 px-4 h-9 border-b border-primary/30 bg-primary/5">
            <span className="text-[10px] font-mono text-primary font-bold">
              {selectedIds.size} selected
            </span>
            <div className="flex-1" />
            {bulkDone ? (
              <span className="text-[10px] font-mono text-primary flex items-center gap-1.5">
                <CheckCheck className="w-3.5 h-3.5" /> {bulkDone}
              </span>
            ) : (
              <>
                <button
                  onClick={handleBulkExportCsv}
                  className="flex items-center gap-1 px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground font-mono text-[9px] uppercase tracking-wider transition-all"
                >
                  <Download className="w-2.5 h-2.5" /> Export CSV
                </button>
                <button
                  onClick={handleBulkAddToCrm}
                  disabled={bulkLoading}
                  className="flex items-center gap-1 px-2 py-1 rounded border border-secondary/40 bg-secondary/10 text-secondary font-mono text-[9px] uppercase tracking-wider hover:bg-secondary/20 disabled:opacity-40 transition-all"
                >
                  {bulkLoading
                    ? <Loader2 className="w-2.5 h-2.5 animate-spin" />
                    : <ListPlus className="w-2.5 h-2.5" />}
                  {bulkLoading ? "Adding…" : "Add to CRM"}
                </button>
                <button
                  onClick={handleBulkMcts}
                  className="flex items-center gap-1 px-2 py-1 rounded border border-primary/40 bg-primary/10 text-primary font-mono text-[9px] uppercase tracking-wider hover:bg-primary/20 transition-all"
                >
                  <TargetIcon className="w-2.5 h-2.5" /> Run Research
                </button>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="text-[9px] font-mono text-muted-foreground hover:text-foreground transition-colors ml-1 uppercase tracking-wider"
                >
                  ✕ Clear
                </button>
              </>
            )}
          </div>
        )}

        {/* Entity table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-card/90 backdrop-blur-sm border-b border-border">
                <th className="px-3 py-3 w-8">
                  <button
                    onClick={() => toggleSelectAll(entities ?? [])}
                    className="flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                    title="Select all"
                  >
                    {entities && selectedIds.size === entities.length && entities.length > 0
                      ? <CheckSquare className="w-3.5 h-3.5 text-primary" />
                      : <Square className="w-3.5 h-3.5" />}
                  </button>
                </th>
                {["Name", "Type", "Nationality", "Access", "Contact Vector", "Net Worth"].map((h) => (
                  <th key={h} className={cn(
                    "px-4 py-3 text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap",
                    h === "Net Worth" ? "text-right" : "text-left"
                  )}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {entities?.map((entity: any) => {
                const typeColor = TYPE_COLORS[entity.type] ?? "#64748B";
                const isSelected = selectedIds.has(entity.id);
                return (
                  <tr key={entity.id} className={cn(
                    "group hover:bg-muted/20 transition-colors",
                    entity.isHot && "bg-amber-500/5",
                    isSelected && "bg-primary/5 hover:bg-primary/8",
                  )}>
                    <td className="px-3 py-3 w-8">
                      <button
                        onClick={() => toggleSelect(entity.id)}
                        className="flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                      >
                        {isSelected
                          ? <CheckSquare className="w-3.5 h-3.5 text-primary" />
                          : <Square className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {entity.isHot && <ShieldAlert className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                        <span className="font-semibold text-sm text-foreground whitespace-nowrap">{formatEntityName(entity.name)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded flex items-center gap-1.5 w-max whitespace-nowrap"
                        style={{ color: typeColor, backgroundColor: typeColor + "18" }}
                      >
                        {TYPE_ICONS[entity.type]} {entity.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground font-mono whitespace-nowrap">{entity.nationality ?? "—"}</td>
                    <td className="px-4 py-3"><AccessScoreBadge score={entity.accessScore} /></td>
                    <td className="px-4 py-3 text-xs max-w-[220px]">
                      {entity.email || entity.phone || entity.linkedinUrl ? (
                        <div className="flex flex-col gap-0.5">
                          {entity.email && (
                            <a
                              href={`mailto:${entity.email}`}
                              className="flex items-center gap-1 text-primary hover:underline truncate font-mono"
                              title={entity.email}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                              <span className="truncate text-[11px]" title={entity.email}>{entity.email}</span>
                            </a>
                          )}
                          {entity.phone && (
                            <a
                              href={`tel:${entity.phone}`}
                              className="flex items-center gap-1 text-secondary hover:underline font-mono"
                              title={entity.phone}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                              <span className="text-[11px]" title={entity.phone}>{entity.phone}</span>
                            </a>
                          )}
                          {entity.linkedinUrl && !entity.email && !entity.phone && (
                            <a
                              href={entity.linkedinUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-blue-400 hover:underline font-mono"
                              title={entity.linkedinUrl}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                              <span className="text-[11px] truncate" title={entity.linkedinUrl}>LinkedIn</span>
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/40 font-mono text-[11px] italic">No contact</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-foreground text-right whitespace-nowrap">
                      {entity.estimatedNetWorth ? formatCurrency(entity.estimatedNetWorth) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link
                          href={`/profile/${entity.id}`}
                          className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
                          title="Apex Profile Card"
                        >
                          <IdCard className="w-3.5 h-3.5" />
                        </Link>
                        <Link
                          href={`/graph?entity=${entity.id}`}
                          className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
                          title="View network"
                        >
                          <Network className="w-3.5 h-3.5" />
                        </Link>
                        <Link
                          href={`/research?entity=${entity.id}`}
                          className="p-1.5 text-muted-foreground hover:text-secondary transition-colors"
                          title="Hybrid Research"
                        >
                          <TargetIcon className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => handleDelete(entity.id)}
                          className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {(!entities || entities.length === 0) && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Database className="w-8 h-8 mb-3 opacity-20" />
                      <div className="font-mono text-sm mb-1">No entities found.</div>
                      <div className="text-xs opacity-60">Run ingestion from Data Sources to populate the database</div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer: pagination + count */}
        <div className="border-t border-border px-4 py-2 flex items-center justify-between bg-card/30 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="flex items-center gap-1 px-2.5 py-1 rounded border border-border text-[10px] font-mono text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
            >
              ← Prev
            </button>
            <span className="text-[10px] font-mono text-muted-foreground">
              Page {page + 1}
              {entities && ` · ${entities.length} shown`}
              {proximityMin > 0 && ` · proximity ≥ ${proximityMin}`}
              {typeFilter && ` · ${typeFilter}`}
            </span>
            <button
              disabled={!entities || entities.length < 50}
              onClick={() => setPage((p) => p + 1)}
              className="flex items-center gap-1 px-2.5 py-1 rounded border border-border text-[10px] font-mono text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
            >
              Next →
            </button>
          </div>
          <button
            onClick={() => exportToCsv(entities ?? [])}
            className="text-[10px] font-mono text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <Download className="w-3 h-3" /> Export CSV
          </button>
        </div>
      </div>

      {/* ── Mobile ── */}
      <div className="flex md:hidden flex-col h-full overflow-hidden">
        {/* Mobile active filter banner */}
        {(hotOnly || contactableOnly) && (
          <div className={cn(
            "flex items-center justify-between px-3 py-2 border-b text-xs font-mono flex-shrink-0",
            hotOnly ? "bg-amber-500/10 border-amber-500/30 text-amber-400" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
          )}>
            <span className="font-bold uppercase tracking-wider truncate">
              {hotOnly ? "Hot Leads only" : "Contactable only"} — {entities.length} shown
            </span>
            <button onClick={() => { setHotOnly(false); setContactableOnly(false); }} className="flex items-center gap-1 ml-2 shrink-0 opacity-70">
              <X className="w-3 h-3" /> Clear
            </button>
          </div>
        )}
        <div className="px-3 py-2 border-b border-border bg-card/30 flex-shrink-0">
          <div className="flex items-center gap-2 px-3 py-2.5 rounded bg-background border border-border">
            <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <input
              type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search entities…"
              className="flex-1 bg-transparent text-sm font-mono text-foreground outline-none placeholder:text-muted-foreground/50"
            />
            {searchTerm && <button onClick={() => setSearchTerm("")}><X className="w-3.5 h-3.5 text-muted-foreground" /></button>}
          </div>
        </div>
        {/* Mobile filter chips */}
        <div className="flex md:hidden items-center gap-2 px-4 py-2 overflow-x-auto border-b border-border bg-card/30 shrink-0"
             style={{ scrollbarWidth: "none" }}>
          {[
            { label: `All (${entities.length})`, value: null },
            { label: "HNWI",        value: "HNWI" },
            { label: "Corp",        value: "Corporation" },
            { label: "Trust",       value: "Trust" },
            { label: "Gatekeeper",  value: "Gatekeeper" },
          ].map(({ label, value }) => (
            <button
              key={label}
              onClick={() => setTypeFilter(value)}
              className={cn(
                "shrink-0 h-8 px-3 rounded text-[12px] font-mono border transition-colors",
                typeFilter === value
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "bg-card text-muted-foreground border-border"
              )}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => setHotOnly(!hotOnly)}
            className={cn(
              "shrink-0 h-8 px-3 rounded text-[12px] font-mono border transition-colors",
              hotOnly ? "bg-amber-500/10 text-amber-400 border-amber-500/30" : "bg-card text-muted-foreground border-border"
            )}
          >
            🔥 Hot
          </button>
        </div>

        {/* Mobile bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 border-b border-primary/30 bg-primary/5">
            <span className="text-xs font-mono text-primary font-bold flex-shrink-0">
              {selectedIds.size} selected
            </span>
            <div className="flex-1" />
            {bulkDone ? (
              <span className="text-xs font-mono text-primary flex items-center gap-1">
                <CheckCheck className="w-3.5 h-3.5" /> {bulkDone}
              </span>
            ) : (
              <>
                <button onClick={handleBulkExportCsv}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded border border-border text-muted-foreground font-mono text-[10px] uppercase tracking-wider">
                  <Download className="w-3 h-3" /> CSV
                </button>
                <button onClick={handleBulkAddToCrm} disabled={bulkLoading}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded border border-secondary/40 bg-secondary/10 text-secondary font-mono text-[10px] uppercase tracking-wider disabled:opacity-40">
                  {bulkLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ListPlus className="w-3 h-3" />}
                  CRM
                </button>
                <button onClick={handleBulkMcts}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded border border-primary/40 bg-primary/10 text-primary font-mono text-[10px] uppercase tracking-wider">
                  <TargetIcon className="w-3 h-3" /> Research
                </button>
                <button onClick={() => setSelectedIds(new Set())}
                  className="text-[10px] font-mono text-muted-foreground hover:text-foreground ml-1">
                  ✕
                </button>
              </>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {isLoadingEntities && <MobileLedgerState kind="loading" />}
          {!isLoadingEntities && isEntitiesError && <MobileLedgerState kind="unavailable" />}
          {!isLoadingEntities && !isEntitiesError && mobileEntities.map((entity: any) => (
            <MobileEntityCard
              key={entity.id}
              entity={entity}
              selected={selectedIds.has(entity.id)}
              isExpanded={mobileSelectedEntity?.id === entity.id}
              onToggleExpand={() => setMobileSelectedEntity(mobileSelectedEntity?.id === entity.id ? null : entity)}
              onToggleSelect={(e) => { e.stopPropagation(); toggleSelect(entity.id); }}
            />
          ))}
          {!isLoadingEntities && !isEntitiesError && mobileEntities.length === 0 && <MobileLedgerState kind="empty" />}
        </div>
      </div>

      {/* Mobile FAB */}
      <button
        onClick={() => openAddModal()}
        className="fixed bottom-6 right-5 w-12 h-12 rounded-full flex items-center justify-center shadow-lg z-40 md:hidden"
        style={{ backgroundColor: "#10B981", boxShadow: "0 0 20px rgba(16,185,129,0.4)" }}
      >
        <Plus className="w-5 h-5 text-black" />
      </button>

      {/* Add entity modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="w-full max-w-[480px] bg-card border-l border-border flex flex-col shadow-2xl animate-in slide-in-from-right-full duration-300">
            <div className="p-5 border-b border-border flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-sm font-bold font-mono tracking-widest uppercase text-foreground">New Intelligence Target</h2>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">Register entity in classified registry</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 text-muted-foreground hover:text-foreground rounded bg-muted border border-border">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {[
                { label: "Full Name *", field: "name", placeholder: "e.g. James Worthington III" },
              ].map(({ label, field, placeholder }) => (
                <div key={field}>
                  <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">{label}</label>
                  <input
                    type="text" value={(addForm as any)[field]} placeholder={placeholder}
                    onChange={(e) => setAddForm((f) => ({ ...f, [field]: e.target.value }))}
                    className="w-full bg-background border border-border rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">Classification *</label>
                <select value={addForm.type} onChange={(e) => setAddForm((f) => ({ ...f, type: e.target.value as EntityType }))}
                  className="w-full bg-background border border-border rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-primary">
                  <option value="HNWI">HNWI — High Net Worth Individual</option>
                  <option value="Corporation">Corporation — Company / Shell</option>
                  <option value="Trust">Trust — Offshore / Fiduciary</option>
                  <option value="Gatekeeper">Gatekeeper — Contact / Introducer</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Nationality", field: "nationality", placeholder: "e.g. British" },
                  { label: "Net Worth (USD)", field: "estimatedNetWorth", placeholder: "e.g. 50000000" },
                ].map(({ label, field, placeholder }) => (
                  <div key={field}>
                    <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">{label}</label>
                    <input type={field === "estimatedNetWorth" ? "number" : "text"} value={(addForm as any)[field]} placeholder={placeholder}
                      onChange={(e) => setAddForm((f) => ({ ...f, [field]: e.target.value }))}
                      className="w-full bg-background border border-border rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-primary" />
                  </div>
                ))}
              </div>
              {[
                { label: "Known Residences", field: "knownResidences", placeholder: "London, UK / Monaco / Dubai" },
                { label: "Contact Vector", field: "contactMethod", placeholder: "Personal WhatsApp / Family Office / Gatekeeper…" },
                { label: "Phone", field: "phone", placeholder: "+44 7..." },
                { label: "Email", field: "email", placeholder: "private@..." },
                { label: "Source Registries", field: "sourceRegistries", placeholder: "Companies House, OpenCorporates, FAA…" },
              ].map(({ label, field, placeholder }) => (
                <div key={field}>
                  <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">{label}</label>
                  <input type="text" value={(addForm as any)[field]} placeholder={placeholder}
                    onChange={(e) => setAddForm((f) => ({ ...f, [field]: e.target.value }))}
                    className="w-full bg-background border border-border rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-primary" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">Intelligence Notes</label>
                <textarea value={addForm.notes} onChange={(e) => setAddForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={4} placeholder="Background, approach angles, personal context, seasonal windows…"
                  className="w-full bg-background border border-border rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-primary resize-none" />
              </div>
            </div>

            <div className="p-5 border-t border-border flex items-center justify-between flex-shrink-0 bg-muted/20">
              <button onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-muted text-muted-foreground border border-border rounded font-mono text-sm hover:text-foreground transition-colors">
                Cancel
              </button>
              <button onClick={handleAddEntity} disabled={!addForm.name.trim() || createEntity.isPending}
                className="px-5 py-2 bg-primary text-primary-foreground rounded font-mono text-sm uppercase tracking-wider hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
                {createEntity.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Register Entity
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
