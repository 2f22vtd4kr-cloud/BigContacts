import { useState } from "react";
import { useListEntities, useCreateEntity, useDeleteEntity } from "@workspace/api-client-react";
import { formatCurrency, ScoreBadge } from "@/lib/utils";
import {
  Plus, Search, Trash2, Edit2, ShieldAlert,
  Globe, ChevronDown, ChevronUp, X, Loader2,
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function EntityLedger() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState<AddEntityForm>(EMPTY_FORM);

  const [showRegistry, setShowRegistry] = useState(false);
  const [registryQuery, setRegistryQuery] = useState("");
  const [registrySource, setRegistrySource] = useState<"opencorporates" | "companies-house" | "sec-edgar">("opencorporates");
  const [registryResults, setRegistryResults] = useState<RegistryResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [registryError, setRegistryError] = useState<string | null>(null);
  const [searchedOnce, setSearchedOnce] = useState(false);

  const { data: entities, refetch } = useListEntities({
    search: searchTerm.length > 2 ? searchTerm : undefined,
  });
  const deleteEntity = useDeleteEntity();
  const createEntity = useCreateEntity();

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
    const body: Record<string, unknown> = {
      name: addForm.name.trim(),
      type: addForm.type,
    };
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
      onSuccess: () => {
        setShowAddModal(false);
        setAddForm(EMPTY_FORM);
        refetch();
      },
    });
  };

  const handleRegistrySearch = async () => {
    if (!registryQuery.trim()) return;
    setIsSearching(true);
    setRegistryError(null);
    setRegistryResults([]);
    setSearchedOnce(true);
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
    try {
      const parsed: string[] = JSON.parse(r.sourceRegistries ?? "[]");
      regsStr = parsed.join(", ");
    } catch { regsStr = r.sourceRegistries ?? ""; }
    openAddModal({
      name: r.name,
      type: r.type === "Corporation" ? "Corporation" : r.type === "Gatekeeper" ? "Gatekeeper" : "HNWI",
      nationality: r.nationality ?? "",
      knownResidences: r.knownResidences ?? "",
      notes: r.notes ?? "",
      sourceRegistries: regsStr,
    });
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col">

      {/* ── Header ── */}
      <div className="px-6 py-3 border-b border-border bg-card flex justify-between items-center flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold font-mono tracking-widest text-foreground uppercase">Entity Ledger</h1>
          <p className="text-sm text-muted-foreground font-mono mt-1">Classified Intelligence Registry</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search registry..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-background border border-border rounded pl-9 pr-4 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-primary w-64"
            />
          </div>
          <button
            onClick={() => setShowRegistry((v) => !v)}
            className={`px-4 py-2 rounded font-mono text-sm flex items-center border transition-colors uppercase tracking-wider ${
              showRegistry
                ? "bg-secondary/20 text-secondary border-secondary/50"
                : "bg-muted text-muted-foreground border-border hover:border-secondary/50 hover:text-secondary"
            }`}
          >
            <Globe className="w-4 h-4 mr-2" />
            Live Intel
            {showRegistry ? <ChevronUp className="w-3 h-3 ml-1.5" /> : <ChevronDown className="w-3 h-3 ml-1.5" />}
          </button>
          <button
            onClick={() => openAddModal()}
            className="bg-primary text-primary-foreground px-4 py-2 rounded font-mono text-sm flex items-center hover:bg-primary/90 transition-colors uppercase tracking-wider"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Entity
          </button>
        </div>
      </div>

      {/* ── Live Registry Panel ── */}
      {showRegistry && (
        <div className="border-b border-border bg-card/50 p-5 flex-shrink-0">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-xs font-mono text-secondary uppercase tracking-widest flex items-center">
              <Globe className="w-3.5 h-3.5 mr-1.5" />
              Live Registry Query
            </div>
            <div className="flex-1 h-px bg-border/50" />
            <span className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest">
              OpenCorporates · Companies House UK
            </span>
          </div>

          <div className="flex gap-3">
            <input
              type="text"
              placeholder="e.g. Castellani Holdings, James Kariuki, FitzWilliam..."
              value={registryQuery}
              onChange={(e) => setRegistryQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRegistrySearch()}
              className="flex-1 bg-background border border-border rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-secondary"
            />
            <select
              value={registrySource}
              onChange={(e) => setRegistrySource(e.target.value as "opencorporates" | "companies-house")}
              className="bg-background border border-border rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-secondary"
            >
              <option value="opencorporates">OpenCorporates (Global, Free)</option>
              <option value="sec-edgar">SEC EDGAR (US Large Holders &amp; Directors, Free)</option>
              <option value="companies-house">Companies House (UK, Needs API Key)</option>
            </select>
            <button
              onClick={handleRegistrySearch}
              disabled={isSearching || !registryQuery.trim()}
              className="px-5 py-2 bg-secondary/20 text-secondary border border-secondary/40 rounded font-mono text-sm uppercase tracking-wider hover:bg-secondary/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Search
            </button>
          </div>

          {registryError && (
            <div className="mt-3 text-sm font-mono text-destructive bg-destructive/10 border border-destructive/30 rounded px-3 py-2">
              ⚠ {registryError}
            </div>
          )}

          {registryResults.length > 0 && (
            <div className="mt-4 space-y-2 max-h-72 overflow-y-auto pr-1">
              {registryResults.map((r, i) => (
                <div key={i} className="flex items-start justify-between bg-background border border-border rounded px-4 py-3 hover:border-border/80 transition-colors">
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="font-mono text-sm font-bold text-foreground">{r.name}</div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary/10 text-secondary border border-secondary/20">
                        {r.type}
                      </span>
                      {r.nationality && (
                        <span className="text-xs text-muted-foreground font-mono">{r.nationality}</span>
                      )}
                      {r.knownResidences && (
                        <span className="text-xs text-muted-foreground font-mono truncate max-w-xs">{r.knownResidences}</span>
                      )}
                    </div>
                    {r.notes && (
                      <div className="text-[11px] text-muted-foreground font-mono mt-1.5 truncate">{r.notes}</div>
                    )}
                  </div>
                  <button
                    onClick={() => handleIngestResult(r)}
                    className="flex-shrink-0 px-3 py-1.5 bg-primary/20 text-primary border border-primary/40 rounded font-mono text-xs uppercase tracking-wider hover:bg-primary/30 transition-colors"
                  >
                    + Add
                  </button>
                </div>
              ))}
            </div>
          )}

          {!isSearching && searchedOnce && registryResults.length === 0 && !registryError && (
            <div className="mt-3 text-xs font-mono text-muted-foreground italic">
              No results — try broader terms or check the registry selection.
            </div>
          )}
        </div>
      )}

      {/* ── Entity Table ── */}
      <div className="flex-1 overflow-auto p-4">
        <div className="border border-border rounded bg-card overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 font-mono border-b border-border">
              <tr>
                <th className="px-4 py-3">Name / ID</th>
                <th className="px-4 py-3">Classification</th>
                <th className="px-4 py-3">Signal Score</th>
                <th className="px-4 py-3">Net Worth</th>
                <th className="px-4 py-3">Assets</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y border-border">
              {entities?.map((entity) => (
                <tr key={entity.id} className="hover:bg-muted/20 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      {entity.isHot && <ShieldAlert className="w-4 h-4 text-amber-500 mr-2 animate-pulse" />}
                      <div>
                        <div className="font-bold text-foreground">{entity.name}</div>
                        <div className="text-xs text-muted-foreground font-mono mt-1">
                          ID: #{entity.id.toString().padStart(6, "0")}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col space-y-1.5">
                      <div className="flex items-center space-x-2">
                        <span className="bg-muted px-2 py-1 rounded text-xs font-mono text-muted-foreground border border-border">
                          {entity.type}
                        </span>
                        {entity.nationality && (
                          <span className="text-xs text-muted-foreground">{entity.nationality}</span>
                        )}
                      </div>
                      {entity.sourceRegistries && (() => {
                        try {
                          const regs: string[] = JSON.parse(entity.sourceRegistries);
                          return (
                            <div className="flex flex-wrap gap-1">
                              {regs.slice(0, 2).map((r, i) => (
                                <span key={i} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-secondary/10 text-secondary border border-secondary/20 leading-tight" title={r}>
                                  {r.length > 22 ? r.slice(0, 20) + "…" : r}
                                </span>
                              ))}
                            </div>
                          );
                        } catch { return null; }
                      })()}
                    </div>
                  </td>
                  <td className="px-4 py-3"><ScoreBadge score={entity.bayesianScore} /></td>
                  <td className="px-4 py-3 text-foreground font-mono">{formatCurrency(entity.estimatedNetWorth)}</td>
                  <td className="px-4 py-3 text-foreground font-mono">{entity.assetCount}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 text-muted-foreground hover:text-secondary bg-muted rounded border border-border">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(entity.id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive bg-muted rounded border border-border"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!entities || entities.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground font-mono">
                    No entities found matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add Entity Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />

          {/* Slide-over panel */}
          <div className="w-[480px] bg-card border-l border-border flex flex-col shadow-2xl animate-in slide-in-from-right-full duration-300">
            {/* Panel header */}
            <div className="p-5 border-b border-border flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-sm font-bold font-mono tracking-widest uppercase text-foreground">
                  New Intelligence Target
                </h2>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  Register entity in classified registry
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded bg-muted border border-border transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form fields */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">

              {/* Name */}
              <div>
                <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
                  Full Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={addForm.name}
                  onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Lorenzo Castellani"
                  className="w-full bg-background border border-border rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              {/* Classification */}
              <div>
                <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
                  Classification <span className="text-destructive">*</span>
                </label>
                <select
                  value={addForm.type}
                  onChange={(e) => setAddForm((f) => ({ ...f, type: e.target.value as EntityType }))}
                  className="w-full bg-background border border-border rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="HNWI">HNWI — High Net Worth Individual</option>
                  <option value="Corporation">Corporation — Company / Shell</option>
                  <option value="Trust">Trust — Offshore / Fiduciary</option>
                  <option value="Gatekeeper">Gatekeeper — Contact / Introducer</option>
                </select>
              </div>

              {/* Nationality + Net Worth */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">Nationality</label>
                  <input
                    type="text"
                    value={addForm.nationality}
                    onChange={(e) => setAddForm((f) => ({ ...f, nationality: e.target.value }))}
                    placeholder="e.g. Italian, British"
                    className="w-full bg-background border border-border rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">Est. Net Worth (€)</label>
                  <input
                    type="number"
                    value={addForm.estimatedNetWorth}
                    onChange={(e) => setAddForm((f) => ({ ...f, estimatedNetWorth: e.target.value }))}
                    placeholder="250000000"
                    className="w-full bg-background border border-border rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Known Residences */}
              <div>
                <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">Known Residences</label>
                <input
                  type="text"
                  value={addForm.knownResidences}
                  onChange={(e) => setAddForm((f) => ({ ...f, knownResidences: e.target.value }))}
                  placeholder="e.g. Tuscany, Monaco, Belgravia"
                  className="w-full bg-background border border-border rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              {/* Phone + Email */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">Phone / WhatsApp</label>
                  <input
                    type="text"
                    value={addForm.phone}
                    onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="+39 055..."
                    className="w-full bg-background border border-border rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">Email</label>
                  <input
                    type="email"
                    value={addForm.email}
                    onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="private@..."
                    className="w-full bg-background border border-border rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Contact Method */}
              <div>
                <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">Best Contact Method</label>
                <input
                  type="text"
                  value={addForm.contactMethod}
                  onChange={(e) => setAddForm((f) => ({ ...f, contactMethod: e.target.value }))}
                  placeholder="e.g. WhatsApp, Signal, personal email"
                  className="w-full bg-background border border-border rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              {/* Source Registries */}
              <div>
                <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">Source Registries</label>
                <input
                  type="text"
                  value={addForm.sourceRegistries}
                  onChange={(e) => setAddForm((f) => ({ ...f, sourceRegistries: e.target.value }))}
                  placeholder="Companies House, OpenCorporates, Catasto..."
                  className="w-full bg-background border border-border rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-primary"
                />
                <p className="text-[10px] font-mono text-muted-foreground/60 mt-1">Comma-separated list</p>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">Intelligence Notes</label>
                <textarea
                  value={addForm.notes}
                  onChange={(e) => setAddForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={4}
                  placeholder="Background, approach angles, personal context, seasonal windows..."
                  className="w-full bg-background border border-border rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-primary resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-border flex items-center justify-between flex-shrink-0 bg-muted/20">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-muted text-muted-foreground border border-border rounded font-mono text-sm hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddEntity}
                disabled={!addForm.name.trim() || createEntity.isPending}
                className="px-5 py-2 bg-primary text-primary-foreground rounded font-mono text-sm uppercase tracking-wider hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {createEntity.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Register Entity
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
