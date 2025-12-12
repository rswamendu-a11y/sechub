import React from 'react';
import { BarChart2, Calculator, FolderLock, User, Moon, Sun } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: 'tracker' | 'incentive' | 'locker' | 'settings';
  onTabChange: (tab: any) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
  const { theme, setTheme } = useAppStore();
  const isDark = theme === 'dark';

  // Apply theme to html element
  React.useEffect(() => {
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDark]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex flex-col transition-colors duration-300">

      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-slate-100 dark:border-slate-800 px-4 py-3 pt-safe flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 dark:shadow-none">
            <span className="font-bold text-lg">S</span>
          </div>
          <div>
            <h1 className="font-bold text-sm leading-none dark:text-white">SEC Unified</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Enterprise v2.0</p>
          </div>
        </div>
        <button
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-24 p-4 max-w-xl mx-auto w-full relative">
        {children}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 w-full glass border-t border-slate-200 dark:border-slate-800 z-50 pb-safe">
        <div className="flex justify-around p-2 max-w-xl mx-auto">
          <NavBtn icon={BarChart2} label="Tracker" active={activeTab === 'tracker'} onClick={() => onTabChange('tracker')} />
          <NavBtn icon={Calculator} label="Incentive" active={activeTab === 'incentive'} onClick={() => onTabChange('incentive')} />
          <NavBtn icon={FolderLock} label="Locker" active={activeTab === 'locker'} onClick={() => onTabChange('locker')} />
          <NavBtn icon={User} label="Profile" active={activeTab === 'settings'} onClick={() => onTabChange('settings')} />
        </div>
      </nav>
    </div>
  );
};

const NavBtn: React.FC<{ icon: any, label: string, active: boolean, onClick: () => void }> = ({ icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center p-2 rounded-xl transition-colors ${active ? 'text-indigo-600' : 'text-slate-400'}`}
  >
    <Icon size={20} />
    <span className="text-[10px] font-bold mt-1">{label}</span>
  </button>
);
