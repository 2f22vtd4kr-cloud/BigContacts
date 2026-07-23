import { Radio, Mail, Phone, Network, ChevronRight, Database, Activity, Users, CheckCircle2, Globe, MapPin } from "lucide-react";

interface Lead {
  id: string;
  name: string;
  type: string;
  nationality: string;
  contacts: ("EMAIL" | "PHONE" | "NETWORK")[];
  accessGrade: "A" | "B" | "C" | "D";
  accessScore: number;
  wealthTier: string;
  wealthAmount: string;
  context: string;
}

const LEADS: Lead[] = [
  {
    id: "1",
    name: "James R. Whitmore",
    type: "Aircraft owner",
    nationality: "US",
    contacts: ["EMAIL", "PHONE", "NETWORK"],
    accessGrade: "A",
    accessScore: 94,
    wealthTier: "Ultra",
    wealthAmount: "$140M",
    context: "Private aviation + SEC filings",
  },
  {
    id: "2",
    name: "Sarah Chen-Nakamura",
    type: "SEC registrant",
    nationality: "UK",
    contacts: ["EMAIL", "NETWORK"],
    accessGrade: "B",
    accessScore: 78,
    wealthTier: "Very High",
    wealthAmount: "$67M",
    context: "Tech executive, board member",
  },
  {
    id: "3",
    name: "Meridian Capital Holdings LLC",
    type: "Real estate trust",
    nationality: "US",
    contacts: ["EMAIL", "PHONE"],
    accessGrade: "B",
    accessScore: 71,
    wealthTier: "Ultra",
    wealthAmount: "$290M",
    context: "Multi-property portfolio",
  },
  {
    id: "4",
    name: "Robert P. Garrison III",
    type: "Private investor",
    nationality: "US",
    contacts: ["EMAIL"],
    accessGrade: "C",
    accessScore: 62,
    wealthTier: "Very High",
    wealthAmount: "$45M",
    context: "Venture capital, angel investor",
  },
  {
    id: "5",
    name: "Highfield Aviation Trust",
    type: "Aircraft trust",
    nationality: "US",
    contacts: [],
    accessGrade: "D",
    accessScore: 38,
    wealthTier: "High",
    wealthAmount: "$18M",
    context: "Registry trace only",
  },
  {
    id: "6",
    name: "Elena Vasquez-Ruiz",
    type: "Business owner",
    nationality: "ES",
    contacts: ["EMAIL", "PHONE", "NETWORK"],
    accessGrade: "A",
    accessScore: 89,
    wealthTier: "Very High",
    wealthAmount: "$82M",
    context: "Manufacturing, verified contacts",
  },
  {
    id: "7",
    name: "TechVenture Partners IX LP",
    type: "Investment fund",
    nationality: "US",
    contacts: ["EMAIL"],
    accessGrade: "C",
    accessScore: 55,
    wealthTier: "Ultra",
    wealthAmount: "$520M",
    context: "Fund structure, limited access",
  },
  {
    id: "8",
    name: "Coastal Properties LLC",
    type: "Real estate entity",
    nationality: "US",
    contacts: ["PHONE"],
    accessGrade: "C",
    accessScore: 58,
    wealthTier: "Very High",
    wealthAmount: "$95M",
    context: "Phone contact verified",
  },
];

const GRADE_COLORS = {
  A: { bg: "rgba(16, 185, 129, 0.15)", text: "#10B981", border: "#10B981" },
  B: { bg: "rgba(59, 130, 246, 0.15)", text: "#3B82F6", border: "#3B82F6" },
  C: { bg: "rgba(251, 191, 36, 0.15)", text: "#F59E0B", border: "#F59E0B" },
  D: { bg: "rgba(107, 114, 128, 0.15)", text: "#6B7280", border: "#6B7280" },
};

