import { useCallback, useEffect, useMemo, useState } from "react";
import { BoardPageFrame } from "@/components/board-page-frame";
import DeepSearch from "@/pages/deep-search";
import { Clock3, RefreshCw, Trash2 } from "lucide-react";

type SavedSearch = {
  id: string;
  query: string;
  savedAt: string;
  lastRunAt?: string;
  resultCount?: number;
};

type SourceSlot = { state?: string; label?: string };
type SourceSnapshot = {
  ai?: Record<string, SourceSlot[]>;
  pythonTools?: Record<string, boolean>;
  generatedAt?: string;
};
type RegistrySource = {
  id: string;
  label: string;
  jurisdiction: string;
  freshness: string;
  productionReviewStatus: string;
  runtimeAdapterImplemented?: boolean;
};

const STORAGE_KEY = "apex-atlas-saved-searches-v1";
const WEB_PROVIDERS = [
  { key: "serper", label: "Serper" },
  { key: "tavily", label: "Tavily" },
  { key: "exa", label: "Exa" },
];

function providerState(slots: SourceSlot[] | undefined) {
  if (!Array.isArray(slots) || slots.length === 0) return "Not reported";
  const active = slots.filter((slot) => slot.state === "active");
  if (active.length > 0) return "Configured";
  const present = slots.filter((slot) => slot.state !== "missing");
  if (present.length === 0) return "Not configured";
  if (present.every((slot) => slot.state === "rate_limited" || slot.state === "exhausted")) return "Rate-limited";
  return "Unavailable";
}

