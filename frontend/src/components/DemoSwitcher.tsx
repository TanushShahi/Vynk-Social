import React, { useState } from 'react';
import { Users, LogOut, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

export const DemoSwitcher: React.FC = () => {
  const { user, demoLogin, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const demoUsers = [
    { id: 'user_tanush_01', name: 'Tanush', uid: 'vynk.t7x4k9' },
    { id: 'user_aarav_02', name: 'Aarav Sharma', uid: 'vynk.a8k2m1' },
    { id: 'user_riya_03', name: 'Riya Mehta', uid: 'vynk.r3m9p2' },
    { id: 'user_arjun_04', name: 'Arjun Verma', uid: 'vynk.a1k8z7' },
    { id: 'user_sneha_05', name: 'Sneha Kapoor', uid: 'vynk.s6p4n9' },
  ];

  return (
    <div className="fixed top-3 right-3 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-2.5 py-1.5 rounded-full bg-purple-950/80 hover:bg-purple-900 border border-purple-500/30 text-[11px] font-bold text-purple-200 backdrop-blur-md shadow-glow-sm flex items-center gap-1.5 transition-all"
      >
        <Users size={13} className="text-purple-400" />
        <span>{user ? user.name.split(' ')[0] : 'Demo Users'}</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-10 z-50 w-52 rounded-2xl glass-panel p-2 shadow-2xl border border-purple-500/25 animate-in fade-in zoom-in-95">
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-purple-300">
              Switch Demo User
            </div>
            <div className="space-y-1 my-1">
              {demoUsers.map((u) => {
                const isCurrent = user?.id === u.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => {
                      demoLogin(u.id);
                      setIsOpen(false);
                    }}
                    className={`w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition-colors ${
                      isCurrent
                        ? 'bg-purple-600/30 text-white border border-purple-400/30'
                        : 'text-slate-300 hover:bg-white/[0.08] hover:text-white'
                    }`}
                  >
                    <div>
                      <div className="font-bold">{u.name}</div>
                      <div className="text-[10px] text-slate-400">@{u.uid}</div>
                    </div>
                    {isCurrent && <Check size={14} className="text-cyan-400" />}
                  </button>
                );
              })}
            </div>

            {user && (
              <div className="border-t border-white/10 pt-1 mt-1">
                <button
                  onClick={() => {
                    logout();
                    setIsOpen(false);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-semibold text-rose-400 hover:bg-rose-500/10 flex items-center gap-2"
                >
                  <LogOut size={13} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