function LeadCard({ lead }: { lead: Lead }) {
  const gradeColor = GRADE_COLORS[lead.accessGrade];
  const isLowAccess = lead.accessGrade === "D";

  return (
    <div
      className="relative p-5 rounded transition-all cursor-pointer group"
      style={{
        background: isLowAccess ? "rgba(20, 24, 36, 0.5)" : "#141824",
        border: "1px solid #2A3045",
        opacity: isLowAccess ? 0.7 : 1,
      }}
    >
      {/* Access Grade Badge - Top Right */}
      <div
        className="absolute top-4 right-4 w-10 h-10 rounded flex items-center justify-center font-bold text-lg"
        style={{
          background: gradeColor.bg,
          color: gradeColor.text,
          border: `2px solid ${gradeColor.border}`,
        }}
      >
        {lead.accessGrade}
      </div>

      {/* Name */}
      <div className="pr-14 mb-3">
        <h3
          className="text-lg font-semibold mb-1"
          style={{ color: "hsl(215,19%,89%)" }}
        >
          {lead.name}
        </h3>
        <div className="flex items-center gap-2 text-xs" style={{ color: "hsl(215,16%,65%)" }}>
          <span>{lead.type}</span>
          <span>•</span>
          <span>{lead.nationality}</span>
        </div>
      </div>

      {/* Contact Chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        {lead.contacts.includes("EMAIL") && (
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium"
            style={{
              background: "rgba(16, 185, 129, 0.1)",
              color: "#10B981",
              border: "1px solid rgba(16, 185, 129, 0.3)",
            }}
          >
            <Mail size={12} />
            EMAIL
          </div>
        )}
        {lead.contacts.includes("PHONE") && (
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium"
            style={{
              background: "rgba(16, 185, 129, 0.1)",
              color: "#10B981",
              border: "1px solid rgba(16, 185, 129, 0.3)",
            }}
          >
            <Phone size={12} />
            PHONE
          </div>
        )}
        {lead.contacts.includes("NETWORK") && (
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium"
            style={{
              background: "rgba(16, 185, 129, 0.1)",
              color: "#10B981",
              border: "1px solid rgba(16, 185, 129, 0.3)",
            }}
          >
            <Network size={12} />
            NETWORK
          </div>
        )}
        {lead.contacts.length === 0 && (
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs"
            style={{
              background: "rgba(107, 114, 128, 0.1)",
              color: "#6B7280",
            }}
          >
            Registry trace only
          </div>
        )}
      </div>

      {/* Bottom Row - Wealth + Action */}
      <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: "#2A3045" }}>
        <div className="text-xs" style={{ color: "hsl(215,16%,65%)" }}>
          {lead.wealthTier} · {lead.wealthAmount}
        </div>
        <div className="flex items-center gap-1 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "#10B981" }}>
          View profile
          <ChevronRight size={14} />
        </div>
      </div>
    </div>
  );
}

