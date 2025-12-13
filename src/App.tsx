import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { TrackerEntry } from './features/tracker/TrackerEntry';
import { TrackerAnalytics } from './features/tracker/TrackerAnalytics';
import { TrackerData } from './features/tracker/TrackerData';
import { IncentiveView } from './features/incentive/IncentiveView';
import { SettingsView } from './features/settings/SettingsView';
import { useAppStore } from './store/useAppStore';
import { Lock } from 'lucide-react';
import { App as CapApp } from '@capacitor/app';

function App() {
  const [tab, setTab] = useState<'tracker' | 'incentive' | 'settings'>('tracker');
  const [subTab, setSubTab] = useState<'entry'|'report'|'data'>('entry'); // Tracker subtabs
  const [locked, setLocked] = useState(true);
  const [pinInput, setPinInput] = useState('');
  const { pin } = useAppStore();

  useEffect(() => {
    // Handle Android Back Button
    CapApp.addListener('backButton', ({ canGoBack }) => {
       if(!canGoBack) CapApp.exitApp();
    });
  }, []);

  const handleUnlock = (val: string) => {
     setPinInput(val);
     if(val === pin) {
         setLocked(false);
         setPinInput('');
     } else if (val.length >= 4) {
         setTimeout(() => setPinInput(''), 500); // Clear on fail
     }
  };

  if (locked) {
      return (
          <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl w-full max-w-sm text-center">
                  <div className="mb-6 text-indigo-500 flex justify-center"><Lock size={48} /></div>
                  <h2 className="text-2xl font-bold mb-2 dark:text-white">Security Check</h2>
                  <p className="text-slate-500 text-sm mb-6">Enter your 4-digit PIN to access.</p>

                  <div className="flex justify-center gap-3 mb-6">
                      {[0,1,2,3].map(i => (
                          <div key={i} className="w-12 h-14 border-2 rounded-xl flex items-center justify-center text-2xl font-bold bg-slate-50 dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                              {pinInput[i] ? '•' : ''}
                          </div>
                      ))}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                      {[1,2,3,4,5,6,7,8,9].map(n => (
                          <button key={n} onClick={() => handleUnlock(pinInput + n)} className="p-4 rounded-xl bg-slate-100 dark:bg-slate-700 font-bold text-xl dark:text-white active:bg-indigo-100 dark:active:bg-indigo-900 transition">{n}</button>
                      ))}
                      <button onClick={() => setPinInput(prev => prev.slice(0,-1))} className="col-start-2 p-4 rounded-xl bg-slate-100 dark:bg-slate-700 font-bold dark:text-white flex items-center justify-center active:bg-red-100 dark:active:bg-red-900/30 text-xs">DEL</button>
                      <button onClick={() => handleUnlock(pinInput + '0')} className="p-4 rounded-xl bg-slate-100 dark:bg-slate-700 font-bold text-xl dark:text-white active:bg-indigo-100 dark:active:bg-indigo-900 transition">0</button>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <Layout activeTab={tab} onTabChange={setTab}>
       {tab === 'tracker' && (
           <>
              {/* Tracker Sub Nav */}
              <div className="fixed top-20 left-1/2 -translate-x-1/2 z-30 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-full p-1 flex gap-1 shadow-lg">
                  <button onClick={() => setSubTab('entry')} className={`px-4 py-2 rounded-full text-xs font-bold transition ${subTab==='entry'?'bg-slate-900 text-white dark:bg-white dark:text-slate-900':'text-slate-500'}`}>Entry</button>
                  <button onClick={() => setSubTab('report')} className={`px-4 py-2 rounded-full text-xs font-bold transition ${subTab==='report'?'bg-slate-900 text-white dark:bg-white dark:text-slate-900':'text-slate-500'}`}>Analytics</button>
                  <button onClick={() => setSubTab('data')} className={`px-4 py-2 rounded-full text-xs font-bold transition ${subTab==='data'?'bg-slate-900 text-white dark:bg-white dark:text-slate-900':'text-slate-500'}`}>Data</button>
              </div>
              <div className="pt-12">
                  {subTab === 'entry' && <TrackerEntry />}
                  {subTab === 'report' && <TrackerAnalytics />}
                  {subTab === 'data' && <TrackerData />}
              </div>
           </>
       )}
       {tab === 'incentive' && <IncentiveView />}
       {tab === 'settings' && <SettingsView />}
    </Layout>
  );
}

export default App;
