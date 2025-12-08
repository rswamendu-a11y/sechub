import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Card, Input, Button } from '../../components/ui';
import { User, Shield, AlertTriangle, Download } from 'lucide-react';
import { FilesystemService } from '../../services/filesystem';

export const SettingsView: React.FC = () => {
  const { profile, pin, updateProfile, setPin, clearAllData, sales, incConfig } = useAppStore();

  const handleBackup = async () => {
      const data = {
          profile,
          sales,
          incConfig,
          date: new Date().toISOString()
      };

      const fileName = `SEC_Backup_${data.date.split('T')[0]}.json`;
      const json = JSON.stringify(data, null, 2);

      try {
          await FilesystemService.saveText(fileName, json);
          await FilesystemService.shareFile(fileName);
      } catch (e) {
          alert("Backup failed");
      }
  };

  const handleClear = () => {
      if(confirm("DANGER: This will wipe ALL app data including sales and queue. This cannot be undone. Are you sure?")) {
          if(confirm("Double Check: Are you absolutely sure?")) {
              clearAllData();
              alert("App reset to factory defaults.");
              window.location.reload();
          }
      }
  };

  return (
    <div className="fade-in space-y-6">
       <Card>
          <h3 className="font-bold mb-4 dark:text-white flex items-center gap-2"><User size={20}/> Profile</h3>
          <div className="space-y-3">
             <Input placeholder="Name" value={profile.name} onChange={e => updateProfile({name: e.target.value})} />
             <Input placeholder="Outlet" value={profile.outlet} onChange={e => updateProfile({outlet: e.target.value})} />
             <Input placeholder="Emp Code" value={profile.code} onChange={e => updateProfile({code: e.target.value})} />
             <Button onClick={() => alert("Profile Saved")} className="w-full mt-2">Save Profile</Button>
          </div>
       </Card>

       <Card>
          <h3 className="font-bold mb-4 dark:text-white flex items-center gap-2"><Shield size={20}/> Security</h3>
          <label className="text-xs font-bold text-slate-400">Change PIN</label>
          <Input
            value={pin}
            maxLength={4}
            onChange={e => { if(e.target.value.length <= 4) setPin(e.target.value); }}
            className="tracking-[1em] text-center font-bold text-xl"
            type="password"
          />
       </Card>

       <div className="bg-slate-800 rounded-3xl p-8 text-white shadow-xl">
           <h2 className="text-xl font-bold mb-2 flex items-center gap-3"><AlertTriangle className="text-orange-400"/> Data Management</h2>
           <div className="space-y-4 mt-4">
              <Button onClick={handleBackup} variant="secondary" className="w-full justify-start gap-3">
                  <Download size={18} /> Export Master Backup (JSON)
              </Button>

              <Button onClick={handleClear} className="w-full justify-start gap-3 bg-red-500/20 text-red-200 hover:bg-red-500/40 border border-red-500/50">
                  <Trash2Icon /> Master Clear Data
              </Button>
           </div>
       </div>

       <div className="text-center text-xs text-slate-400 pb-8">
           SEC Unified Enterprise v2.0 <br/>
           Built with React + Capacitor
       </div>
    </div>
  );
};

const Trash2Icon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>;
