import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  Layers,
  Disc,
  Sliders,
  Settings,
  Terminal,
  Info,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  hotkey: string;
  badge?: string;
}

const navItems: NavItem[] = [
  { to: '/', label: 'Overview', icon: Home, hotkey: 'H' },
  { to: '/studio', label: '3D Studio', icon: Layers, hotkey: 'S', badge: 'LIVE' },
  { to: '/drums', label: 'Drum Kit 3D', icon: Disc, hotkey: 'D' },
  { to: '/calibrate', label: 'Calibrate', icon: Sliders, hotkey: 'C' },
  { to: '/settings', label: 'Settings', icon: Settings, hotkey: 'E' },
  { to: '/logs', label: 'Audit Logs', icon: Terminal, hotkey: 'L' },
  { to: '/about', label: 'System Info', icon: Info, hotkey: 'A' },
];

export const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside
      className={`h-full bg-[#0c0e14]/95 backdrop-blur-xl border-r border-studio-border transition-all duration-300 flex flex-col justify-between shrink-0 select-none z-30 ${
        collapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* Top Console Branding & Collapse */}
      <div className="flex flex-col">
        <div className="h-16 flex items-center justify-between px-3 border-b border-studio-border">
          {!collapsed && (
            <div className="flex items-center gap-2 overflow-hidden px-1">
              <div className="w-7 h-7 rounded-lg bg-studio-gold/20 border border-studio-gold/40 flex items-center justify-center text-studio-gold font-mono font-bold shadow-glowGold">
                <Sparkles className="w-4 h-4 text-studio-gold" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-mono font-black text-studio-cream tracking-wider">
                  DRUM GLOVE
                </span>
                <span className="text-[9px] font-mono text-studio-gold tracking-tighter">
                  STUDIO WORKSTATION
                </span>
              </div>
            </div>
          )}

          {collapsed && (
            <div className="mx-auto w-8 h-8 rounded-lg bg-studio-gold/20 border border-studio-gold/40 flex items-center justify-center text-studio-gold shadow-glowGold">
              <Sparkles className="w-4 h-4 text-studio-gold" />
            </div>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg text-studio-creamMuted hover:text-white hover:bg-studio-surface transition-colors ml-auto"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="p-2 flex flex-col gap-1.5 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={`${item.label} [${item.hotkey}]`}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-mono text-xs transition-all relative group ${
                  isActive
                    ? 'bg-studio-gold/15 border border-studio-gold/40 text-studio-gold shadow-glowGold font-bold'
                    : 'text-studio-creamMuted hover:text-studio-cream hover:bg-studio-surface border border-transparent'
                } ${collapsed ? 'justify-center px-2' : ''}`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-studio-gold' : 'text-studio-creamMuted group-hover:text-studio-cream'
                  }`}
                />

                {!collapsed && (
                  <div className="flex items-center justify-between flex-1 overflow-hidden">
                    <span className="truncate">{item.label}</span>
                    <div className="flex items-center gap-1.5 ml-2">
                      {item.badge && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-studio-gold/20 border border-studio-gold/40 text-studio-gold font-bold">
                          {item.badge}
                        </span>
                      )}
                      <span className="text-[10px] text-studio-creamMuted/60 border border-studio-border rounded px-1 font-mono">
                        {item.hotkey}
                      </span>
                    </div>
                  </div>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom Rack Metric Footer */}
      <div className="p-3 border-t border-studio-border">
        {!collapsed ? (
          <div className="bg-[#090b10] rounded-xl p-2.5 border border-studio-border flex flex-col gap-1.5 text-[10px] font-mono text-studio-creamMuted shadow-proInset">
            <div className="flex justify-between items-center">
              <span>MIDI CH:</span>
              <span className="text-studio-gold font-bold">GM CH 10</span>
            </div>
            <div className="flex justify-between items-center">
              <span>TELEMETRY:</span>
              <span className="text-studio-green font-bold">α = 0.98 IMU</span>
            </div>
            <div className="flex justify-between items-center">
              <span>BAUD / UDP:</span>
              <span className="text-studio-cream font-bold">115200 / 5005</span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center text-studio-creamMuted text-[10px] font-mono">
            PRO
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
