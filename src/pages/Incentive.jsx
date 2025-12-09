import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Settings, Trash2, PlusCircle, Save, RotateCcw, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

const Incentive = () => {
  const { incConfig, setIncConfig, resetIncConfig, profile } = useAppStore();
  const [view, setView] = useState('calc'); // 'calc' or 'config'
  const [activeTab, setActiveTab] = useState('SP'); // For Config

  // Local state for calculation inputs (Rows)
  const [rows, setRows] = useState({ sp: [], tb: [], wr: [], cp: [], npc: [] });
  const [meta, setMeta] = useState({
      k_ff7: 0, t_ff7: 'low', k_s25: 0, t_s25: 'low',
      accVal: 0, accBase: 0, target: 50, channel: 'standard', status: 'existing'
  });
  const [result, setResult] = useState({ logs: [], grand: 0, spQ: 0, ach: 0 });

  // Initialize rows on mount
  useEffect(() => {
    if (rows.sp.length === 0) {
        setRows({
            sp: [{ qty: 1, rate: 0, fm: false }],
            tb: [{ qty: 1, rate: 0, fm: false }],
            wr: [{ qty: 1, rate: 0, fm: false }],
            cp: [], npc: []
        });
    }
  }, []);

  // Sync Calc Logic
  useEffect(() => {
    calculate();
  }, [rows, meta, incConfig]);

  const addRow = (key) => setRows({ ...rows, [key]: [...rows[key], { qty: 1, rate: 0, fm: false }] });
  const delRow = (key, idx) => {
      const newRows = [...rows[key]];
      newRows.splice(idx, 1);
      setRows({ ...rows, [key]: newRows });
  };
  const updRow = (key, idx, field, val) => {
      const newRows = [...rows[key]];
      newRows[idx][field] = (field === 'rate' || field === 'qty') ? parseFloat(val) || 0 : val;
      setRows({ ...rows, [key]: newRows });
  };

  const calculate = () => {
      const c = incConfig;
      let logs = [];
      let spQ=0, spRaw=0;
      rows.sp.forEach(r => {
          if(r.qty>0) { spQ+=r.qty; spRaw += r.qty * (r.fm ? r.rate*c.sp.fm_mult : r.rate); }
      });

      const isExempt = (meta.channel === 'sis_pro' || meta.status === 'new_joinee');
      const gateSet = isExempt ? c.sp.gates.sis : c.sp.gates.std;
      let gateM = 0;
      let gateN = "Missed Gate";
      for(let g of gateSet) { if(spQ >= g.min) { gateM = g.p; gateN = ""; break; } }

      let spFin = spRaw * gateM;
      let spPot = spRaw * (gateM > 0 ? gateM : 1.0);
      const ach = meta.target > 0 ? spQ/meta.target : 0;

      let missed = false;
      if(!isExempt && meta.channel === 'standard' && ach < c.sp.target_thresh) {
          missed=true; spFin=0; gateN=`Missed Target (${spQ}/${meta.target})`;
      } else if(gateM === 0) {
          missed=true; gateN=`Missed Volume Gate (${spQ})`;
      }
      logs.push({c:"Smartphones", n:gateN, v:spFin, pot:spPot, missed});

      let tbTot=0; rows.tb.forEach(r => tbTot += (r.qty||0)*r.rate);
      let tbFin = Math.min(tbTot, c.caps.tb);
      logs.push({c:"Tablets", n:tbTot>tbFin?"Capped":"", v:tbFin});

      let wrTot=0; rows.wr.forEach(r => wrTot += (r.qty||0)*r.rate);
      logs.push({c:"Wearables", n:"", v:wrTot});

      let comb = spFin + wrTot;
      if(comb > c.caps.global) { comb = c.caps.global; logs.push({c:"Global Cap", n:"Max 75k applied", v:0}); }

      let cpTot=0, cpQ=0;
      rows.cp.forEach(r => { cpQ+=r.qty; cpTot+=(r.qty||0)*r.rate; });
      if(cpQ>=8) cpTot*=1.2;
      if(cpQ>0 && cpQ<3) { cpTot=0; logs.push({c:"Care+", n:"Gate < 3", v:0}); }
      else {
          if(meta.k_ff7 > 0) cpTot += meta.k_ff7 * (meta.t_ff7==='high' ? c.cp.kickers.ff7.h : c.cp.kickers.ff7.l);
          if(meta.k_s25 > 0) cpTot += meta.k_s25 * (meta.t_s25==='high' ? c.cp.kickers.s25.h : c.cp.kickers.s25.l);
          logs.push({c:"Care+", n:"", v:cpTot});
      }

      let npcTot=0; rows.npc.forEach(r => npcTot += (r.qty||0)*r.rate);
      let npcFin = Math.min(npcTot, c.caps.npc);
      logs.push({c:"Note PC", n:npcTot>npcFin?"Capped":"", v:npcFin});

      let bunTot = 0;
      let accTot = 0;
      const ab = meta.accBase || (spRaw * 25);
      if(ab > 0 && meta.channel!=='exclusive') {
          const pct = (meta.accVal/ab)*100;
          for(let t of c.acc) { if(pct>=t.min) { accTot = t.rate; break; } }
      }
      logs.push({c:"Accessories", n:"", v:accTot});

      let grand = comb + tbFin + npcFin + cpTot + bunTot + accTot;
      setResult({ logs, grand, spQ, ach: (ach*100).toFixed(0) });
  };

  const handleExport = async () => {
    const wb = XLSX.utils.book_new();
    const wsData = [
        ["SEC Unified Incentive Report"],
        ["Date", new Date().toLocaleString()],
        ["Target", meta.target, "Achieved", result.spQ + ` (${result.ach}%)`],
        [],
        ["Category", "Details", "Payout"],
        ...result.logs.map(l => [l.c, l.n, l.v]),
        [],
        ["GRAND TOTAL", "", result.grand]
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Report");

    // Write
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
    const fileName = `Incentive_Report_${Date.now()}.xlsx`;

    try {
        await Filesystem.writeFile({
            path: fileName,
            data: wbout,
            directory: Directory.Cache
        });
        const uriResult = await Filesystem.getUri({ path: fileName, directory: Directory.Cache });
        await Share.share({ title: 'Export', url: uriResult.uri });
    } catch(e) {
        console.error(e);
        alert("Export Error: " + e.message);
    }
  };

  // Config Updater
  const updateConfig = (path, val) => {
      const newConfig = JSON.parse(JSON.stringify(incConfig));
      const parts = path.split('.');
      let obj = newConfig;
      for (let i = 0; i < parts.length - 1; i++) {
          obj = obj[parts[i]];
      }
      obj[parts[parts.length - 1]] = parseFloat(val) || val;
      setIncConfig(newConfig);
  };

  const ConfigSection = () => (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg mb-24">
       <div className="flex justify-between items-center mb-4">
         <h3 className="font-bold text-lg dark:text-white">Configuration</h3>
         <div className="flex gap-2">
            <button onClick={resetIncConfig} className="text-red-500 p-2"><RotateCcw size={16}/></button>
            <button onClick={() => setView('calc')} className="text-indigo-500 p-2"><Save size={16}/></button>
         </div>
       </div>

       <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 mb-4 overflow-x-auto">
         {['SP','TB','WR','CP','NPC','Misc'].map(t => (
             <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2 font-bold text-sm ${activeTab===t ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}>{t}</button>
         ))}
       </div>

       <div className="h-[60vh] overflow-y-auto pb-12 space-y-4">
        {activeTab === 'SP' && (
            <>
                <div>
                    <h4 className="font-bold text-sm text-blue-600 mb-2">Slabs</h4>
                    {incConfig.sp.slabs.map((s, i) => (
                        <div key={i} className="flex gap-2 mb-2">
                            <input placeholder="Min" type="number" value={s.min} onChange={(e)=>updateConfig(`sp.slabs.${i}.min`, e.target.value)} className="w-1/3 p-2 border rounded text-xs" />
                            <input placeholder="Rate" type="number" value={s.rate} onChange={(e)=>updateConfig(`sp.slabs.${i}.rate`, e.target.value)} className="w-1/3 p-2 border rounded text-xs" />
                            <input placeholder="Label" value={s.label} onChange={(e)=>updateConfig(`sp.slabs.${i}.label`, e.target.value)} className="w-1/3 p-2 border rounded text-xs" />
                        </div>
                    ))}
                </div>
                <div>
                    <h4 className="font-bold text-sm text-blue-600 mb-2">Gates (Multiplier)</h4>
                    <div className="text-xs font-bold mb-1">Standard</div>
                    {incConfig.sp.gates.std.map((g, i) => (
                         <div key={'g'+i} className="flex gap-2 mb-1">
                             <span className="text-xs p-2">Min {g.min}u</span>
                             <input type="number" value={g.p} onChange={(e)=>updateConfig(`sp.gates.std.${i}.p`, e.target.value)} className="w-20 p-2 border rounded text-xs" />
                         </div>
                    ))}
                </div>
            </>
        )}

        {activeTab === 'TB' && (
            <>
                {incConfig.tb.slabs.map((s, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                         <input type="number" value={s.min} onChange={(e)=>updateConfig(`tb.slabs.${i}.min`, e.target.value)} className="w-1/3 p-2 border rounded text-xs" />
                         <input type="number" value={s.rate} onChange={(e)=>updateConfig(`tb.slabs.${i}.rate`, e.target.value)} className="w-1/3 p-2 border rounded text-xs" />
                    </div>
                ))}
                <h4 className="font-bold text-sm text-blue-600 mt-4 mb-2">Focus Models</h4>
                {incConfig.tb.focus.map((f, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                        <input value={f.name} onChange={(e)=>updateConfig(`tb.focus.${i}.name`, e.target.value)} className="w-1/2 p-2 border rounded text-xs" />
                        <input type="number" value={f.rate} onChange={(e)=>updateConfig(`tb.focus.${i}.rate`, e.target.value)} className="w-1/4 p-2 border rounded text-xs" />
                    </div>
                ))}
            </>
        )}

        {activeTab === 'WR' && incConfig.wr.map((w, i) => (
            <div key={i} className="flex gap-2 mb-2">
                <input value={w.name} onChange={(e)=>updateConfig(`wr.${i}.name`, e.target.value)} className="w-2/3 p-2 border rounded text-xs" />
                <input type="number" value={w.rate} onChange={(e)=>updateConfig(`wr.${i}.rate`, e.target.value)} className="w-1/3 p-2 border rounded text-xs" />
            </div>
        ))}

        {activeTab === 'Misc' && (
            <div className="space-y-2">
                <div className="flex justify-between items-center"><label>Global Cap</label><input type="number" value={incConfig.caps.global} onChange={(e)=>updateConfig('caps.global', e.target.value)} className="border p-1 w-24"/></div>
                <div className="flex justify-between items-center"><label>TB Cap</label><input type="number" value={incConfig.caps.tb} onChange={(e)=>updateConfig('caps.tb', e.target.value)} className="border p-1 w-24"/></div>
                <div className="flex justify-between items-center"><label>NPC Cap</label><input type="number" value={incConfig.caps.npc} onChange={(e)=>updateConfig('caps.npc', e.target.value)} className="border p-1 w-24"/></div>
            </div>
        )}
       </div>
    </div>
  );

  if (view === 'config') return <ConfigSection />;

  return (
    <div className="fade-in space-y-4 pb-24 p-4">
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="flex justify-between items-center mb-3">
                <h2 className="font-bold dark:text-white">Incentive</h2>
                <div className="flex gap-2">
                    <button onClick={handleExport} className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 px-3 py-1 rounded-lg flex items-center gap-1"><Download size={14} /> Export</button>
                    <button onClick={() => setView('config')} className="text-xs bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-lg flex items-center gap-1"><Settings size={14} /> Config</button>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
                 <div><label className="font-bold text-slate-400 block">Target</label><input type="number" value={meta.target} onChange={(e)=>setMeta({...meta, target: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 dark:text-white border-none rounded p-1"/></div>
                 <div><label className="font-bold text-slate-400 block">Achieved</label><div className="font-bold text-lg dark:text-white">{result.spQ} <span className="text-xs text-slate-400">({result.ach}%)</span></div></div>
            </div>
        </div>

        {/* Categories (Simplified for MVP, expanding on request) */}
        {/* SP */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border-l-4 border-l-blue-600 shadow-sm p-3">
             <div className="flex justify-between items-center mb-2">
                 <span className="font-bold text-sm dark:text-white">Smartphones</span>
                 <button onClick={() => addRow('sp')} className="text-xs bg-slate-100 p-1 rounded">+ Add</button>
             </div>
             {rows.sp.map((r, i) => (
                 <div key={i} className="flex gap-2 mb-2">
                     <select value={r.rate} onChange={(e)=>updRow('sp', i, 'rate', e.target.value)} className="flex-1 text-xs p-2 rounded border dark:bg-slate-900 dark:text-white">
                         <option value="0">Select Slab</option>
                         {incConfig.sp.slabs.map((s, idx) => <option key={idx} value={s.rate}>{s.label} ({s.rate})</option>)}
                     </select>
                     <input type="number" value={r.qty} onChange={(e)=>updRow('sp', i, 'qty', e.target.value)} className="w-14 text-center text-xs p-2 rounded border dark:bg-slate-900 dark:text-white" />
                     <button onClick={() => delRow('sp', i)} className="text-red-400"><Trash2 size={14}/></button>
                 </div>
             ))}
        </div>

        {/* Other Sections Placeholder (TB/WR) - just reusing logic for brevity if needed, but keeping simple for now */}
        {/* TB */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border-l-4 border-l-purple-600 shadow-sm p-3">
             <div className="flex justify-between items-center mb-2">
                 <span className="font-bold text-sm dark:text-white">Tablets</span>
                 <button onClick={() => addRow('tb')} className="text-xs bg-slate-100 p-1 rounded">+ Add</button>
             </div>
             {rows.tb.map((r, i) => (
                 <div key={i} className="flex gap-2 mb-2">
                     <select value={r.rate} onChange={(e)=>updRow('tb', i, 'rate', e.target.value)} className="flex-1 text-xs p-2 rounded border dark:bg-slate-900 dark:text-white">
                         <option value="0">Select Model</option>
                         {incConfig.tb.slabs.map((s, idx) => <option key={'s'+idx} value={s.rate}>{s.label}</option>)}
                         {incConfig.tb.focus.map((f, idx) => <option key={'f'+idx} value={f.rate}>{f.name}</option>)}
                     </select>
                     <input type="number" value={r.qty} onChange={(e)=>updRow('tb', i, 'qty', e.target.value)} className="w-14 text-center text-xs p-2 rounded border dark:bg-slate-900 dark:text-white" />
                     <button onClick={() => delRow('tb', i)} className="text-red-400"><Trash2 size={14}/></button>
                 </div>
             ))}
        </div>

        {/* Result Footer */}
        <div className="fixed bottom-16 left-0 w-full glass p-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center z-40">
             <div className="text-right flex-1 pr-4">
                 <div className="text-[10px] font-bold text-slate-400 uppercase">Total Payout</div>
                 <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">₹{Math.floor(result.grand).toLocaleString()}</div>
             </div>
        </div>
    </div>
  );
};

export default Incentive;