export default function Desktop() {
  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "#0B0F19", fontFamily: "Inter, sans-serif", color: "hsl(215,19%,89%)" }}
    >
      {/* Sidebar */}
      <div
        className="w-60 flex-shrink-0 border-r flex flex-col"
        style={{ background: "#141824", borderColor: "#2A3045" }}
      >
        <div className="p-6 border-b" style={{ borderColor: "#2A3045" }}>
          <h1 className="text-xl font-bold" style={{ color: "#10B981" }}>
            ApexFinder Pro
          </h1>
          <p className="text-xs mt-1" style={{ color: "hsl(215,16%,65%)" }}>
            Intelligence Platform
          </p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <div
            className="flex items-center gap-3 px-3 py-2.5 rounded cursor-pointer"
            style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10B981" }}
          >
            <Activity size={18} />
            <span className="text-sm font-medium">Dashboard</span>
          </div>
          <div
            className="flex items-center gap-3 px-3 py-2.5 rounded cursor-pointer"
            style={{ color: "hsl(215,16%,65%)" }}
          >
            <Users size={18} />
            <span className="text-sm">Profiles</span>
          </div>
          <div
            className="flex items-center gap-3 px-3 py-2.5 rounded cursor-pointer"
            style={{ color: "hsl(215,16%,65%)" }}
          >
            <Database size={18} />
            <span className="text-sm">Research</span>
          </div>
          <div
            className="flex items-center gap-3 px-3 py-2.5 rounded cursor-pointer"
            style={{ color: "hsl(215,16%,65%)" }}
          >
            <Globe size={18} />
            <span className="text-sm">Sources</span>
          </div>
        </nav>

        <div className="p-4 border-t" style={{ borderColor: "#2A3045" }}>
          <div className="text-xs" style={{ color: "hsl(215,16%,65%)" }}>
            System Status
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-2 h-2 rounded-full" style={{ background: "#10B981" }} />
            <span className="text-sm">All systems operational</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Stats Bar */}
        <div
          className="h-16 border-b flex items-center px-6 gap-8"
          style={{ background: "#141824", borderColor: "#2A3045" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded flex items-center justify-center"
              style={{ background: "rgba(16, 185, 129, 0.15)" }}
            >
              <Mail size={18} style={{ color: "#10B981" }} />
            </div>
            <div>
              <div className="text-xl font-bold">183</div>
              <div className="text-xs" style={{ color: "hsl(215,16%,65%)" }}>
                Reachable
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded flex items-center justify-center"
              style={{ background: "rgba(59, 130, 246, 0.15)" }}
            >
              <Radio size={18} style={{ color: "#3B82F6" }} />
            </div>
            <div>
              <div className="text-xl font-bold">3</div>
              <div className="text-xs" style={{ color: "hsl(215,16%,65%)" }}>
                Active Research
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded flex items-center justify-center"
              style={{ background: "rgba(107, 114, 128, 0.15)" }}
            >
              <Users size={18} style={{ color: "#9CA3AF" }} />
            </div>
            <div>
              <div className="text-xl font-bold">32,547</div>
              <div className="text-xs" style={{ color: "hsl(215,16%,65%)" }}>
                Profiles
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded flex items-center justify-center"
              style={{ background: "rgba(107, 114, 128, 0.15)" }}
            >
              <Globe size={18} style={{ color: "#9CA3AF" }} />
            </div>
            <div>
              <div className="text-xl font-bold">0.5%</div>
              <div className="text-xs" style={{ color: "hsl(215,16%,65%)" }}>
                Coverage
              </div>
            </div>
          </div>
        </div>

        {/* Operations Rail */}
        <div
          className="border-b px-6 py-5"
          style={{
            background: "linear-gradient(90deg, rgba(16, 185, 129, 0.05) 0%, rgba(11, 15, 25, 0) 100%)",
            borderColor: "#2A3045",
          }}
        >
          <div className="space-y-3">
            {/* Job 1 */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 w-48">
                <div
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ background: "#10B981", boxShadow: "0 0 8px #10B981" }}
                />
                <span className="text-sm font-medium">FAA Registry</span>
              </div>
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "#1E2332" }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: "82%", background: "#10B981" }}
                />
              </div>
              <span className="text-sm font-mono w-12 text-right" style={{ color: "#10B981" }}>
                82%
              </span>
              <span className="text-xs w-32 text-right" style={{ color: "hsl(215,16%,65%)" }}>
                +214 profiles
              </span>
            </div>

            {/* Job 2 */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 w-48">
                <div
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ background: "#10B981", boxShadow: "0 0 8px #10B981" }}
                />
                <span className="text-sm font-medium">In-House Enrichment</span>
              </div>
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "#1E2332" }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: "60%", background: "#10B981" }}
                />
              </div>
              <span className="text-sm font-mono w-12 text-right" style={{ color: "#10B981" }}>
                60%
              </span>
              <span className="text-xs w-32 text-right" style={{ color: "hsl(215,16%,65%)" }}>
                31 contacted
              </span>
            </div>

            {/* Job 3 */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 w-48">
                <div
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ background: "#10B981", boxShadow: "0 0 8px #10B981" }}
                />
                <span className="text-sm font-medium">Semantic Embeddings</span>
              </div>
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "#1E2332" }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: "40%", background: "#10B981" }}
                />
              </div>
              <span className="text-sm font-mono w-12 text-right" style={{ color: "#10B981" }}>
                40%
              </span>
              <span className="text-xs w-32 text-right" style={{ color: "hsl(215,16%,65%)" }}>
                computing
              </span>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Priority Contacts */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Priority Contacts</h2>
              <p className="text-sm mt-1" style={{ color: "hsl(215,16%,65%)" }}>
                Best people to reach right now
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {LEADS.map((lead) => (
                <LeadCard key={lead.id} lead={lead} />
              ))}
            </div>
          </div>

          {/* Research Context Sidebar */}
          <div
            className="w-80 border-l p-6 overflow-y-auto"
            style={{ background: "#141824", borderColor: "#2A3045" }}
          >
            <h3 className="text-sm font-semibold mb-4">Research Context</h3>

            {/* Wealth Distribution */}
            <div className="mb-6">
              <div className="text-xs mb-3" style={{ color: "hsl(215,16%,65%)" }}>
                Wealth distribution
              </div>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Ultra &gt;$100M</span>
                    <span className="font-mono">7,392</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "#1E2332" }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: "72%", background: "#10B981" }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Very $30-100M</span>
                    <span className="font-mono">4,016</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "#1E2332" }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: "40%", background: "#3B82F6" }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>High $10-30M</span>
                    <span className="font-mono">21,139</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "#1E2332" }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: "92%", background: "#6B7280" }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Last Completed */}
            <div className="mb-6">
              <div className="text-xs mb-3" style={{ color: "hsl(215,16%,65%)" }}>
                Last completed task
              </div>
              <div
                className="p-3 rounded flex items-start gap-3"
                style={{ background: "#1E2332" }}
              >
                <CheckCircle2 size={16} style={{ color: "#10B981", marginTop: 2 }} />
                <div className="text-sm">
                  <div className="font-medium mb-1">FAA Registry Scan</div>
                  <div style={{ color: "hsl(215,16%,65%)" }}>
                    +214 profiles added
                  </div>
                </div>
              </div>
            </div>

            {/* Data Sources */}
            <div>
              <div className="text-xs mb-3" style={{ color: "hsl(215,16%,65%)" }}>
                Active data sources
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#10B981" }} />
                  Public registry data
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#10B981" }} />
                  SEC filings
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#10B981" }} />
                  In-house enrichment
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#6B7280" }} />
                  External verification
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
