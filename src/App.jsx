import React, { useState } from 'react';
import { useAppStore } from './store/useAppStore';
import { Moon, Sun, BarChart2, Calculator, Folder, User } from 'lucide-react';
import Tracker from './pages/Tracker';
import Analytics from './pages/Analytics';
import Incentive from './pages/Incentive';
import Settings from './pages/Settings';

const App = () => {
  const { theme, setTheme, pin, profile } = useAppStore();
  const [view, setView] = useState('tracker');
  const [locked, setLocked] = useState(true);
  const [pinInput, setPinInput] = useState(['', '', '', '']);

  // Theme Effect
  React.useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme]);

  // Lock Logic
  const handlePin = (idx, val) => {
    if (val.length > 1) return;
    const newPin = [...pinInput];
    newPin[idx] = val;
    setPinInput(newPin);

    // Auto focus next
    if (val && idx < 3) document.getElementById(`pin-${idx+1}`).focus();

    // Check
    if (idx === 3 && val) {
       if (newPin.join('') === pin) {
           setLocked(false);
       } else {
           // Simple shake or clear
           setTimeout(() => setPinInput(['','','','']), 300);
       }
    }
  };

  const NavBtn = ({ target, icon: Icon, label }) => (
      <button onClick={() => setView(target)} className={`flex flex-col items-center p-2 rounded-xl transition ${view === target ? 'text-indigo-600' : 'text-slate-400'}`}>
          <Icon size={20} />
          <span className="text-[10px] font-bold mt-1">{label}</span>
      </button>
  );

  if (locked) {
      return (
        <div className="fixed inset-0 z-[60] bg-slate-900 flex flex-col items-center justify-center p-4 transition-opacity duration-300">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl w-full max-w-sm text-center">
                <div className="mb-4 text-center">
                    <h1 className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mb-1">Shubtrckr</h1>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sales & Analytics Tool</p>
                </div>
                <div className="mb-6 text-indigo-500 flex justify-center"><LockIcon size={48} /></div>
                <h2 className="text-2xl font-bold mb-2 dark:text-white">Security Check</h2>
                <p className="text-slate-500 text-sm mb-6">Enter your 4-digit PIN to access.</p>
                <div className="flex justify-center gap-3 mb-6">
                    {pinInput.map((p, i) => (
                        <input key={i} id={`pin-${i}`} type="password" maxLength="1" value={p} onChange={(e)=>handlePin(i, e.target.value)} className="w-12 h-14 border-2 rounded-xl text-center text-2xl font-bold bg-slate-50 dark:bg-slate-700 dark:border-slate-600 focus:border-indigo-500 outline-none transition dark:text-white" />
                    ))}
                </div>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex flex-col max-w-xl mx-auto border-x border-slate-200 dark:border-slate-800 shadow-2xl relative">
        {/* Header */}
        <header className="sticky top-0 z-40 glass border-b border-slate-100 dark:border-slate-800 px-4 py-3 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 dark:shadow-none">
                    <span className="font-bold text-lg">S</span>
                </div>
                <div>
                    <h1 className="font-bold text-sm leading-none dark:text-white">{profile?.outlet || 'SEC Unified'}</h1>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{profile?.name || 'Enterprise v2.0'}</p>
                </div>
            </div>
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                {theme === 'dark' ? <Sun size={20}/> : <Moon size={20}/>}
            </button>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
            {view === 'tracker' && <Tracker />}
            {view === 'analytics' && <Analytics />}
            {view === 'incentive' && <Incentive />}
            {view === 'settings' && <Settings />}
        </main>

        {/* Bottom Nav */}
        <nav className="fixed bottom-0 w-full max-w-xl glass border-t border-slate-200 dark:border-slate-800 z-50 pb-safe">
            <div className="flex justify-around p-2">
                <NavBtn target="tracker" icon={BarChart2} label="Tracker" />
                <NavBtn target="analytics" icon={(props)=><BarChart2 {...props} className="rotate-90"/>} label="Analytics" />
                <NavBtn target="incentive" icon={Calculator} label="Incentive" />
                <NavBtn target="settings" icon={User} label="Profile" />
            </div>
        </nav>
    </div>
  );
};

const LockIcon = ({size}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
);

export default App;
