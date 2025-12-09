import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Download, Trash2, User, Lock, Upload, Save } from 'lucide-react';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

const Settings = () => {
  const { profile, setProfile, pin, setPin, sales, wipeData, importData, incConfig } = useAppStore();

  // Local state for profile form to prevent auto-save
  const [localName, setLocalName] = useState('');
  const [localOutlet, setLocalOutlet] = useState('');
  const [localPin, setLocalPin] = useState('');

  // Sync on mount
  useEffect(() => {
      setLocalName(profile.name || '');
      setLocalOutlet(profile.outlet || '');
      setLocalPin(pin || '1234');
  }, [profile, pin]);

  const handleSaveProfile = () => {
      setProfile({ name: localName, outlet: localOutlet, code: profile.code || '' });
      setPin(localPin);
      alert("Profile Saved!");
  };

  const handleBackup = async () => {
    // Export Sales, Profile, Config (No binaries)
    const backup = {
        sales: sales,
        profile: profile,
        incConfig: incConfig,
        timestamp: new Date().toISOString(),
        version: "2.0"
    };

    const fileName = `SEC_Backup_${new Date().toISOString().split('T')[0]}_${Date.now()}.json`;
    const jsonStr = JSON.stringify(backup, null, 2);

    try {
        // Write to Cache
        await Filesystem.writeFile({
            path: fileName,
            data: jsonStr,
            directory: Directory.Cache,
            encoding: Encoding.UTF8
        });

        // Get URI
        const uriResult = await Filesystem.getUri({
             path: fileName,
             directory: Directory.Cache
        });

        // Share
        await Share.share({
            title: 'Backup Data',
            text: 'Here is your SEC Unified Backup',
            url: uriResult.uri,
            dialogTitle: 'Save Backup'
        });

    } catch (e) {
        console.error(e);
        // Fallback to old method if share fails (e.g. browser env)
        try {
            const blob = new Blob([jsonStr], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
        } catch(err) {
            alert("Export Failed: " + e.message);
        }
    }
  };

  const handleRestore = (e) => {
      const file = e.target.files[0];
      if(!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const data = JSON.parse(event.target.result);

              if(!confirm("Restore Data from Backup?")) return;

              const replace = confirm("Do you want to COMPLETELY REPLACE existing data?\n\nClick OK to REPLACE (Wipe current data).\nClick CANCEL to MERGE (Keep current data & add backup).");

              importData(data, replace ? 'replace' : 'merge');
              alert("Data Restored Successfully!");

              // Force reload state from store
              const updatedProfile = useAppStore.getState().profile;
              const updatedPin = useAppStore.getState().pin;
              setLocalName(updatedProfile.name);
              setLocalOutlet(updatedProfile.outlet);
              setLocalPin(updatedPin);

          } catch (err) {
              alert("Invalid Backup File");
          }
      };
      reader.readAsText(file);
      e.target.value = '';
  };

  const handleWipe = () => {
    if(confirm("CRITICAL WARNING: This will factory reset the app. All data will be lost. Continue?")) {
        if(confirm("Are you absolutely sure?")) {
            wipeData();
            // Reset locals
            setLocalName('');
            setLocalOutlet('');
            setLocalPin('1234');
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
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                className="w-full p-3 mb-3 bg-slate-50 dark:bg-slate-700 dark:text-white rounded-xl"
            />
            <input
                placeholder="Outlet"
                value={localOutlet}
                onChange={(e) => setLocalOutlet(e.target.value)}
                className="w-full p-3 bg-slate-50 dark:bg-slate-700 dark:text-white rounded-xl"
            />
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 className="font-bold mb-4 dark:text-white flex items-center gap-2"><Lock size={20}/> Security</h3>
            <label className="text-xs font-bold text-slate-400">Change PIN</label>
            <input
                value={localPin}
                maxLength="4"
                onChange={(e) => setLocalPin(e.target.value)}
                className="w-full p-3 bg-slate-50 dark:bg-slate-700 dark:text-white rounded-xl mt-1 tracking-widest font-bold"
            />
        </div>

        <button onClick={handleSaveProfile} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-2xl font-bold shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2">
            <Save size={20} /> Save Profile & Settings
        </button>

        <div className="bg-slate-800 rounded-3xl p-8 text-white shadow-xl mt-8">
             <h3 className="font-bold mb-4">Data Management</h3>

             <button onClick={handleBackup} className="w-full bg-white/10 hover:bg-white/20 p-4 rounded-xl flex items-center gap-3 mb-3 transition">
                 <Download size={20} className="text-emerald-400"/>
                 <div className="text-left">
                     <div className="font-bold">Master Backup</div>
                     <div className="text-xs text-slate-400">Export JSON</div>
                 </div>
             </button>

             <label className="w-full bg-white/10 hover:bg-white/20 p-4 rounded-xl flex items-center gap-3 mb-3 transition cursor-pointer">
                 <Upload size={20} className="text-blue-400"/>
                 <div className="text-left">
                     <div className="font-bold">Import Backup</div>
                     <div className="text-xs text-slate-400">Restore Data (Merge/Replace)</div>
                 </div>
                 <input type="file" onChange={handleRestore} className="hidden" accept="application/json" />
             </label>

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
