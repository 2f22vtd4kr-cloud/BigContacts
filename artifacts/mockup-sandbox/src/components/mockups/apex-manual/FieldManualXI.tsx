import React from 'react';
import { 
  Zap, BrainCircuit, Box, Server, Search, Layers, ShieldAlert,
  Database, GitBranch, ArrowRight, Play, Terminal, Info, Link2, Telescope
} from 'lucide-react';

function Callout({ icon, color, title, children }: { icon: React.ReactNode; color: string; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 p-5 rounded-lg border my-6 bg-opacity-10" style={{ borderColor: `${color}30`, backgroundColor: `${color}0A` }}>
      <div className="mt-0.5 shrink-0" style={{ color }}>{icon}</div>
      <div>
        <p className="text-xs font-bold font-mono mb-2 uppercase tracking-widest" style={{ color }}>{title}</p>
        <div className="text-sm text-[#94A3B8] leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

function FeatureGrid({ items }: { items: { icon: React.ReactNode; color: string; label: string; desc: string }[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col gap-3 p-5 rounded-lg border" style={{ borderColor: `${item.color}25`, backgroundColor: `${item.color}07` }}>
          <div className="w-10 h-10 rounded border flex items-center justify-center shrink-0" style={{ borderColor: item.color, backgroundColor: `${item.color}15`, color: item.color }}>
            {item.icon}
          </div>
          <div>
            <p className="text-sm font-bold font-mono mb-2" style={{ color: item.color }}>{item.label}</p>
            <p className="text-xs text-[#94A3B8] leading-relaxed">{item.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function Steps({ color, items }: { color: string; items: { title: string; body: string }[] }) {
  return (
    <div className="space-y-0 my-8">
      {items.map((s, i) => (
        <div key={i} className="flex gap-5 pb-6 relative group">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded border text-xs font-mono font-bold flex items-center justify-center shrink-0 z-10 transition-colors"
              style={{ borderColor: color + "60", color, backgroundColor: color + "15" }}>{i + 1}</div>
            {i < items.length - 1 && <div className="w-px flex-1 mt-2 mb-1" style={{ backgroundColor: color + "25" }} />}
          </div>
          <div className="pb-2 pt-1">
            <p className="text-sm font-bold font-mono text-[#E2E8F0] mb-2">{s.title}</p>
            <p className="text-sm text-[#64748B] leading-relaxed max-w-3xl">{s.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function CodeTable({ endpoints }: { endpoints: { method: string, path: string, desc: string }[] }) {
  return (
    <div className="my-6 rounded-lg border border-[#1E293B] bg-[#050A14] overflow-hidden">
      <div className="px-4 py-2 border-b border-[#1E293B] bg-[#0B0F19] flex items-center gap-2">
        <Terminal size={14} className="text-[#0EA5E9]" />
        <span className="text-[10px] font-mono font-bold text-[#64748B] uppercase tracking-widest">Key Endpoints</span>
      </div>
      <div className="p-0">
        <table className="w-full text-left border-collapse">
          <tbody>
            {endpoints.map((ep, i) => (
              <tr key={i} className="border-b border-[#1E293B] last:border-0 hover:bg-[#1E293B]/30 transition-colors">
                <td className="py-3 px-4 w-24">
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${ep.method === 'GET' ? 'text-[#3B82F6] bg-[#3B82F6]/10 border border-[#3B82F6]/30' : 'text-[#10B981] bg-[#10B981]/10 border border-[#10B981]/30'}`}>
                    {ep.method}
                  </span>
                </td>
                <td className="py-3 px-4 font-mono text-xs text-[#E2E8F0]">{ep.path}</td>
                <td className="py-3 px-4 text-xs text-[#64748B]">{ep.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function FieldManualXI() {
  const levelColor = "#0EA5E9"; // Sky blue for Phase G

  return (
    <div className="dark min-h-screen bg-[#0B0F19] font-sans text-[#E2E8F0] p-8 flex justify-center">
      <div className="w-full max-w-4xl">
        <section className="relative bg-[#0F172A] border border-[#1E293B] rounded-xl p-8 md:p-10 overflow-hidden shadow-2xl">
          {/* Background Level Numeral */}
          <div className="absolute top-0 right-0 text-9xl font-bold font-mono select-none leading-none pr-6 pt-4 opacity-5 pointer-events-none text-[#0EA5E9]">
            XI
          </div>
          
          <div className="mb-10 relative z-10">
            <span className="inline-flex items-center gap-2 text-[10px] font-mono font-bold px-3 py-1 rounded border mb-4" 
              style={{ color: levelColor, backgroundColor: `${levelColor}15`, borderColor: `${levelColor}30` }}>
              <Zap size={12} /> LEVEL XI — PHASE G
            </span>
            <h2 className="text-3xl font-bold font-mono text-[#E2E8F0] tracking-tight">Semantic Intelligence Layer</h2>
          </div>

          <div className="relative z-10">
            <p className="text-sm text-[#94A3B8] leading-relaxed mb-8 max-w-3xl">
              Phase G unlocks semantic understanding across the entity ledger. Instead of relying solely on exact keyword matches (BM25) or network graph proximity, the system now embeds all entity profiles and relationship notes into high-dimensional vector space.
            </p>

            <h3 className="text-xs font-bold font-mono text-[#64748B] uppercase tracking-widest mt-10 mb-2 border-b border-[#1E293B] pb-2">What Phase G adds</h3>
            <FeatureGrid items={[
              { 
                icon: <BrainCircuit size={18} />, 
                color: "#0EA5E9", 
                label: "Sentence Embeddings", 
                desc: "Utilizes all-MiniLM-L6-v2 via WASM. Generates 384-dimensional vectors directly in the server. Model is ~23MB and loads automatically on boot." 
              },
              { 
                icon: <Search size={18} />, 
                color: "#10B981", 
                label: "4-Signal Hybrid Search", 
                desc: "Fuses BM25, TF-IDF, Bayesian graph signals, and Semantic cosine similarity via Reciprocal Rank Fusion (RRF). Activates when ≥100 embeddings are cached." 
              },
              { 
                icon: <GitBranch size={18} />, 
                color: "#F59E0B", 
                label: "Semantic Dedup", 
                desc: "Automatically compares embeddings across all registry sources. Cosine similarity >0.93 creates LIKELY_SAME_PERSON edges." 
              }
            ]} />

            <h3 className="text-xs font-bold font-mono text-[#64748B] uppercase tracking-widest mt-12 mb-2 border-b border-[#1E293B] pb-2">Triggering embeddings</h3>
            <Steps color={levelColor} items={[
              {
                title: "Navigate to Data Sources",
                body: "Go to the Data Sources dashboard and locate the Phase G Control Panel."
              },
              {
                title: "Compute Embeddings",
                body: "Click \"Compute Embeddings\" to dispatch a background worker. The system batches up to 50,000 entities at a time, generating vector representations for names, aliases, and analyst notes."
              },
              {
                title: "Check Execution Status",
                body: "Monitor GET /api/search/embedding-status. The payload returns modelLoaded (boolean), cacheSize (integer), model (string), and dimensions (integer)."
              },
              {
                title: "Utilize 4-Signal Search",
                body: "Once the cache exceeds 100 entities, Hybrid Search automatically upgrades from 3-signal to 4-signal, dynamically improving query relevance as the semantic cache grows."
              }
            ]} />

            <Callout icon={<Layers size={18} />} color="#F59E0B" title="Semantic Deduplication Engine">
              The cross-registry deduplicator (POST <code>/api/relationships/semantic-dedup</code>) periodically compares entity embeddings from isolated datasets (FAA, EDGAR, HMLR, BRREG, CH). When a cosine similarity exceeds the 0.93 threshold, the system mints <code>LIKELY_SAME_PERSON</code> edges connecting the profiles. This job auto-triggers at 8min and 34min past the hour after boot.
            </Callout>

            <Callout icon={<Telescope size={18} />} color="#8B5CF6" title="OSINT Tools Directory">
              Phase G also integrates 4,400+ categorized intelligence tools synced from the OSINT Tool Database (HuggingFace). Navigate to <strong>OSINT Tools</strong> in the sidebar to browse all 21 categories. Results are backed by a 24h Redis cache to ensure sub-millisecond retrieval times.
            </Callout>

            <h3 className="text-xs font-bold font-mono text-[#64748B] uppercase tracking-widest mt-12 mb-4 border-b border-[#1E293B] pb-2">API Reference</h3>
            <CodeTable endpoints={[
              { method: "POST", path: "/api/ingest/compute-embeddings", desc: "Trigger background embedding computation" },
              { method: "GET", path: "/api/search/embedding-status", desc: "Check WASM model and Redis cache status" },
              { method: "POST", path: "/api/relationships/semantic-dedup", desc: "Run cross-registry semantic dedup" },
              { method: "GET", path: "/api/osint-tools/categories", desc: "List all OSINT tool categories" }
            ]} />

          </div>
        </section>
      </div>
    </div>
  );
}