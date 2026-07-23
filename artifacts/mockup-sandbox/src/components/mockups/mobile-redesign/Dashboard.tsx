import React from "react";
import { 
  Crosshair, 
  Bell, 
  Menu, 
  Home, 
  Search, 
  Users, 
  Network, 
  MoreHorizontal,
  Mail,
  Linkedin,
  Phone,
  ChevronRight,
  Target
} from "lucide-react";

export default function MobileDashboard() {
  return (
    <div className="dark">
      <div 
        className="min-h-screen bg-[#0B0F19] text-[#F1F5F9] font-sans pb-[60px] relative overflow-hidden"
        style={{ fontFamily: "Inter, sans-serif" }}
      >
        {/* Header Bar */}
        <header className="flex items-center justify-between h-[56px] px-4 border-b border-[#2A3045] bg-[#0B0F19]">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-[#10B981]" />
            <span 
              className="text-[#F1F5F9] font-bold text-[13px] tracking-widest"
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              APEX ATLAS
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-[#64748B] hover:text-[#F1F5F9]">
              <Bell className="w-5 h-5" />
            </button>
            <button className="text-[#64748B] hover:text-[#F1F5F9]">
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Activity Strip */}
        <div className="h-[48px] px-4 flex items-center overflow-x-auto hide-scrollbar gap-2 border-b border-[#2A3045]">
          <div className="flex-shrink-0 flex items-center h-[28px] bg-[#141824] border border-[#2A3045] rounded-[4px] px-3 relative overflow-hidden">
            <div className="absolute top-0 left-0 bottom-0 bg-[#10B981]/10 w-[73%]" />
            <div className="absolute top-0 left-0 bottom-0 border-b-2 border-[#10B981] w-[73%]" />
            <span className="text-[11px] text-[#F1F5F9] relative z-10 font-medium" style={{ fontFamily: "'Space Mono', monospace" }}>
              FAA Scan <span className="text-[#64748B] mx-1">·</span> <span className="text-[#10B981]">73%</span>
            </span>
          </div>
          
          <div className="flex-shrink-0 flex items-center h-[28px] bg-[#141824] border border-[#2A3045] rounded-[4px] px-3 relative overflow-hidden">
            <div className="absolute top-0 left-0 bottom-0 bg-[#3B82F6]/10 w-[42%]" />
            <div className="absolute top-0 left-0 bottom-0 border-b-2 border-[#3B82F6] w-[42%]" />
            <span className="text-[11px] text-[#F1F5F9] relative z-10 font-medium" style={{ fontFamily: "'Space Mono', monospace" }}>
              Corp Registry <span className="text-[#64748B] mx-1">·</span> <span className="text-[#3B82F6]">42%</span>
            </span>
          </div>
        </div>

        {/* Content */}
        <main className="p-4 flex flex-col gap-4">
          
          {/* Section Heading */}
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-[#64748B] text-[13px] font-semibold uppercase tracking-wide">
              Best Next Contacts
            </h2>
            <button className="text-[#10B981] text-[13px] font-medium flex items-center">
              View all <ChevronRight className="w-4 h-4 ml-0.5" />
            </button>
          </div>

          {/* Cards */}
          <div className="flex flex-col gap-2">
            
            {/* Card 1 */}
            <div className="bg-[#141824] border border-[#2A3045] rounded-[4px] p-4 flex flex-col gap-3">
              {/* Row 1 */}
              <div className="flex items-center justify-between">
                <h3 className="text-[#F1F5F9] text-[16px] font-semibold">James Whitmore</h3>
                <div className="bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20 px-2 py-0.5 rounded flex items-center gap-1">
                  <span className="text-[10px] font-bold" style={{ fontFamily: "'Space Mono', monospace" }}>A</span>
                  <span className="text-[10px]" style={{ fontFamily: "'Space Mono', monospace" }}>0.91</span>
                </div>
              </div>
              
              {/* Row 2 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#10B981]" />
                  <span className="text-[11px] text-[#64748B]" style={{ fontFamily: "'Space Mono', monospace" }}>HNWI</span>
                </div>
                <div className="flex items-center gap-0.5 text-[#10B981]">
                  <div className="w-2 h-2 rounded-full bg-[#10B981]"></div>
                  <div className="w-2 h-2 rounded-full bg-[#10B981]"></div>
                  <div className="w-2 h-2 rounded-full bg-[#10B981]"></div>
                  <div className="w-2 h-2 rounded-full bg-[#10B981]"></div>
                  <div className="w-2 h-2 rounded-full border border-[#10B981] bg-transparent"></div>
                </div>
              </div>

              {/* Row 3 */}
              <div className="flex items-center gap-2">
                <div className="bg-[#10B981]/10 text-[#10B981] rounded px-2 py-1 flex items-center gap-1 border border-[#10B981]/20">
                  <Mail className="w-3 h-3" />
                  <span className="text-[11px]" style={{ fontFamily: "'Space Mono', monospace" }}>Email</span>
                </div>
                <div className="bg-[#10B981]/10 text-[#10B981] rounded px-2 py-1 flex items-center gap-1 border border-[#10B981]/20">
                  <Linkedin className="w-3 h-3" />
                  <span className="text-[11px]" style={{ fontFamily: "'Space Mono', monospace" }}>LinkedIn</span>
                </div>
              </div>

              {/* Row 4 */}
              <div className="flex items-center justify-between mt-1">
                <span className="text-[#64748B] text-[12px] italic">High public contact evidence · 4 assets</span>
                <button className="w-8 h-8 rounded-[4px] bg-[#10B981]/10 hover:bg-[#10B981]/20 border border-[#10B981]/30 flex items-center justify-center text-[#10B981]">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-[#141824] border border-[#2A3045] rounded-[4px] p-4 flex flex-col gap-3">
              {/* Row 1 */}
              <div className="flex items-center justify-between">
                <h3 className="text-[#F1F5F9] text-[16px] font-semibold">Victoria Chen</h3>
                <div className="bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20 px-2 py-0.5 rounded flex items-center gap-1">
                  <span className="text-[10px] font-bold" style={{ fontFamily: "'Space Mono', monospace" }}>A</span>
                  <span className="text-[10px]" style={{ fontFamily: "'Space Mono', monospace" }}>0.76</span>
                </div>
              </div>
              
              {/* Row 2 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#3B82F6]" />
                  <span className="text-[11px] text-[#64748B]" style={{ fontFamily: "'Space Mono', monospace" }}>Corporation</span>
                </div>
                <div className="flex items-center gap-0.5 text-[#3B82F6]">
                  <div className="w-2 h-2 rounded-full bg-[#3B82F6]"></div>
                  <div className="w-2 h-2 rounded-full bg-[#3B82F6]"></div>
                  <div className="w-2 h-2 rounded-full bg-[#3B82F6]"></div>
                  <div className="w-2 h-2 rounded-full border border-[#3B82F6] bg-transparent"></div>
                  <div className="w-2 h-2 rounded-full border border-[#3B82F6] bg-transparent"></div>
                </div>
              </div>

              {/* Row 3 */}
              <div className="flex items-center gap-2">
                <div className="bg-[#10B981]/10 text-[#10B981] rounded px-2 py-1 flex items-center gap-1 border border-[#10B981]/20">
                  <Mail className="w-3 h-3" />
                  <span className="text-[11px]" style={{ fontFamily: "'Space Mono', monospace" }}>Email</span>
                </div>
              </div>

              {/* Row 4 */}
              <div className="flex items-center justify-between mt-1">
                <span className="text-[#64748B] text-[12px] italic">Direct board affiliation · 1 asset</span>
                <button className="w-8 h-8 rounded-[4px] bg-[#10B981]/10 hover:bg-[#10B981]/20 border border-[#10B981]/30 flex items-center justify-center text-[#10B981]">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-[#141824] border border-[#2A3045] rounded-[4px] p-4 flex flex-col gap-3">
              {/* Row 1 */}
              <div className="flex items-center justify-between">
                <h3 className="text-[#F1F5F9] text-[16px] font-semibold">Sheikh H. Al-Rashid</h3>
                <div className="bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20 px-2 py-0.5 rounded flex items-center gap-1">
                  <span className="text-[10px] font-bold" style={{ fontFamily: "'Space Mono', monospace" }}>A</span>
                  <span className="text-[10px]" style={{ fontFamily: "'Space Mono', monospace" }}>0.68</span>
                </div>
              </div>
              
              {/* Row 2 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#10B981]" />
                  <span className="text-[11px] text-[#64748B]" style={{ fontFamily: "'Space Mono', monospace" }}>HNWI</span>
                </div>
                <div className="flex items-center gap-0.5 text-[#10B981]">
                  <div className="w-2 h-2 rounded-full bg-[#10B981]"></div>
                  <div className="w-2 h-2 rounded-full bg-[#10B981]"></div>
                  <div className="w-2 h-2 rounded-full border border-[#10B981] bg-transparent"></div>
                  <div className="w-2 h-2 rounded-full border border-[#10B981] bg-transparent"></div>
                  <div className="w-2 h-2 rounded-full border border-[#10B981] bg-transparent"></div>
                </div>
              </div>

              {/* Row 3 */}
              <div className="flex items-center gap-2">
                <div className="bg-[#10B981]/10 text-[#10B981] rounded px-2 py-1 flex items-center gap-1 border border-[#10B981]/20">
                  <Phone className="w-3 h-3" />
                  <span className="text-[11px]" style={{ fontFamily: "'Space Mono', monospace" }}>Phone</span>
                </div>
              </div>

              {/* Row 4 */}
              <div className="flex items-center justify-between mt-1">
                <span className="text-[#64748B] text-[12px] italic">Verified phone record · 12 assets</span>
                <button className="w-8 h-8 rounded-[4px] bg-[#10B981]/10 hover:bg-[#10B981]/20 border border-[#10B981]/30 flex items-center justify-center text-[#10B981]">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

          </div>
          
        </main>

        {/* Stats Strip */}
        <div className="h-[60px] bg-[#141824] border-t border-[#2A3045] flex mt-4">
          <div className="flex-1 flex flex-col items-center justify-center border-r border-[#2A3045]/50">
            <span className="text-[#10B981] text-[15px]" style={{ fontFamily: "'Space Mono', monospace" }}>1,492</span>
            <span className="text-[#64748B] text-[9px] uppercase tracking-wider font-semibold mt-0.5">Entities</span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center border-r border-[#2A3045]/50">
            <span className="text-[#10B981] text-[15px]" style={{ fontFamily: "'Space Mono', monospace" }}>8,034</span>
            <span className="text-[#64748B] text-[9px] uppercase tracking-wider font-semibold mt-0.5">Assets</span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center border-r border-[#2A3045]/50">
            <span className="text-[#10B981] text-[15px]" style={{ fontFamily: "'Space Mono', monospace" }}>24</span>
            <span className="text-[#64748B] text-[9px] uppercase tracking-wider font-semibold mt-0.5">Hot Leads</span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center">
            <span className="text-[#10B981] text-[15px]" style={{ fontFamily: "'Space Mono', monospace" }}>0.62</span>
            <span className="text-[#64748B] text-[9px] uppercase tracking-wider font-semibold mt-0.5">Avg Access</span>
          </div>
        </div>
        
        {/* Empty space for scrolling above nav */}
        <div className="h-[20px]" />

        {/* Bottom Nav Bar */}
        <div className="fixed bottom-0 w-full h-[60px] bg-[#0F1525] border-t border-[#2A3045] flex items-center justify-between px-2 z-50">
          <button className="flex-1 flex flex-col items-center justify-center gap-1 h-full text-[#10B981]">
            <Home className="w-5 h-5" />
            <span className="text-[9px] font-medium">Home</span>
          </button>
          <button className="flex-1 flex flex-col items-center justify-center gap-1 h-full text-[#64748B] hover:text-[#F1F5F9]">
            <Search className="w-5 h-5" />
            <span className="text-[9px] font-medium">Search</span>
          </button>
          <button className="flex-1 flex flex-col items-center justify-center gap-1 h-full text-[#64748B] hover:text-[#F1F5F9]">
            <Users className="w-5 h-5" />
            <span className="text-[9px] font-medium">Profiles</span>
          </button>
          <button className="flex-1 flex flex-col items-center justify-center gap-1 h-full text-[#64748B] hover:text-[#F1F5F9]">
            <Network className="w-5 h-5" />
            <span className="text-[9px] font-medium">Graph</span>
          </button>
          <button className="flex-1 flex flex-col items-center justify-center gap-1 h-full text-[#64748B] hover:text-[#F1F5F9]">
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[9px] font-medium">More</span>
          </button>
        </div>

        {/* CSS for hiding scrollbar */}
        <style dangerouslySetInnerHTML={{__html: `
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}} />
      </div>
    </div>
  );
}
