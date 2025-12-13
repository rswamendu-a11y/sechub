import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Trash2, Plus, Save, RotateCcw, ChevronRight, Tablet, Smartphone, Shield, Watch, Monitor, Briefcase, Headphones } from 'lucide-react';

const Config = ({ onBack }) => {
  const { incConfig, setIncConfig, resetIncConfig } = useAppStore();
  const [localConfig, setLocalConfig] = useState(null);
  const [activeTab, setActiveTab] = useState('SP');

  useEffect(() => {
    if (incConfig) {
        // Deep copy to avoid direct mutation
        setLocalConfig(JSON.parse(JSON.stringify(incConfig)));
    }
  }, [incConfig]);

  const handleSave = () => {
      if (confirm("Save Configuration Changes?")) {
          setIncConfig(localConfig);
          if(onBack) onBack();
      }
  };

  const handleReset = () => {
      if (confirm("Reset to Defaults?")) {
          resetIncConfig();
      }
  };

  const updateField = (path, value) => {
      const parts = path.split('.');
      const newConf = { ...localConfig };
      let curr = newConf;
      for (let i = 0; i < parts.length - 1; i++) {
          if (!curr[parts[i]]) curr[parts[i]] = {};
          curr = curr[parts[i]];
      }
      curr[parts[parts.length - 1]] = value;
      setLocalConfig(newConf);
  };

  const updateArrayItem = (path, index, field, value) => {
      const parts = path.split('.');
      const newConf = { ...localConfig };
      let curr = newConf;
      for (let i = 0; i < parts.length; i++) {
          if (!curr[parts[i]]) curr[parts[i]] = [];
          curr = curr[parts[i]];
      }
      if (curr[index]) {
          curr[index][field] = value;
          setLocalConfig(newConf);
      }
  };

  const addArrayItem = (path, item) => {
      const parts = path.split('.');
      const newConf = { ...localConfig };
      let curr = newConf;
      for (let i = 0; i < parts.length; i++) {
          if (!curr[parts[i]]) curr[parts[i]] = [];
          curr = curr[parts[i]];
      }
      curr.push(item);
      setLocalConfig(newConf);
  };

  const removeArrayItem = (path, index) => {
      const parts = path.split('.');
      const newConf = { ...localConfig };
      let curr = newConf;
      for (let i = 0; i < parts.length; i++) {
          if (!curr[parts[i]]) curr[parts[i]] = [];
          curr = curr[parts[i]];
      }
      curr.splice(index, 1);
      setLocalConfig(newConf);
  };

  if (!localConfig) return <div className="p-10 text-center">Loading Config...</div>;

  const tabs = [
      { id: 'SP', label: 'Smartphones', icon: Smartphone, color: 'text-blue-500' },
      { id: 'TB', label: 'Tablets', icon: Tablet, color: 'text-purple-500' },
      { id: 'CP', label: 'Care+', icon: Shield, color: 'text-indigo-600' },
      { id: 'WR', label: 'Wearables', icon: Watch, color: 'text-pink-500' },
      { id: 'NPC', label: 'Note PC', icon: Monitor, color: 'text-teal-500' },
      { id: 'BUN', label: 'Bundles', icon: Briefcase, color: 'text-orange-500' },
      { id: 'ACC', label: 'Accessories', icon: Headphones, color: 'text-yellow-500' },
  ];

  return (
    <div className="fade-in pb-24 bg-white dark:bg-slate-900 min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-200 dark:border-slate-800 p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
              <button onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                  <ChevronRight className="rotate-180" size={20}/>
              </button>
              <h2 className="font-bold text-lg dark:text-white">Configuration</h2>
          </div>
          <div className="flex gap-2">
              <button onClick={handleReset} className="p-2 text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg" title="Reset Defaults">
                  <RotateCcw size={18} />
              </button>
              <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-lg shadow-indigo-500/30">
                  <Save size={18} /> Save
              </button>
          </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto p-2 gap-2 border-b border-slate-100 dark:border-slate-800 no-scrollbar">
          {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold border transition ${activeTab === t.id ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-700 dark:text-indigo-300' : 'bg-white border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700'}`}
              >
                  <t.icon size={14} className={activeTab === t.id ? '' : t.color} />
                  {t.label}
              </button>
          ))}
      </div>

      <div className="p-4 space-y-6">

        {/* SMARTPHONES */}
        {activeTab === 'SP' && (
            <div className="space-y-6 fade-in">
                {/* Slabs */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <h3 className="text-sm font-bold text-slate-500 uppercase mb-3 flex justify-between">
                        <span>Price Slabs</span>
                        <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded">Min Value / Rate</span>
                    </h3>
                    <div className="space-y-2">
                        {(localConfig.sp?.slabs || []).map((item, i) => (
                            <div key={i} className="flex gap-2 items-center">
                                <input type="number" value={item.min} onChange={(e)=>updateArrayItem('sp.slabs', i, 'min', Number(e.target.value))} className="w-24 p-2 rounded border text-sm dark:bg-slate-800 dark:text-white" placeholder="Min" />
                                <span className="text-slate-400">-</span>
                                <input type="number" value={item.rate} onChange={(e)=>updateArrayItem('sp.slabs', i, 'rate', Number(e.target.value))} className="flex-1 p-2 rounded border text-sm dark:bg-slate-800 dark:text-white" placeholder="Rate" />
                                <button onClick={()=>removeArrayItem('sp.slabs', i)} className="text-red-400 p-2"><Trash2 size={16}/></button>
                            </div>
                        ))}
                        <button onClick={()=>addArrayItem('sp.slabs', {min:0, rate:0})} className="w-full py-2 bg-white dark:bg-slate-700 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold text-slate-500 flex justify-center gap-2">
                            <Plus size={14}/> Add Slab
                        </button>
                    </div>
                </div>

                {/* Gates */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <h3 className="text-sm font-bold text-slate-500 uppercase mb-3">Gate Criteria</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* STD */}
                        <div>
                            <div className="text-xs font-bold text-indigo-600 mb-2">Standard Store</div>
                            <div className="space-y-2">
                                {(localConfig.sp?.gates?.std || []).map((g, i) => (
                                    <div key={i} className="flex gap-1 items-center">
                                        <input type="number" value={g.min} onChange={(e)=>updateArrayItem('sp.gates.std', i, 'min', Number(e.target.value))} className="w-16 p-2 rounded border text-xs dark:bg-slate-800 dark:text-white" placeholder="Min" />
                                        <span className="text-xs">u</span>
                                        <input type="number" value={g.p} onChange={(e)=>updateArrayItem('sp.gates.std', i, 'p', Number(e.target.value))} className="w-16 p-2 rounded border text-xs dark:bg-slate-800 dark:text-white" placeholder="Mult" />
                                        <span className="text-xs">x</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {/* SIS */}
                        <div>
                            <div className="text-xs font-bold text-emerald-600 mb-2">SIS / PRO</div>
                            <div className="space-y-2">
                                {(localConfig.sp?.gates?.sis || []).map((g, i) => (
                                    <div key={i} className="flex gap-1 items-center">
                                        <input type="number" value={g.min} onChange={(e)=>updateArrayItem('sp.gates.sis', i, 'min', Number(e.target.value))} className="w-16 p-2 rounded border text-xs dark:bg-slate-800 dark:text-white" placeholder="Min" />
                                        <span className="text-xs">u</span>
                                        <input type="number" value={g.p} onChange={(e)=>updateArrayItem('sp.gates.sis', i, 'p', Number(e.target.value))} className="w-16 p-2 rounded border text-xs dark:bg-slate-800 dark:text-white" placeholder="Mult" />
                                        <span className="text-xs">x</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* TABLETS */}
        {activeTab === 'TB' && (
            <div className="space-y-6 fade-in">
                {/* Slabs */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <h3 className="text-sm font-bold text-slate-500 uppercase mb-3">Price Slabs</h3>
                    <div className="space-y-2">
                         {(localConfig.tb?.slabs || []).map((item, i) => (
                            <div key={i} className="flex gap-2 items-center">
                                <input type="number" value={item.min} onChange={(e)=>updateArrayItem('tb.slabs', i, 'min', Number(e.target.value))} className="w-20 p-2 rounded border text-xs dark:bg-slate-800 dark:text-white" placeholder="Min" />
                                <input type="number" value={item.max} onChange={(e)=>updateArrayItem('tb.slabs', i, 'max', Number(e.target.value))} className="w-20 p-2 rounded border text-xs dark:bg-slate-800 dark:text-white" placeholder="Max" />
                                <input type="number" value={item.rate} onChange={(e)=>updateArrayItem('tb.slabs', i, 'rate', Number(e.target.value))} className="flex-1 p-2 rounded border text-xs dark:bg-slate-800 dark:text-white" placeholder="Rate" />
                                <button onClick={()=>removeArrayItem('tb.slabs', i)} className="text-red-400 p-2"><Trash2 size={16}/></button>
                            </div>
                        ))}
                        <button onClick={()=>addArrayItem('tb.slabs', {min:0, max:0, rate:0})} className="w-full py-2 bg-white dark:bg-slate-700 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold text-slate-500 flex justify-center gap-2">
                            <Plus size={14}/> Add Slab
                        </button>
                    </div>
                </div>

                {/* Focus Models */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <h3 className="text-sm font-bold text-slate-500 uppercase mb-3">Focus Models</h3>
                    <div className="space-y-2">
                         {(localConfig.tb?.focus || []).map((item, i) => (
                            <div key={i} className="flex gap-2 items-center">
                                <input value={item.name} onChange={(e)=>updateArrayItem('tb.focus', i, 'name', e.target.value)} className="flex-1 p-2 rounded border text-xs dark:bg-slate-800 dark:text-white" placeholder="Model Name" />
                                <input type="number" value={item.rate} onChange={(e)=>updateArrayItem('tb.focus', i, 'rate', Number(e.target.value))} className="w-20 p-2 rounded border text-xs dark:bg-slate-800 dark:text-white" placeholder="Rate" />
                                <button onClick={()=>removeArrayItem('tb.focus', i)} className="text-red-400 p-2"><Trash2 size={16}/></button>
                            </div>
                        ))}
                        <button onClick={()=>addArrayItem('tb.focus', {name:'New Model', rate:0})} className="w-full py-2 bg-white dark:bg-slate-700 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold text-slate-500 flex justify-center gap-2">
                            <Plus size={14}/> Add Focus Model
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* CARE+ */}
        {activeTab === 'CP' && (
            <div className="space-y-6 fade-in">
                 {/* Slabs */}
                 <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <h3 className="text-sm font-bold text-slate-500 uppercase mb-3">Price Slabs</h3>
                    <div className="space-y-2">
                        {(localConfig.carePlus?.slabs || []).map((item, i) => (
                            <div key={i} className="flex gap-2 items-center">
                                <input value={item.name} onChange={(e)=>updateArrayItem('carePlus.slabs', i, 'name', e.target.value)} className="flex-1 p-2 rounded border text-xs dark:bg-slate-800 dark:text-white" placeholder="Label" />
                                <input type="number" value={item.min} onChange={(e)=>updateArrayItem('carePlus.slabs', i, 'min', Number(e.target.value))} className="w-20 p-2 rounded border text-xs dark:bg-slate-800 dark:text-white" placeholder="Min" />
                                <input type="number" value={item.amount} onChange={(e)=>updateArrayItem('carePlus.slabs', i, 'amount', Number(e.target.value))} className="w-20 p-2 rounded border text-xs dark:bg-slate-800 dark:text-white" placeholder="Amt" />
                                <button onClick={()=>removeArrayItem('carePlus.slabs', i)} className="text-red-400 p-2"><Trash2 size={16}/></button>
                            </div>
                        ))}
                        <button onClick={()=>addArrayItem('carePlus.slabs', {name:'Range', min:0, amount:0})} className="w-full py-2 bg-white dark:bg-slate-700 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold text-slate-500 flex justify-center gap-2">
                            <Plus size={14}/> Add Slab
                        </button>
                    </div>
                 </div>

                 {/* Kickers (Dynamic) */}
                 <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <h3 className="text-sm font-bold text-slate-500 uppercase mb-3">Series Kickers</h3>
                    <div className="space-y-4">
                        {/* We handle both Object (legacy) and Array (new) structure */}
                        {/* Converting Object to Array for display if needed, but better to migrate store */}
                        {/* Assuming we will migrate to Array structure in Incentive.jsx. Here we just edit Array. */}
                        {/* If store has object, we need to handle it. Let's assume we use array 'customKickers' if exists, else fallback */}

                        {(localConfig.carePlus?.customKickers || []).map((item, i) => (
                            <div key={i} className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-600">
                                <div className="flex justify-between mb-2">
                                    <input value={item.name} onChange={(e)=>updateArrayItem('carePlus.customKickers', i, 'name', e.target.value)} className="font-bold text-sm bg-transparent border-b border-slate-200 dark:border-slate-700 dark:text-white w-full mr-2" placeholder="Series Name" />
                                    <button onClick={()=>removeArrayItem('carePlus.customKickers', i)} className="text-red-400"><Trash2 size={16}/></button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] text-slate-400">Low Threshold (%)</label>
                                        <div className="flex gap-1">
                                            <input type="number" value={item.l_thresh} onChange={(e)=>updateArrayItem('carePlus.customKickers', i, 'l_thresh', Number(e.target.value))} className="w-full p-2 rounded border text-xs dark:bg-slate-900 dark:text-white" />
                                            <input type="number" value={item.l_rate} onChange={(e)=>updateArrayItem('carePlus.customKickers', i, 'l_rate', Number(e.target.value))} className="w-full p-2 rounded border text-xs dark:bg-slate-900 dark:text-white" placeholder="₹" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-slate-400">High Threshold (%)</label>
                                        <div className="flex gap-1">
                                            <input type="number" value={item.h_thresh} onChange={(e)=>updateArrayItem('carePlus.customKickers', i, 'h_thresh', Number(e.target.value))} className="w-full p-2 rounded border text-xs dark:bg-slate-900 dark:text-white" />
                                            <input type="number" value={item.h_rate} onChange={(e)=>updateArrayItem('carePlus.customKickers', i, 'h_rate', Number(e.target.value))} className="w-full p-2 rounded border text-xs dark:bg-slate-900 dark:text-white" placeholder="₹" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <button onClick={()=>addArrayItem('carePlus.customKickers', {name:'New Series', l_thresh:0, l_rate:0, h_thresh:0, h_rate:0})} className="w-full py-2 bg-white dark:bg-slate-700 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold text-slate-500 flex justify-center gap-2">
                            <Plus size={14}/> Add Kicker Rule
                        </button>
                    </div>
                 </div>
            </div>
        )}

        {/* WEARABLES */}
        {activeTab === 'WR' && (
            <div className="space-y-6 fade-in">
                 <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <h3 className="text-sm font-bold text-slate-500 uppercase mb-3">Wearable Models</h3>
                    <div className="space-y-2">
                        {(localConfig.wearables?.models || []).map((item, i) => (
                            <div key={i} className="flex gap-2 items-center">
                                <input value={item.name} onChange={(e)=>updateArrayItem('wearables.models', i, 'name', e.target.value)} className="flex-1 p-2 rounded border text-xs dark:bg-slate-800 dark:text-white" placeholder="Model" />
                                <input type="number" value={item.amount} onChange={(e)=>updateArrayItem('wearables.models', i, 'amount', Number(e.target.value))} className="w-20 p-2 rounded border text-xs dark:bg-slate-800 dark:text-white" placeholder="Rate" />
                                <button onClick={()=>removeArrayItem('wearables.models', i)} className="text-red-400 p-2"><Trash2 size={16}/></button>
                            </div>
                        ))}
                         <button onClick={()=>addArrayItem('wearables.models', {name:'New Model', amount:0})} className="w-full py-2 bg-white dark:bg-slate-700 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold text-slate-500 flex justify-center gap-2">
                            <Plus size={14}/> Add Model
                        </button>
                    </div>
                 </div>
            </div>
        )}

        {/* NOTE PC */}
        {activeTab === 'NPC' && (
            <div className="space-y-6 fade-in">
                 <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <h3 className="text-sm font-bold text-slate-500 uppercase mb-3">Note PC Models</h3>
                    <div className="space-y-2">
                        {(localConfig.notePC?.models || []).map((item, i) => (
                            <div key={i} className="flex gap-2 items-center">
                                <input value={item.name} onChange={(e)=>updateArrayItem('notePC.models', i, 'name', e.target.value)} className="flex-1 p-2 rounded border text-xs dark:bg-slate-800 dark:text-white" placeholder="Model" />
                                <input type="number" value={item.amount} onChange={(e)=>updateArrayItem('notePC.models', i, 'amount', Number(e.target.value))} className="w-20 p-2 rounded border text-xs dark:bg-slate-800 dark:text-white" placeholder="Rate" />
                                <button onClick={()=>removeArrayItem('notePC.models', i)} className="text-red-400 p-2"><Trash2 size={16}/></button>
                            </div>
                        ))}
                         <button onClick={()=>addArrayItem('notePC.models', {name:'New NPC', amount:0})} className="w-full py-2 bg-white dark:bg-slate-700 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold text-slate-500 flex justify-center gap-2">
                            <Plus size={14}/> Add Model
                        </button>
                    </div>
                 </div>
            </div>
        )}

        {/* BUNDLES */}
        {activeTab === 'BUN' && (
            <div className="space-y-6 fade-in">
                 <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <h3 className="text-sm font-bold text-slate-500 uppercase mb-3">Bundle Offers</h3>
                    <div className="space-y-2">
                        {(localConfig.bundles?.items || []).map((item, i) => (
                            <div key={i} className="flex gap-2 items-center">
                                <input value={item.name} onChange={(e)=>updateArrayItem('bundles.items', i, 'name', e.target.value)} className="flex-1 p-2 rounded border text-xs dark:bg-slate-800 dark:text-white" placeholder="Bundle" />
                                <input type="number" value={item.amount} onChange={(e)=>updateArrayItem('bundles.items', i, 'amount', Number(e.target.value))} className="w-20 p-2 rounded border text-xs dark:bg-slate-800 dark:text-white" placeholder="Rate" />
                                <button onClick={()=>removeArrayItem('bundles.items', i)} className="text-red-400 p-2"><Trash2 size={16}/></button>
                            </div>
                        ))}
                         <button onClick={()=>addArrayItem('bundles.items', {name:'New Bundle', amount:0})} className="w-full py-2 bg-white dark:bg-slate-700 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold text-slate-500 flex justify-center gap-2">
                            <Plus size={14}/> Add Bundle
                        </button>
                    </div>
                 </div>
            </div>
        )}

        {/* ACCESSORIES */}
        {activeTab === 'ACC' && (
            <div className="space-y-6 fade-in">
                 <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <h3 className="text-sm font-bold text-slate-500 uppercase mb-3">General Settings</h3>
                    <div>
                         <label className="text-xs font-bold text-slate-400">Base Target Value (Fixed)</label>
                         <input type="number" value={localConfig.accessories?.baseTarget || ''} onChange={(e)=>updateField('accessories.baseTarget', Number(e.target.value))} className="w-full p-2 rounded border text-sm dark:bg-slate-800 dark:text-white" placeholder="e.g. 10000" />
                    </div>
                 </div>

                 {/* Scheme 1 */}
                 <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <h3 className="text-sm font-bold text-slate-500 uppercase mb-3">Scheme 1: Target Achievement</h3>
                    <div className="space-y-2">
                        {(localConfig.accessories?.items || []).map((item, i) => (
                            <div key={i} className="flex gap-2 items-center">
                                <input type="number" value={item.min} onChange={(e)=>updateArrayItem('accessories.items', i, 'min', Number(e.target.value))} className="w-20 p-2 rounded border text-xs dark:bg-slate-800 dark:text-white" placeholder="Min %" />
                                <input type="number" value={item.rate} onChange={(e)=>updateArrayItem('accessories.items', i, 'rate', Number(e.target.value))} className="flex-1 p-2 rounded border text-xs dark:bg-slate-800 dark:text-white" placeholder="Rate" />
                                <button onClick={()=>removeArrayItem('accessories.items', i)} className="text-red-400 p-2"><Trash2 size={16}/></button>
                            </div>
                        ))}
                        <button onClick={()=>addArrayItem('accessories.items', {min:0, rate:0})} className="w-full py-2 bg-white dark:bg-slate-700 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold text-slate-500 flex justify-center gap-2">
                            <Plus size={14}/> Add Bracket
                        </button>
                    </div>
                 </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default Config;