function dateLabel(value?: string) {
  if (!value) return "Not run yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not run yet";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

export default function BoardDiscoverPage() {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  const [selectedQuery, setSelectedQuery] = useState<string | undefined>(undefined);
  const [sourceSnapshot, setSourceSnapshot] = useState<SourceSnapshot | null>(null);
  const [registrySources, setRegistrySources] = useState<RegistrySource[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(true);
  const [sourcesError, setSourcesError] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        setSavedSearches(parsed.filter((item): item is SavedSearch =>
          Boolean(item && typeof item === "object" &&
            typeof (item as SavedSearch).id === "string" &&
            typeof (item as SavedSearch).query === "string")
        ).slice(0, 20));
      }
    } catch {
      setSavedSearches([]);
    } finally {
      setStorageReady(true);
    }
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(savedSearches)); } catch { /* Storage may be unavailable in private browsing. */ }
  }, [savedSearches, storageReady]);

  const loadSources = useCallback(async () => {
    setSourcesLoading(true);
    setSourcesError(false);
    const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
    try {
      const [statusResponse, registryResponse] = await Promise.all([
        fetch(`${base}/api/system/status`, { credentials: "include", cache: "no-store" }),
        fetch(`${base}/api/registry-matrix`, { credentials: "include", cache: "no-store" }),
      ]);
      if (!statusResponse.ok || !registryResponse.ok) throw new Error("Source status unavailable");
      const [status, registry] = await Promise.all([statusResponse.json(), registryResponse.json()]);
      setSourceSnapshot(status as SourceSnapshot);
      setRegistrySources(Array.isArray(registry?.sources) ? registry.sources : []);
    } catch {
      setSourceSnapshot(null);
      setRegistrySources([]);
      setSourcesError(true);
    } finally {
      setSourcesLoading(false);
    }
  }, []);

  useEffect(() => { void loadSources(); }, [loadSources]);

  const webProviderRows = useMemo(() =>
    WEB_PROVIDERS.map((provider) => ({
      ...provider,
      status: providerState(sourceSnapshot?.ai?.[provider.key]),
    })), [sourceSnapshot]);

  const pythonTools = sourceSnapshot?.pythonTools ?? {};
  const footprintCount = Object.values(pythonTools).filter(Boolean).length;
  const footprintTotal = Object.keys(pythonTools).length;
  const webConfigured = webProviderRows.some((provider) => provider.status === "Configured");
  const rateLimitedProviders = webProviderRows.filter((provider) => provider.status === "Rate-limited").map((provider) => provider.label);
  const reviewedRegistries = registrySources.filter((source) => source.productionReviewStatus === "reviewed_for_production");
  const reviewRequiredRegistries = registrySources.filter((source) => source.productionReviewStatus === "review_required");
  const availableRegistries = reviewedRegistries.filter((source) => source.runtimeAdapterImplemented === true);
  const registryAdapterReady = availableRegistries.length > 0;
  const footprintAvailable = footprintCount > 0;
  const sourceKindsReady = Number(webConfigured) + Number(registryAdapterReady) + Number(footprintAvailable);
  const sourceKindsLabel = sourcesLoading || sourcesError ? "— of 3" : `${sourceKindsReady} of 3`;
  const webDetail = webProviderRows.filter((provider) => provider.status === "Configured").map((provider) => provider.label).join(", ") ||
    (rateLimitedProviders.length > 0 ? "All configured providers are rate-limited" : "No configured web search provider reported");
  const webDetailWithNote = [
    webDetail,
    rateLimitedProviders.length > 0 && webConfigured ? "Rate-limited: " + rateLimitedProviders.join(", ") : "",
    webProviderRows.some((provider) => provider.key === "serper" && provider.status === "Not reported") ? "Serper status not reported" : "",
  ].filter(Boolean).join(" · ");
  const registryDetail = availableRegistries.length > 0
    ? availableRegistries.slice(0, 2).map((source) => source.label).join(", ") +
      (reviewRequiredRegistries.length > 0 ? ` · ${reviewRequiredRegistries[0].label} requires review` : "")
    : reviewedRegistries.length > 0
      ? "Production reviewed; runtime adapter unavailable"
      : registrySources.length > 0 ? "Catalogued; no production-reviewed runtime adapter" : "Registry catalog unavailable";
  const footprintDetail = footprintTotal === 0
    ? "Worker status not reported"
    : footprintCount === 0
      ? "Needs the worker, which is not connected"
      : `${footprintCount} of ${footprintTotal} signed tools available`;

  const saveSearch = useCallback((query: string) => {
    const value = query.trim().slice(0, 1200);
    if (!value) return;
    const id = value.toLocaleLowerCase();
    setSavedSearches((current) => {
      const existing = current.find((item) => item.id === id);
      const next = existing
        ? current.map((item) => item.id === id ? { ...item, query: value } : item)
        : [{ id, query: value, savedAt: new Date().toISOString() }, ...current].slice(0, 20);
      return next;
    });
  }, []);

  const recordSearch = useCallback((query: string, response: { results?: unknown[] }) => {
    const id = query.trim().toLocaleLowerCase();
    setSavedSearches((current) => current.map((item) => item.id === id
      ? { ...item, lastRunAt: new Date().toISOString(), resultCount: Array.isArray(response.results) ? response.results.length : undefined }
      : item));
  }, []);

  const removeSearch = (id: string) => setSavedSearches((current) => current.filter((item) => item.id !== id));

  const sourceGroups = [
    { id: "web", label: "Web search", detail: webDetailWithNote, ready: webConfigured, status: webConfigured ? "Configured" : rateLimitedProviders.length > 0 ? "Rate-limited" : "Unavailable" },
    { id: "registries", label: "Registries", detail: registryDetail, ready: registryAdapterReady, status: registryAdapterReady ? "Adapter ready" : "Unavailable" },
    { id: "footprint", label: "Footprint tools", detail: footprintDetail, ready: footprintAvailable, status: footprintAvailable ? "Available" : "Unavailable" },
  ];

  return (
    <BoardPageFrame
      className="atlas-board-discover"
      split
      title="Where Atlas looks"
      description="Saved searches and the sources behind them. Atlas chooses its own sources for each run; this page shows what it can choose from."
    >
      <section className="atlas-discover-search" aria-label="Public-record search">
        <DeepSearch
          boardMode
          selectedQuery={selectedQuery}
          onSaveSearch={saveSearch}
          onSearchCompleted={recordSearch}
          sourceStatus={{
            webSearch: sourcesLoading || sourcesError ? null : webConfigured,
            registries: sourcesLoading || sourcesError ? null : registryAdapterReady,
            footprint: sourcesLoading || sourcesError ? null : footprintAvailable,
          }}
        />
        <div className="atlas-discover-summary" aria-label="Discover coverage">
          <div><strong>{savedSearches.length}</strong><span>Saved searches</span></div>
          <div><strong>{sourceKindsLabel}</strong><span>Source kinds ready</span></div>
        </div>
      </section>

      <aside className="atlas-discover-rail">
        <section className="atlas-discover-panel" aria-labelledby="atlas-saved-searches-title">
          <div className="atlas-discover-panel-heading">
            <div>
              <h2 id="atlas-saved-searches-title">Saved searches</h2>
              <p>{savedSearches.length} saved · this device</p>
            </div>
            <span className="atlas-discover-count">{savedSearches.length}</span>
          </div>
          {savedSearches.length === 0 ? (
            <div className="atlas-discover-empty">
              <p>No saved searches yet.</p>
              <span>Run a public-record search, then save its query here.</span>
            </div>
          ) : (
            <ul className="atlas-discover-saved-list">
              {savedSearches.map((item) => (
                <li key={item.id}>
                  <button type="button" className="atlas-discover-saved-query" onClick={() => setSelectedQuery(item.query)}>
                    <strong>{item.query}</strong>
                    <span><Clock3 aria-hidden="true" /> {dateLabel(item.lastRunAt)}{item.resultCount != null ? ` · ${item.resultCount} results` : ""}</span>
                  </button>
                  <button type="button" className="atlas-discover-remove" onClick={() => removeSearch(item.id)} aria-label={`Remove saved search: ${item.query}`}>
                    <Trash2 aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="atlas-discover-panel" aria-labelledby="atlas-source-register-title">
          <div className="atlas-discover-panel-heading">
            <div>
              <h2 id="atlas-source-register-title">Sources</h2>
              <p>Configuration and adapter state, not a promise of results</p>
            </div>
            <button type="button" className="atlas-discover-refresh" onClick={() => void loadSources()} disabled={sourcesLoading} aria-label="Refresh source status" aria-busy={sourcesLoading}>
              <RefreshCw aria-hidden="true" />
            </button>
          </div>
          {sourcesLoading ? (
            <div className="atlas-discover-empty" role="status">Checking provider and registry status…</div>
          ) : sourcesError ? (
            <div className="atlas-discover-empty" role="alert">Source status could not be verified. Retry to check again.</div>
          ) : (
            <div className="atlas-discover-source-groups">
              {sourceGroups.map((group) => (
                <div className="atlas-discover-source-group" key={group.id}>
                  <div className="atlas-discover-source-group-heading">
                    <span className={"atlas-discover-source-marker " + (group.ready ? "is-live" : "is-unavailable")} aria-hidden="true" />
                    <strong>{group.label}</strong>
                    <span>{group.status}</span>
                  </div>
                  <p>{group.detail}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </aside>
    </BoardPageFrame>
  );
}
