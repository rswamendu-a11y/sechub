import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { Download, Trash2, User, Lock } from 'lucide-react';

const Settings = () => {
  const { profile, setProfile, pin, setPin, sales, wipeData } = useAppStore();

  const handleBackup = () => {
    // Export Sales, Profile, Config (No binaries)
    const backup = {
        sales: sales,
        profile: profile,
        timestamp: new Date().toISOString(),
        version: "1.0"
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SEC_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const handleWipe = () => {
    if(confirm("CRITICAL WARNING: This will factory reset the app. All data will be lost. Continue?")) {
        if(confirm("Are you absolutely sure?")) {
            wipeData();
            alert("App Reset.");
        }
    }
  };

  return (
    <div className="fade-in space-y-6 pb-24 p-4">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 className="font-bold mb-4 dark:text-white flex items-center gap-2"><User size={20}/> Profile</h3>
            <input
                placeholder="Name"
                value={profile.name}
                onChange={(e) => setProfile({...profile, name: e.target.value})}
                className="w-full p-3 mb-3 bg-slate-50 dark:bg-slate-700 dark:text-white rounded-xl"
            />
            <input
                placeholder="Outlet"
                value={profile.outlet}
                onChange={(e) => setProfile({...profile, outlet: e.target.value})}
                className="w-full p-3 bg-slate-50 dark:bg-slate-700 dark:text-white rounded-xl"
            />
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 className="font-bold mb-4 dark:text-white flex items-center gap-2"><Lock size={20}/> Security</h3>
            <label className="text-xs font-bold text-slate-400">Change PIN</label>
            <input
                value={pin}
                maxLength="4"
                onChange={(e) => setPin(e.target.value)}
                className="w-full p-3 bg-slate-50 dark:bg-slate-700 dark:text-white rounded-xl mt-1 tracking-widest font-bold"
            />
        </div>

        <div className="bg-slate-800 rounded-3xl p-8 text-white shadow-xl">
             <h3 className="font-bold mb-4">Data Management</h3>
             <button onClick={handleBackup} className="w-full bg-white/10 hover:bg-white/20 p-4 rounded-xl flex items-center gap-3 mb-3 transition">
                 <Download size={20} className="text-emerald-400"/>
                 <div className="text-left">
                     <div className="font-bold">Master Backup</div>
                     <div className="text-xs text-slate-400">Download JSON (Sales & Settings)</div>
                 </div>
             </button>

             <button onClick={handleWipe} className="w-full bg-red-500/20 hover:bg-red-500/30 p-4 rounded-xl flex items-center gap-3 border border-red-500/50 transition">
                 <Trash2 size={20} className="text-red-400"/>
                 <div className="text-left">
                     <div className="font-bold text-red-200">Master Clear</div>
                     <div className="text-xs text-red-300">Factory Reset App</div>
                 </div>
             </button>
        </div>
    </div>
  );
};

export default Settings;
