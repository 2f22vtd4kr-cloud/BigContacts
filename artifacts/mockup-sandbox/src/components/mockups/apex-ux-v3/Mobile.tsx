import { Radio, Mail, Phone, Network, ChevronRight } from "lucide-react";

interface Lead {
  id: string;
  name: string;
  type: string;
  nationality: string;
  contacts: ("EMAIL" | "PHONE" | "NETWORK")[];
  accessGrade: "A" | "B" | "C" | "D";
  wealthTier: string;
  wealthAmount: string;
}

const LEADS: Lead[] = [
  {
    id: "1",
    name: "James R. Whitmore",
    type: "Aircraft owner",
    nationality: "US",
    contacts: ["EMAIL", "PHONE", "NETWORK"],
    accessGrade: "A",
    wealthTier: "Ultra",
    wealthAmount: "$140M",
  },
  {
    id: "2",
    name: "Sarah Chen-Nakamura",
    type: "SEC registrant",
    nationality: "UK",
    contacts: ["EMAIL", "NETWORK"],
    accessGrade: "B",
    wealthTier: "Very High",
    wealthAmount: "$67M",
  },
  {
    id: "3",
    name: "Elena Vasquez-Ruiz",
    type: "Business owner",
    nationality: "ES",
    contacts: ["EMAIL", "PHONE", "NETWORK"],
    accessGrade: "A",
    wealthTier: "Very High",
    wealthAmount: "$82M",
  },
  {
    id: "4",
    name: "Meridian Capital Holdings LLC",
    type: "Real estate trust",
    nationality: "US",
    contacts: ["EMAIL", "PHONE"],
    accessGrade: "B",
    wealthTier: "Ultra",
    wealthAmount: "$290M",
  },
  {
    id: "5",
    name: "Robert P. Garrison III",
    type: "Private investor",
    nationality: "US",
    contacts: ["EMAIL"],
    accessGrade: "C",
    wealthTier: "Very High",
    wealthAmount: "$45M",
  },
  {
    id: "6",
    name: "TechVenture Partners IX LP",
    type: "Investment fund",
    nationality: "US",
    contacts: ["EMAIL"],
    accessGrade: "C",
    wealthTier: "Ultra",
    wealthAmount: "$520M",
  },
  {
    id: "7",
    name: "Coastal Properties LLC",
    type: "Real estate entity",
    nationality: "US",
    contacts: ["PHONE"],
    accessGrade: "C",
    wealthTier: "Very High",
    wealthAmount: "$95M",
  },
  {
    id: "8",
    name: "Highfield Aviation Trust",
    type: "Aircraft trust",
    nationality: "US",
    contacts: [],
    accessGrade: "D",
    wealthTier: "High",
    wealthAmount: "$18M",
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
      className="relative p-4 rounded"
      style={{
        background: isLowAccess ? "rgba(20, 24, 36, 0.5)" : "#141824",
        border: "1px solid #2A3045",
        opacity: isLowAccess ? 0.7 : 1,
      }}
    >
      {/* Name + Grade */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 pr-2">
          <h3
            className="font-semibold mb-1"
            style={{ fontSize: "16px", lineHeight: "1.3", color: "hsl(215,19%,89%)" }}
          >
            {lead.name}
          </h3>
          <div className="flex items-center gap-2 text-xs" style={{ color: "hsl(215,16%,65%)" }}>
            <span>{lead.type}</span>
            <span>•</span>
            <span>{lead.nationality}</span>
          </div>
        </div>
        <div
          className="w-9 h-9 rounded flex items-center justify-center font-bold flex-shrink-0"
          style={{
            background: gradeColor.bg,
            color: gradeColor.text,
            border: `2px solid ${gradeColor.border}`,
            fontSize: "16px",
          }}
        >
          {lead.accessGrade}
        </div>
      </div>

      {/* Contact Chips */}
      {lead.contacts.length > 0 ? (
        <div className="flex flex-wrap gap-2 mb-3">
          {lead.contacts.includes("EMAIL") && (
            <div
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium"
              style={{
                background: "rgba(16, 185, 129, 0.1)",
                color: "#10B981",
                border: "1px solid rgba(16, 185, 129, 0.3)",
              }}
            >
              <Mail size={11} />
              EMAIL
            </div>
          )}
          {lead.contacts.includes("PHONE") && (
            <div
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium"
              style={{
                background: "rgba(16, 185, 129, 0.1)",
                color: "#10B981",
                border: "1px solid rgba(16, 185, 129, 0.3)",
              }}
            >
              <Phone size={11} />
              PHONE
            </div>
          )}
          {lead.contacts.includes("NETWORK") && (
            <div
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium"
              style={{
                background: "rgba(16, 185, 129, 0.1)",
                color: "#10B981",
                border: "1px solid rgba(16, 185, 129, 0.3)",
              }}
            >
              <Network size={11} />
              NETWORK
            </div>
          )}
        </div>
      ) : (
        <div className="mb-3">
          <div
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs"
            style={{
              background: "rgba(107, 114, 128, 0.1)",
              color: "#6B7280",
            }}
          >
            Registry trace only
          </div>
        </div>
      )}

      {/* Wealth Info */}
      <div className="text-xs pt-3 border-t" style={{ borderColor: "#2A3045", color: "hsl(215,16%,65%)" }}>
        {lead.wealthTier} · {lead.wealthAmount}
      </div>
    </div>
  );
}

export default function Mobile() {
  return (
    <div
      className="flex flex-col"
      style={{
        width: 390,
        minHeight: 844,
        background: "#0B0F19",
        fontFamily: "Inter, sans-serif",
        color: "hsl(215,19%,89%)",
      }}
    >
      {/* Operations Banner */}
      <div
        className="px-4 py-3 border-b"
        style={{
          background: "linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(11, 15, 25, 0) 100%)",
          borderColor: "#2A3045",
          boxShadow: "0 0 20px rgba(16, 185, 129, 0.1)",
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: "#10B981", boxShadow: "0 0 8px #10B981" }}
          />
          <span className="text-sm font-semibold" style={{ color: "#10B981" }}>
            RESEARCH ACTIVE: 3
          </span>
        </div>
        <div className="text-xs" style={{ color: "hsl(215,16%,65%)" }}>
          FAA Registry · Enrichment · Embeddings
        </div>
      </div>

      {/* Stats Row - Horizontal Scroll */}
      <div
        className="px-4 py-4 border-b overflow-x-auto"
        style={{ borderColor: "#2A3045" }}
      >
        <div className="flex gap-4 w-max">
          <div
            className="px-4 py-3 rounded"
            style={{ background: "#141824", minWidth: "110px" }}
          >
            <div className="text-2xl font-bold mb-1">183</div>
            <div className="text-xs" style={{ color: "hsl(215,16%,65%)" }}>
              Reachable
            </div>
          </div>
          <div
            className="px-4 py-3 rounded"
            style={{ background: "#141824", minWidth: "110px" }}
          >
            <div className="text-2xl font-bold mb-1">3</div>
            <div className="text-xs" style={{ color: "hsl(215,16%,65%)" }}>
              Active Jobs
            </div>
          </div>
          <div
            className="px-4 py-3 rounded"
            style={{ background: "#141824", minWidth: "110px" }}
          >
            <div className="text-2xl font-bold mb-1">32k</div>
            <div className="text-xs" style={{ color: "hsl(215,16%,65%)" }}>
              Profiles
            </div>
          </div>
          <div
            className="px-4 py-3 rounded"
            style={{ background: "#141824", minWidth: "110px" }}
          >
            <div className="text-2xl font-bold mb-1">0.5%</div>
            <div className="text-xs" style={{ color: "hsl(215,16%,65%)" }}>
              Coverage
            </div>
          </div>
        </div>
      </div>

      {/* Section Header */}
      <div className="px-4 py-4 flex items-center justify-between border-b" style={{ borderColor: "#2A3045" }}>
        <h2 className="text-base font-semibold">Priority Contacts</h2>
        <button
          className="text-sm font-medium flex items-center gap-1"
          style={{ color: "#10B981" }}
        >
          All
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Contact Cards */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {LEADS.map((lead) => (
          <LeadCard key={lead.id} lead={lead} />
        ))}
      </div>
    </div>
  );
}
