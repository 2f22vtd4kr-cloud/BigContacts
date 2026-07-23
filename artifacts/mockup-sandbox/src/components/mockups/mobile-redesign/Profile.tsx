import React, { useState } from 'react';
import { 
  ChevronLeft, 
  Share2, 
  Mail, 
  Linkedin, 
  Phone, 
  Plane, 
  Building2, 
  Crosshair, 
  KanbanSquare, 
  Network, 
  CheckCircle2
} from 'lucide-react';

export default function Profile() {
  const [activeTab, setActiveTab] = useState('Overview');

  return (
    <div className="dark">
      <div className="min-h-screen bg-[#0B0F19] text-[#F1F5F9] font-sans selection:bg-[#10B981]/30">
        <div className="max-w-[390px] mx-auto h-[100dvh] flex flex-col bg-[#0B0F19] border-x border-[#2A3045]/30 relative">
          
          {/* Navigation Bar */}
          <div className="h-[52px] shrink-0 bg-[#141824] border-b border-[#2A3045] flex items-center justify-between px-4 z-20">
            <button className="p-2 -ml-2 text-[#F1F5F9] active:bg-[#2A3045] rounded-full transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="font-mono text-[13px] uppercase text-[#64748B] tracking-wider">Profile</span>
            <button className="p-2 -mr-2 text-[#64748B] active:bg-[#2A3045] rounded-full transition-colors">
              <Share2 className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden pb-4">
            
            {/* Hero Section */}
            <div className="bg-[#141824] px-4 pt-5 pb-4 border-b border-[#2A3045]">
              <div className="flex justify-between items-center mb-3">
                <span className="bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20 px-2 py-0.5 rounded text-xs font-semibold tracking-wide">
                  HNWI
                </span>
                <span className="flex items-center gap-1 bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20 px-2 py-0.5 rounded text-xs font-bold tracking-wide">
                  <span>🔥</span> HOT
                </span>
              </div>
              
              <h1 className="text-[22px] font-bold text-[#F1F5F9] leading-tight mb-1">
                James Whitmore
              </h1>
              <div className="text-[13px] text-[#64748B] flex items-center gap-1.5">
                <span>🇺🇸</span> United States · Texas
              </div>

              {/* Score Row */}
              <div className="mt-4 flex gap-3">
                <div className="flex-1 bg-[#0B0F19] rounded p-2.5 flex flex-col border border-[#2A3045]/50 shadow-inner">
                  <span className="font-mono text-[9px] text-[#64748B] uppercase tracking-wider mb-1">Access</span>
                  <span className="font-mono text-[20px] text-[#10B981] font-bold leading-none mb-1">0.91</span>
                  <span className="text-[9px] text-[#64748B]">Highly Reachable</span>
                </div>
                <div className="flex-1 bg-[#0B0F19] rounded p-2.5 flex flex-col border border-[#2A3045]/50 shadow-inner">
                  <span className="font-mono text-[9px] text-[#64748B] uppercase tracking-wider mb-1">Wealth</span>
                  <div className="flex gap-1 mb-2 mt-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#2A3045]" />
                  </div>
                  <span className="text-[9px] text-[#64748B]">Strong Signal</span>
                </div>
              </div>
            </div>

            {/* Contact Evidence Row */}
            <div className="px-4 py-3 bg-[#0B0F19] flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden snap-x">
              <button className="shrink-0 snap-start bg-[#022C22] text-[#34D399] border border-[#065F46] rounded flex items-center gap-1.5 px-2.5 py-1.5 font-mono text-[12px] active:bg-[#064E3B] transition-colors">
                <Mail className="w-3.5 h-3.5" />
                <span className="max-w-[120px] truncate">james@whitmore.com</span>
              </button>
              <button className="shrink-0 snap-start bg-[#172554] text-[#60A5FA] border border-[#1E40AF] rounded flex items-center gap-1.5 px-2.5 py-1.5 font-mono text-[12px] active:bg-[#1E3A8A] transition-colors">
                <Linkedin className="w-3.5 h-3.5" />
                <span>LinkedIn</span>
              </button>
              <div className="shrink-0 snap-start bg-[#64748B]/10 text-[#64748B] border border-[#64748B]/20 rounded flex items-center gap-1.5 px-2.5 py-1.5 font-mono text-[12px]">
                <Phone className="w-3.5 h-3.5" />
                <span>Available</span>
              </div>
            </div>

            {/* Horizontal Tab Bar */}
            <div className="h-[48px] bg-[#141824] border-b border-[#2A3045] flex overflow-x-auto [&::-webkit-scrollbar]:hidden px-2 sticky top-0 z-10 shadow-md">
              {['Overview', 'Assets (3)', 'Network (7)', 'Research', 'CRM'].map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <button 
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`shrink-0 px-3 flex items-center justify-center text-[13px] font-medium transition-colors relative ${isActive ? 'text-[#10B981]' : 'text-[#64748B]'}`}
                  >
                    {tab}
                    {isActive && (
                      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#10B981] shadow-[0_-2px_8px_rgba(16,185,129,0.4)]" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tab Content - Overview */}
            {activeTab === 'Overview' && (
              <div className="px-4 pt-4 pb-6 animate-in fade-in duration-300">
                <div className="grid grid-cols-2 gap-y-4 gap-x-4 mb-6">
                  <div>
                    <div className="font-mono text-[10px] uppercase text-[#64748B] mb-1">Net Worth</div>
                    <div className="text-[#F1F5F9] text-[14px] font-medium">$12.4M</div>
                  </div>
                  <div>
                    <div className="font-mono text-[10px] uppercase text-[#64748B] mb-1">Residences</div>
                    <div className="text-[#F1F5F9] text-[14px] font-medium">Texas, USA · London, UK</div>
                  </div>
                  <div className="col-span-2">
                    <div className="font-mono text-[10px] uppercase text-[#64748B] mb-2">Registry Sources</div>
                    <div className="flex gap-2">
                      <span className="bg-[#141824] border border-[#2A3045] rounded-md px-2 py-1.5 text-[11px] font-medium text-[#94A3B8]">FAA</span>
                      <span className="bg-[#141824] border border-[#2A3045] rounded-md px-2 py-1.5 text-[11px] font-medium text-[#94A3B8]">SEC EDGAR</span>
                    </div>
                  </div>
                  <div>
                    <div className="font-mono text-[10px] uppercase text-[#64748B] mb-1">Last Enriched</div>
                    <div className="text-[#F1F5F9] text-[14px] font-medium">2 hours ago</div>
                  </div>
                  <div>
                    <div className="font-mono text-[10px] uppercase text-[#64748B] mb-1">Contact Method</div>
                    <div className="text-[#F1F5F9] text-[14px] font-medium flex items-center gap-1.5">
                      Email <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-6 mb-3">
                  <h3 className="font-mono text-[12px] uppercase text-[#64748B] tracking-wider">Assets</h3>
                  <div className="h-px bg-[#2A3045] flex-1"></div>
                </div>
                
                <div className="flex flex-col gap-3">
                  <div className="bg-[#172554]/30 border border-[#1E40AF] rounded p-3 flex gap-3 items-start">
                    <div className="mt-0.5 bg-[#172554] p-2 rounded border border-[#1E40AF]/50 text-[#60A5FA]">
                      <Plane className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[#F1F5F9] text-[13px] font-medium mb-1">N829WX · Cessna Citation</div>
                      <div className="text-[#64748B] text-[11px] font-mono">Reg: 2018 · Valued ~$4.2M</div>
                    </div>
                  </div>
                  
                  <div className="bg-[#022C22]/30 border border-[#065F46] rounded p-3 flex gap-3 items-start">
                    <div className="mt-0.5 bg-[#022C22] p-2 rounded border border-[#065F46]/50 text-[#34D399]">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[#F1F5F9] text-[13px] font-medium mb-1">40 Park Ave, NYC</div>
                      <div className="text-[#64748B] text-[11px] font-mono">Purchased 2021 · Res</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab !== 'Overview' && (
              <div className="px-4 py-12 flex flex-col items-center justify-center text-center animate-in fade-in duration-300">
                <div className="w-12 h-12 bg-[#141824] rounded-full flex items-center justify-center border border-[#2A3045] mb-4">
                  <span className="text-[#64748B] font-mono text-[11px]">WIP</span>
                </div>
                <h3 className="text-[#F1F5F9] font-medium text-[15px] mb-1">{activeTab}</h3>
                <p className="text-[#64748B] text-[13px]">Content for this tab is coming soon.</p>
              </div>
            )}
          </div>

          {/* Sticky Bottom Action Bar */}
          <div className="h-[72px] shrink-0 bg-[#0F1525] border-t border-[#2A3045] px-4 flex items-center gap-3 z-20">
            <button className="flex-1 h-[44px] bg-[#10B981] active:bg-[#059669] text-[#0B0F19] rounded font-semibold text-[14px] flex items-center justify-center gap-2 transition-colors">
              <Crosshair className="w-4 h-4" />
              Research
            </button>
            <button className="flex-1 h-[44px] bg-[#141824] active:bg-[#1E293B] border border-[#2A3045] text-[#F1F5F9] rounded font-semibold text-[14px] flex items-center justify-center gap-2 transition-colors">
              <KanbanSquare className="w-4 h-4" />
              CRM
            </button>
            <button className="w-[44px] h-[44px] shrink-0 bg-[#141824] active:bg-[#1E293B] border border-[#2A3045] text-[#F1F5F9] rounded flex items-center justify-center transition-colors">
              <Network className="w-5 h-5" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
