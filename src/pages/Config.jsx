import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { ChevronRight, RotateCcw, Save, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

const Config = ({ onBack }) => {
  const { incConfig, setIncConfig, resetIncConfig } = useAppStore();
  const [activeTab, setActiveTab] = useState('CP');
  const [localConfig, setLocalConfig] = useState({});

  // Deep copy config on mount to local state for editing
  useEffect(() => {
    if (incConfig) {
      setLocalConfig(JSON.parse(JSON.stringify(incConfig)));
    }
  }, [incConfig]);

  const handleSave = () => {
    setIncConfig(localConfig);
    alert("Configuration Saved!");
    if (onBack) onBack();
  };

  const handleReset = () => {
    if (confirm("Reset all configuration to defaults?")) {
      resetIncConfig();
      setLocalConfig(useAppStore.getState().incConfig); // Re-sync
    }
  };

  const updateField = (path, value) => {
    const newConfig = { ...localConfig };
    const parts = path.split('.');
    let obj = newConfig;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!obj[parts[i]]) obj[parts[i]] = {};
      obj = obj[parts[i]];
    }
    obj[parts[parts.length - 1]] = value;
    setLocalConfig(newConfig);
  };

  const updateArrayItem = (path, index, field, value) => {
      const newConfig = { ...localConfig };
      // Navigate to array
      const parts = path.split('.');
      let obj = newConfig;
      for (let part of parts) {
          obj = obj[part];
      }
      if (obj && obj[index]) {
          obj[index][field] = (field === 'amount' || field === 'rate' || field === 'min') ? Number(value) : value;
          setLocalConfig(newConfig);
      }
  };

  const addArrayItem = (path, template) => {
      const newConfig = { ...localConfig };
      const parts = path.split('.');
      let obj = newConfig;
      for (let part of parts) {
          obj = obj[part];
      }
      if (Array.isArray(obj)) {
          obj.push(template);
          setLocalConfig(newConfig);
      }
  };

  const removeArrayItem = (path, index) => {
      const newConfig = { ...localConfig };
      const parts = path.split('.');
      let obj = newConfig;
      for (let part of parts) {
          obj = obj[part];
      }
      if (Array.isArray(obj)) {
          obj.splice(index, 1);
          setLocalConfig(newConfig);
      }
  };

  const TabButton = ({ id, label }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
        activeTab === id
        ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
        : 'border-transparent text-slate-400 hover:text-slate-600'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="bg-white dark:bg-slate-800 h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-900 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 transition">
            <ChevronRight className="rotate-180" size={20} />
          </button>
          <h2 className="font-bold text-lg dark:text-white">Scheme Config</h2>
        </div>
        <div className="flex gap-2">
           <button onClick={handleReset} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="Reset Defaults">
             <RotateCcw size={20} />
           </button>
           <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition">
             <Save size={18} /> Save
           </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto no-scrollbar border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900">
         <TabButton id="CP" label="Care+" />
         <TabButton id="WR" label="Wearables" />
         <TabButton id="TB" label="Tablets" />
         <TabButton id="NPC" label="Note PC" />
         <TabButton id="BUN" label="Bundles" />
         <TabButton id="ACC" label="Accessories" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">

        {/* CARE PLUS */}
        {activeTab === 'CP' && (
            <div className="space-y-6 fade-in">
                <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl">
                    <h3 className="text-sm font-bold text-slate-500 uppercase mb-3">Slabs (Dealer Price)</h3>
                    <div className="space-y-2">
                        {(localConfig.carePlus?.slabs || []).map((item, i) => (
                            <div key={i} className="flex gap-2 items-center">
                                <input value={item.name} onChange={(e)=>updateArrayItem('carePlus.slabs', i, 'name', e.target.value)} className="flex-1 p-2 rounded border text-sm" placeholder="Slab Name" />
                                <input type="number" value={item.amount} onChange={(e)=>updateArrayItem('carePlus.slabs', i, 'amount', e.target.value)} className="w-24 p-2 rounded border text-sm" placeholder="Amt" />
                                <button onClick={()=>removeArrayItem('carePlus.slabs', i)} className="text-red-400 p-2"><Trash2 size={16}/></button>
                            </div>
                        ))}
                        <button onClick={()=>addArrayItem('carePlus.slabs', {name:'New Slab', amount:0})} className="w-full py-2 bg-white dark:bg-slate-600 border border-dashed border-slate-300 rounded-lg text-xs font-bold text-slate-500 flex justify-center gap-2">
                            <Plus size={14}/> Add Slab
                        </button>
                    </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl">
                    <h3 className="text-sm font-bold text-slate-500 uppercase mb-3">Kickers (Attach Rate)</h3>

                    {/* FF Series */}
                    <div className="mb-4">
                        <label className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded inline-block mb-2">FF Series</label>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] text-slate-400 uppercase font-bold">Low (&lt;25%)</label>
                                <input type="number" value={localConfig.carePlus?.kickers?.ffSeries?.l} onChange={(e)=>updateField('carePlus.kickers.ffSeries.l', Number(e.target.value))} className="w-full p-2 rounded border text-sm" />
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-400 uppercase font-bold">High (≥25%)</label>
                                <input type="number" value={localConfig.carePlus?.kickers?.ffSeries?.h} onChange={(e)=>updateField('carePlus.kickers.ffSeries.h', Number(e.target.value))} className="w-full p-2 rounded border text-sm" />
                            </div>
                        </div>
                    </div>

                    {/* S Series */}
                    <div>
                        <label className="text-xs font-bold bg-purple-100 text-purple-700 px-2 py-1 rounded inline-block mb-2">S Series</label>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] text-slate-400 uppercase font-bold">Low (&lt;15%)</label>
                                <input type="number" value={localConfig.carePlus?.kickers?.sSeries?.l} onChange={(e)=>updateField('carePlus.kickers.sSeries.l', Number(e.target.value))} className="w-full p-2 rounded border text-sm" />
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-400 uppercase font-bold">High (≥15%)</label>
                                <input type="number" value={localConfig.carePlus?.kickers?.sSeries?.h} onChange={(e)=>updateField('carePlus.kickers.sSeries.h', Number(e.target.value))} className="w-full p-2 rounded border text-sm" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl">
                    <h3 className="text-sm font-bold text-slate-500 uppercase mb-3">Volume Gate</h3>
                     <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] text-slate-400 uppercase font-bold">Min Units</label>
                                <input type="number" value={localConfig.carePlus?.volGate?.min} onChange={(e)=>updateField('carePlus.volGate.min', Number(e.target.value))} className="w-full p-2 rounded border text-sm" />
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-400 uppercase font-bold">Multiplier (e.g. 1.2)</label>
                                <input type="number" value={localConfig.carePlus?.volGate?.mult} onChange={(e)=>updateField('carePlus.volGate.mult', Number(e.target.value))} className="w-full p-2 rounded border text-sm" />
                            </div>
                     </div>
                </div>
            </div>
        )}

        {/* WEARABLES */}
        {activeTab === 'WR' && (
             <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl fade-in">
                <h3 className="text-sm font-bold text-slate-500 uppercase mb-3">Model Payouts</h3>
                <div className="space-y-2">
                    {(localConfig.wearables?.models || []).map((item, i) => (
                        <div key={i} className="flex gap-2 items-center">
                            <input value={item.name} onChange={(e)=>updateArrayItem('wearables.models', i, 'name', e.target.value)} className="flex-1 p-2 rounded border text-sm" placeholder="Model Name" />
                            <input type="number" value={item.amount} onChange={(e)=>updateArrayItem('wearables.models', i, 'amount', e.target.value)} className="w-24 p-2 rounded border text-sm" placeholder="Amt" />
                            <button onClick={()=>removeArrayItem('wearables.models', i)} className="text-red-400 p-2"><Trash2 size={16}/></button>
                        </div>
                    ))}
                    <button onClick={()=>addArrayItem('wearables.models', {name:'New Model', amount:0})} className="w-full py-2 bg-white dark:bg-slate-600 border border-dashed border-slate-300 rounded-lg text-xs font-bold text-slate-500 flex justify-center gap-2">
                        <Plus size={14}/> Add Model
                    </button>
                </div>
             </div>
        )}

        {/* TABLETS */}
        {activeTab === 'TB' && (
             <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl fade-in">
                <h3 className="text-sm font-bold text-slate-500 uppercase mb-3">Tablet Slabs</h3>
                <div className="space-y-2">
                    {(localConfig.tb?.slabs || []).map((item, i) => (
                        <div key={i} className="flex gap-2 items-center">
                            <input value={item.label} onChange={(e)=>updateArrayItem('tb.slabs', i, 'label', e.target.value)} className="flex-1 p-2 rounded border text-sm" placeholder="Slab Name" />
                            <input type="number" value={item.rate} onChange={(e)=>updateArrayItem('tb.slabs', i, 'rate', e.target.value)} className="w-24 p-2 rounded border text-sm" placeholder="Rate" />
                        </div>
                    ))}
                </div>
             </div>
        )}

        {/* NOTE PC */}
        {activeTab === 'NPC' && (
             <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl fade-in">
                <h3 className="text-sm font-bold text-slate-500 uppercase mb-3">Notebook Models</h3>
                <div className="space-y-2">
                    {(localConfig.notePC?.models || []).map((item, i) => (
                        <div key={i} className="flex gap-2 items-center">
                            <input value={item.name} onChange={(e)=>updateArrayItem('notePC.models', i, 'name', e.target.value)} className="flex-1 p-2 rounded border text-sm" placeholder="Model" />
                            <input type="number" value={item.amount} onChange={(e)=>updateArrayItem('notePC.models', i, 'amount', e.target.value)} className="w-24 p-2 rounded border text-sm" placeholder="Amt" />
                            <button onClick={()=>removeArrayItem('notePC.models', i)} className="text-red-400 p-2"><Trash2 size={16}/></button>
                        </div>
                    ))}
                    <button onClick={()=>addArrayItem('notePC.models', {name:'New NPC', amount:0})} className="w-full py-2 bg-white dark:bg-slate-600 border border-dashed border-slate-300 rounded-lg text-xs font-bold text-slate-500 flex justify-center gap-2">
                        <Plus size={14}/> Add Model
                    </button>
                </div>
             </div>
        )}

        {/* BUNDLES */}
        {activeTab === 'BUN' && (
             <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl fade-in">
                <h3 className="text-sm font-bold text-slate-500 uppercase mb-3">Bundle Offers</h3>
                <div className="space-y-2">
                    {(localConfig.bundles?.items || []).map((item, i) => (
                        <div key={i} className="flex gap-2 items-center">
                            <input value={item.name} onChange={(e)=>updateArrayItem('bundles.items', i, 'name', e.target.value)} className="flex-1 p-2 rounded border text-sm" placeholder="Bundle Name" />
                            <input type="number" value={item.amount} onChange={(e)=>updateArrayItem('bundles.items', i, 'amount', e.target.value)} className="w-24 p-2 rounded border text-sm" placeholder="Amt" />
                            <button onClick={()=>removeArrayItem('bundles.items', i)} className="text-red-400 p-2"><Trash2 size={16}/></button>
                        </div>
                    ))}
                    <button onClick={()=>addArrayItem('bundles.items', {name:'New Bundle', amount:0})} className="w-full py-2 bg-white dark:bg-slate-600 border border-dashed border-slate-300 rounded-lg text-xs font-bold text-slate-500 flex justify-center gap-2">
                        <Plus size={14}/> Add Bundle
                    </button>
                </div>
             </div>
        )}

        {/* ACCESSORIES */}
        {activeTab === 'ACC' && (
             <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl fade-in">
                <h3 className="text-sm font-bold text-slate-500 uppercase mb-3">Achievement Slabs</h3>
                <div className="grid grid-cols-3 gap-2 mb-2 text-xs font-bold text-slate-400">
                    <div className="col-span-1">Min %</div>
                    <div className="col-span-1">Payout</div>
                    <div></div>
                </div>
                <div className="space-y-2">
                    {(localConfig.accessories?.items || []).map((item, i) => (
                        <div key={i} className="flex gap-2 items-center">
                            <input type="number" value={item.min} onChange={(e)=>updateArrayItem('accessories.items', i, 'min', e.target.value)} className="w-full p-2 rounded border text-sm" placeholder="Min %" />
                            <input type="number" value={item.rate} onChange={(e)=>updateArrayItem('accessories.items', i, 'rate', e.target.value)} className="w-full p-2 rounded border text-sm" placeholder="Payout" />
                            <button onClick={()=>removeArrayItem('accessories.items', i)} className="text-red-400 p-2"><Trash2 size={16}/></button>
                        </div>
                    ))}
                    <button onClick={()=>addArrayItem('accessories.items', {min:0, rate:0})} className="w-full py-2 bg-white dark:bg-slate-600 border border-dashed border-slate-300 rounded-lg text-xs font-bold text-slate-500 flex justify-center gap-2">
                        <Plus size={14}/> Add Bracket
                    </button>
                </div>
             </div>
        )}

      </div>
    </div>
  );
};

export default Config;
