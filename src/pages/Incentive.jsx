import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Settings, Trash2, PlusCircle, Save, RotateCcw, Download, ChevronRight, X, Info } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

const Incentive = () => {
  const { incConfig, setIncConfig, resetIncConfig, profile } = useAppStore();
  const [view, setView] = useState('calc'); // 'calc' or 'config'
  const [activeTab, setActiveTab] = useState('SP'); // For Config

  // Local state for calculation inputs (Rows)
  const [rows, setRows] = useState({ sp: [], tb: [], wr: [], cp: [], npc: [], bun: [] });
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
            cp: [{ qty: 1, rate: 0, fm: false }],
            npc: [{ qty: 1, rate: 0, fm: false }],
            bun: [{ qty: 1, rate: 0, fm: false }]
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

      // Kickers
      let kickTot = 0;
      if(meta.k_ff7 > 0) kickTot += meta.k_ff7 * (meta.t_ff7==='high' ? c.cp.kickers.ff7.h : c.cp.kickers.ff7.l);
      if(meta.k_s25 > 0) kickTot += meta.k_s25 * (meta.t_s25==='high' ? c.cp.kickers.s25.h : c.cp.kickers.s25.l);

      let cpVol = cpTot; // Base volume incentive
      if(cpQ>=8) cpVol*=1.2; // Multiplier for high volume
      if(cpQ>0 && cpQ<3) { cpVol=0; logs.push({c:"Care+", n:"Gate < 3", v:0}); } // Gate check

      let cpFinal = cpVol + kickTot;
      logs.push({c:"Care+", n:`Vol: ${cpQ}, Kickers: ${kickTot}`, v:cpFinal});

      let npcTot=0; rows.npc.forEach(r => npcTot += (r.qty||0)*r.rate);
      let npcFin = Math.min(npcTot, c.caps.npc);
      logs.push({c:"Note PC", n:npcTot>npcFin?"Capped":"", v:npcFin});

      let bunTot = 0;
      rows.bun.forEach(r => bunTot += (r.qty||0)*r.rate);
      let bunFin = Math.min(bunTot, c.caps.bun);
      logs.push({c:"Bundles", n:bunTot>bunFin?"Capped":"", v:bunFin});

      let accTot = 0;
      const ab = meta.accBase || (spRaw * 25);
      let accPct = 0;
      if(ab > 0 && meta.channel!=='exclusive') {
          accPct = (meta.accVal/ab)*100;
          for(let t of c.acc) { if(accPct>=t.min) { accTot = t.rate; break; } }
      }
      logs.push({c:"Accessories", n:`Base: ${ab.toFixed(0)} (${accPct.toFixed(1)}%)`, v:accTot});

      let grand = comb + tbFin + npcFin + cpFinal + bunFin + accTot;
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

  // --- CONFIG HANDLERS ---
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

  const addConfigItem = (path, template) => {
      const newConfig = JSON.parse(JSON.stringify(incConfig));
      const parts = path.split('.');
      let obj = newConfig;
      for (let i = 0; i < parts.length; i++) {
          obj = obj[parts[i]];
      }
      if(Array.isArray(obj)) {
          obj.push(template);
          setIncConfig(newConfig);
      }
  };

  const removeConfigItem = (path, index) => {
      const newConfig = JSON.parse(JSON.stringify(incConfig));
      const parts = path.split('.');
      let obj = newConfig;
      for (let i = 0; i < parts.length; i++) {
          obj = obj[parts[i]];
      }
      if(Array.isArray(obj)) {
          obj.splice(index, 1);
          setIncConfig(newConfig);
      }
  };

  const ConfigSection = () => (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg mb-24 h-full flex flex-col">
       <div className="flex justify-between items-center mb-4">
         <h3 className="font-bold text-lg dark:text-white">Configuration</h3>
         <div className="flex gap-2">
            <button onClick={resetIncConfig} className="text-red-500 p-2"><RotateCcw size={16}/></button>
            <button onClick={() => setView('calc')} className="text-indigo-500 p-2"><Save size={16}/></button>
         </div>
       </div>

       <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 mb-4 overflow-x-auto no-scrollbar shrink-0">
         {['SP','TB','WR','CP','NPC','Bun','Acc','Misc'].map(t => (
             <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2 font-bold text-sm whitespace-nowrap ${activeTab===t ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}>{t}</button>
         ))}
       </div>

       <div className="flex-1 overflow-y-auto pb-12 space-y-4">
        {activeTab === 'SP' && (
            <>
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="font-bold text-sm text-blue-600">Slabs</h4>
                        <button onClick={() => addConfigItem('sp.slabs', {min:0, rate:0, label:'New'})} className="text-emerald-500"><PlusCircle size={16}/></button>
                    </div>
                    {incConfig.sp.slabs.map((s, i) => (
                        <div key={i} className="flex gap-2 mb-2 items-center">
                            <input placeholder="Min" type="number" value={s.min} onChange={(e)=>updateConfig(`sp.slabs.${i}.min`, e.target.value)} className="w-1/3 p-2 border rounded text-xs" />
                            <input placeholder="Rate" type="number" value={s.rate} onChange={(e)=>updateConfig(`sp.slabs.${i}.rate`, e.target.value)} className="w-1/3 p-2 border rounded text-xs" />
                            <input placeholder="Label" value={s.label} onChange={(e)=>updateConfig(`sp.slabs.${i}.label`, e.target.value)} className="w-1/3 p-2 border rounded text-xs" />
                            <button onClick={() => removeConfigItem('sp.slabs', i)} className="text-red-400"><Trash2 size={14}/></button>
                        </div>
                    ))}
                </div>
                <div>
                    <h4 className="font-bold text-sm text-blue-600 mb-2">Gates (Multiplier)</h4>
                    <div className="flex justify-between items-center mb-1">
                        <div className="text-xs font-bold dark:text-slate-300">Standard</div>
                        <button onClick={() => addConfigItem('sp.gates.std', {min:0, p:1.0})} className="text-emerald-500"><PlusCircle size={14}/></button>
                    </div>
                    {incConfig.sp.gates.std.map((g, i) => (
                         <div key={'g'+i} className="flex gap-2 mb-1 items-center">
                             <span className="text-xs dark:text-slate-400">Min</span>
                             <input type="number" value={g.min} onChange={(e)=>updateConfig(`sp.gates.std.${i}.min`, e.target.value)} className="w-16 p-2 border rounded text-xs" />
                             <span className="text-xs dark:text-slate-400">Mult</span>
                             <input type="number" value={g.p} onChange={(e)=>updateConfig(`sp.gates.std.${i}.p`, e.target.value)} className="w-16 p-2 border rounded text-xs" />
                             <button onClick={() => removeConfigItem('sp.gates.std', i)} className="text-red-400 ml-auto"><Trash2 size={14}/></button>
                         </div>
                    ))}

                    <div className="flex justify-between items-center mb-1 mt-3">
                        <div className="text-xs font-bold dark:text-slate-300">SIS/Pro/New</div>
                        <button onClick={() => addConfigItem('sp.gates.sis', {min:0, p:1.0})} className="text-emerald-500"><PlusCircle size={14}/></button>
                    </div>
                    {incConfig.sp.gates.sis.map((g, i) => (
                         <div key={'s'+i} className="flex gap-2 mb-1 items-center">
                             <span className="text-xs dark:text-slate-400">Min</span>
                             <input type="number" value={g.min} onChange={(e)=>updateConfig(`sp.gates.sis.${i}.min`, e.target.value)} className="w-16 p-2 border rounded text-xs" />
                             <span className="text-xs dark:text-slate-400">Mult</span>
                             <input type="number" value={g.p} onChange={(e)=>updateConfig(`sp.gates.sis.${i}.p`, e.target.value)} className="w-16 p-2 border rounded text-xs" />
                             <button onClick={() => removeConfigItem('sp.gates.sis', i)} className="text-red-400 ml-auto"><Trash2 size={14}/></button>
                         </div>
                    ))}
                </div>
                <div>
                     <h4 className="font-bold text-sm text-blue-600 mb-2">Params</h4>
                     <div className="flex gap-2 mb-2 items-center">
                        <label className="text-xs w-1/2">Focus Multiplier</label>
                        <input type="number" value={incConfig.sp.fm_mult} onChange={(e)=>updateConfig('sp.fm_mult', e.target.value)} className="w-20 p-2 border rounded text-xs" />
                     </div>
                     <div className="flex gap-2 mb-2 items-center">
                        <label className="text-xs w-1/2">Target Threshold</label>
                        <input type="number" value={incConfig.sp.target_thresh} onChange={(e)=>updateConfig('sp.target_thresh', e.target.value)} className="w-20 p-2 border rounded text-xs" />
                     </div>
                </div>
            </>
        )}

        {activeTab === 'TB' && (
            <>
                <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-sm text-blue-600">Volume Slabs</h4>
                    <button onClick={() => addConfigItem('tb.slabs', {min:0, rate:0, label:'New'})} className="text-emerald-500"><PlusCircle size={16}/></button>
                </div>
                {incConfig.tb.slabs.map((s, i) => (
                    <div key={i} className="flex gap-2 mb-2 items-center">
                         <input type="number" value={s.min} onChange={(e)=>updateConfig(`tb.slabs.${i}.min`, e.target.value)} className="w-1/3 p-2 border rounded text-xs" placeholder="Min" />
                         <input type="number" value={s.rate} onChange={(e)=>updateConfig(`tb.slabs.${i}.rate`, e.target.value)} className="w-1/3 p-2 border rounded text-xs" placeholder="Rate" />
                         <input value={s.label} onChange={(e)=>updateConfig(`tb.slabs.${i}.label`, e.target.value)} className="w-1/3 p-2 border rounded text-xs" placeholder="Label" />
                         <button onClick={() => removeConfigItem('tb.slabs', i)} className="text-red-400"><Trash2 size={14}/></button>
                    </div>
                ))}

                <div className="flex justify-between items-center mt-4 mb-2">
                    <h4 className="font-bold text-sm text-blue-600">Focus Models</h4>
                    <button onClick={() => addConfigItem('tb.focus', {name:'New Model', rate:0, keys:''})} className="text-emerald-500"><PlusCircle size={16}/></button>
                </div>
                {incConfig.tb.focus.map((f, i) => (
                    <div key={i} className="flex gap-2 mb-2 items-center">
                        <input value={f.name} onChange={(e)=>updateConfig(`tb.focus.${i}.name`, e.target.value)} className="w-1/2 p-2 border rounded text-xs" placeholder="Model Name" />
                        <input type="number" value={f.rate} onChange={(e)=>updateConfig(`tb.focus.${i}.rate`, e.target.value)} className="w-1/4 p-2 border rounded text-xs" placeholder="Rate" />
                        <button onClick={() => removeConfigItem('tb.focus', i)} className="text-red-400"><Trash2 size={14}/></button>
                    </div>
                ))}
            </>
        )}

        {activeTab === 'WR' && (
            <>
                <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-sm text-blue-600">Wearables</h4>
                    <button onClick={() => addConfigItem('wr', {name:'New Item', rate:0, keys:''})} className="text-emerald-500"><PlusCircle size={16}/></button>
                </div>
                {incConfig.wr.map((w, i) => (
                    <div key={i} className="flex gap-2 mb-2 items-center">
                        <input value={w.name} onChange={(e)=>updateConfig(`wr.${i}.name`, e.target.value)} className="w-2/3 p-2 border rounded text-xs" />
                        <input type="number" value={w.rate} onChange={(e)=>updateConfig(`wr.${i}.rate`, e.target.value)} className="w-1/3 p-2 border rounded text-xs" />
                        <button onClick={() => removeConfigItem('wr', i)} className="text-red-400"><Trash2 size={14}/></button>
                    </div>
                ))}
            </>
        )}

        {activeTab === 'CP' && (
            <>
                <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-sm text-blue-600">Slabs</h4>
                    <button onClick={() => addConfigItem('cp.slabs', {min:0, rate:0, label:'New'})} className="text-emerald-500"><PlusCircle size={16}/></button>
                </div>
                {incConfig.cp.slabs.map((s, i) => (
                    <div key={i} className="flex gap-2 mb-2 items-center">
                         <input type="number" value={s.min} onChange={(e)=>updateConfig(`cp.slabs.${i}.min`, e.target.value)} className="w-1/3 p-2 border rounded text-xs" placeholder="Min" />
                         <input type="number" value={s.rate} onChange={(e)=>updateConfig(`cp.slabs.${i}.rate`, e.target.value)} className="w-1/3 p-2 border rounded text-xs" placeholder="Rate" />
                         <input value={s.label} onChange={(e)=>updateConfig(`cp.slabs.${i}.label`, e.target.value)} className="w-1/3 p-2 border rounded text-xs" placeholder="Label" />
                         <button onClick={() => removeConfigItem('cp.slabs', i)} className="text-red-400"><Trash2 size={14}/></button>
                    </div>
                ))}

                <h4 className="font-bold text-sm text-blue-600 mt-4 mb-2">Kickers</h4>
                <div className="mb-4">
                    <h5 className="text-xs font-bold dark:text-slate-300">Flip/Fold 7 (S25)</h5>
                    <div className="flex gap-2 mt-1">
                        <label className="text-xs w-20">Low Tier</label>
                        <input type="number" value={incConfig.cp.kickers.ff7.l} onChange={(e)=>updateConfig('cp.kickers.ff7.l', e.target.value)} className="w-20 p-2 border rounded text-xs" />
                    </div>
                    <div className="flex gap-2 mt-1">
                        <label className="text-xs w-20">High Tier</label>
                        <input type="number" value={incConfig.cp.kickers.ff7.h} onChange={(e)=>updateConfig('cp.kickers.ff7.h', e.target.value)} className="w-20 p-2 border rounded text-xs" />
                    </div>
                </div>
                <div>
                    <h5 className="text-xs font-bold dark:text-slate-300">S25 / Flagship</h5>
                    <div className="flex gap-2 mt-1">
                        <label className="text-xs w-20">Low Tier</label>
                        <input type="number" value={incConfig.cp.kickers.s25.l} onChange={(e)=>updateConfig('cp.kickers.s25.l', e.target.value)} className="w-20 p-2 border rounded text-xs" />
                    </div>
                    <div className="flex gap-2 mt-1">
                        <label className="text-xs w-20">High Tier</label>
                        <input type="number" value={incConfig.cp.kickers.s25.h} onChange={(e)=>updateConfig('cp.kickers.s25.h', e.target.value)} className="w-20 p-2 border rounded text-xs" />
                    </div>
                </div>
            </>
        )}

        {activeTab === 'NPC' && (
            <>
                <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-sm text-blue-600">Model Rates</h4>
                    <button onClick={() => addConfigItem('npc', {name:'New', rate:0})} className="text-emerald-500"><PlusCircle size={16}/></button>
                </div>
                {incConfig.npc.map((n, i) => (
                    <div key={i} className="flex gap-2 mb-2 items-center">
                        <input value={n.name} onChange={(e)=>updateConfig(`npc.${i}.name`, e.target.value)} className="w-2/3 p-2 border rounded text-xs" />
                        <input type="number" value={n.rate} onChange={(e)=>updateConfig(`npc.${i}.rate`, e.target.value)} className="w-1/3 p-2 border rounded text-xs" />
                        <button onClick={() => removeConfigItem('npc', i)} className="text-red-400"><Trash2 size={14}/></button>
                    </div>
                ))}
            </>
        )}

        {activeTab === 'Bun' && (
            <>
                <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-sm text-blue-600">Standard Rates</h4>
                    <button onClick={() => addConfigItem('bun.std', {name:'Bundle', rate:0})} className="text-emerald-500"><PlusCircle size={16}/></button>
                </div>
                {incConfig.bun.std.map((b, i) => (
                    <div key={i} className="flex gap-2 mb-2 items-center">
                        <input value={b.name} onChange={(e)=>updateConfig(`bun.std.${i}.name`, e.target.value)} className="w-2/3 p-2 border rounded text-xs" />
                        <input type="number" value={b.rate} onChange={(e)=>updateConfig(`bun.std.${i}.rate`, e.target.value)} className="w-1/3 p-2 border rounded text-xs" />
                        <button onClick={() => removeConfigItem('bun.std', i)} className="text-red-400"><Trash2 size={14}/></button>
                    </div>
                ))}

                <div className="flex justify-between items-center mt-4 mb-2">
                    <h4 className="font-bold text-sm text-blue-600">Exclusive Rates</h4>
                    <button onClick={() => addConfigItem('bun.excl', {name:'Bundle', rate:0})} className="text-emerald-500"><PlusCircle size={16}/></button>
                </div>
                {incConfig.bun.excl.map((b, i) => (
                    <div key={i} className="flex gap-2 mb-2 items-center">
                        <input value={b.name} onChange={(e)=>updateConfig(`bun.excl.${i}.name`, e.target.value)} className="w-2/3 p-2 border rounded text-xs" />
                        <input type="number" value={b.rate} onChange={(e)=>updateConfig(`bun.excl.${i}.rate`, e.target.value)} className="w-1/3 p-2 border rounded text-xs" />
                        <button onClick={() => removeConfigItem('bun.excl', i)} className="text-red-400"><Trash2 size={14}/></button>
                    </div>
                ))}
            </>
        )}

        {activeTab === 'Acc' && (
            <>
                <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-sm text-blue-600">Accessory Attach Rates</h4>
                    <button onClick={() => addConfigItem('acc', {min:0, rate:0})} className="text-emerald-500"><PlusCircle size={16}/></button>
                </div>
                {incConfig.acc.map((a, i) => (
                    <div key={i} className="flex gap-2 mb-2 items-center">
                        <span className="text-xs w-20 dark:text-slate-400">Min %</span>
                        <input type="number" value={a.min} onChange={(e)=>updateConfig(`acc.${i}.min`, e.target.value)} className="w-20 p-2 border rounded text-xs" placeholder="Min" />
                        <input type="number" value={a.rate} onChange={(e)=>updateConfig(`acc.${i}.rate`, e.target.value)} className="flex-1 p-2 border rounded text-xs" placeholder="Rate" />
                        <button onClick={() => removeConfigItem('acc', i)} className="text-red-400"><Trash2 size={14}/></button>
                    </div>
                ))}
            </>
        )}

        {activeTab === 'Misc' && (
            <div className="space-y-4">
                <div>
                     <h4 className="font-bold text-sm text-blue-600 mb-2">Payout Caps</h4>
                     <div className="flex justify-between items-center mb-2"><label className="text-xs dark:text-slate-300">Global Cap</label><input type="number" value={incConfig.caps.global} onChange={(e)=>updateConfig('caps.global', e.target.value)} className="border p-1 w-24 text-xs rounded"/></div>
                     <div className="flex justify-between items-center mb-2"><label className="text-xs dark:text-slate-300">Tablet Cap</label><input type="number" value={incConfig.caps.tb} onChange={(e)=>updateConfig('caps.tb', e.target.value)} className="border p-1 w-24 text-xs rounded"/></div>
                     <div className="flex justify-between items-center mb-2"><label className="text-xs dark:text-slate-300">Note PC Cap</label><input type="number" value={incConfig.caps.npc} onChange={(e)=>updateConfig('caps.npc', e.target.value)} className="border p-1 w-24 text-xs rounded"/></div>
                     <div className="flex justify-between items-center mb-2"><label className="text-xs dark:text-slate-300">Bundle Cap</label><input type="number" value={incConfig.caps.bun} onChange={(e)=>updateConfig('caps.bun', e.target.value)} className="border p-1 w-24 text-xs rounded"/></div>
                </div>
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

            <div className="mb-3">
                 <label className="text-xs font-bold text-slate-400 block mb-1">Store Type / Channel</label>
                 <select value={meta.channel} onChange={(e)=>setMeta({...meta, channel: e.target.value})} className="w-full p-2 text-xs rounded border dark:bg-slate-900 dark:text-white">
                     <option value="standard">Standard Store</option>
                     <option value="sis_pro">SIS / Pro / New Joinee</option>
                     <option value="exclusive">Exclusive / Experience</option>
                 </select>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
                 <div><label className="font-bold text-slate-400 block">Target</label><input type="number" value={meta.target} onChange={(e)=>setMeta({...meta, target: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 dark:text-white border-none rounded p-1"/></div>
                 <div><label className="font-bold text-slate-400 block">Achieved</label><div className="font-bold text-lg dark:text-white">{result.spQ} <span className="text-xs text-slate-400">({result.ach}%)</span></div></div>
            </div>
        </div>

        {/* Smartphones */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border-l-4 border-l-blue-600 shadow-sm p-3">
             <div className="flex justify-between items-center mb-2">
                 <span className="font-bold text-sm dark:text-white">Smartphones</span>
                 <button onClick={() => addRow('sp')} className="text-xs bg-slate-100 dark:bg-slate-700 dark:text-white p-1 rounded">+ Add</button>
             </div>
             {rows.sp.map((r, i) => (
                 <div key={i} className="flex gap-2 mb-2 items-center">
                     <select value={r.rate} onChange={(e)=>updRow('sp', i, 'rate', e.target.value)} className="flex-1 text-xs p-2 rounded border dark:bg-slate-900 dark:text-white">
                         <option value="0">Select Slab</option>
                         {incConfig.sp.slabs.map((s, idx) => <option key={idx} value={s.rate}>{s.label} ({s.rate})</option>)}
                     </select>
                     <input type="number" value={r.qty} onChange={(e)=>updRow('sp', i, 'qty', e.target.value)} className="w-14 text-center text-xs p-2 rounded border dark:bg-slate-900 dark:text-white" />
                     <button onClick={() => delRow('sp', i)} className="text-red-400"><Trash2 size={14}/></button>
                 </div>
             ))}
        </div>

        {/* Tablets */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border-l-4 border-l-purple-600 shadow-sm p-3">
             <div className="flex justify-between items-center mb-2">
                 <span className="font-bold text-sm dark:text-white">Tablets</span>
                 <button onClick={() => addRow('tb')} className="text-xs bg-slate-100 dark:bg-slate-700 dark:text-white p-1 rounded">+ Add</button>
             </div>
             {rows.tb.map((r, i) => (
                 <div key={i} className="flex gap-2 mb-2 items-center">
                     <select value={r.rate} onChange={(e)=>updRow('tb', i, 'rate', e.target.value)} className="flex-1 text-xs p-2 rounded border dark:bg-slate-900 dark:text-white">
                         <option value="0">Select Model</option>
                         {incConfig.tb.slabs.map((s, idx) => <option key={'s'+idx} value={s.rate}>{s.label} ({s.rate})</option>)}
                         {incConfig.tb.focus.map((f, idx) => <option key={'f'+idx} value={f.rate}>{f.name} ({f.rate})</option>)}
                     </select>
                     <input type="number" value={r.qty} onChange={(e)=>updRow('tb', i, 'qty', e.target.value)} className="w-14 text-center text-xs p-2 rounded border dark:bg-slate-900 dark:text-white" />
                     <button onClick={() => delRow('tb', i)} className="text-red-400"><Trash2 size={14}/></button>
                 </div>
             ))}
        </div>

        {/* Wearables */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border-l-4 border-l-pink-500 shadow-sm p-3">
             <div className="flex justify-between items-center mb-2">
                 <span className="font-bold text-sm dark:text-white">Wearables</span>
                 <button onClick={() => addRow('wr')} className="text-xs bg-slate-100 dark:bg-slate-700 dark:text-white p-1 rounded">+ Add</button>
             </div>
             {rows.wr.map((r, i) => (
                 <div key={i} className="flex gap-2 mb-2 items-center">
                     <select value={r.rate} onChange={(e)=>updRow('wr', i, 'rate', e.target.value)} className="flex-1 text-xs p-2 rounded border dark:bg-slate-900 dark:text-white">
                         <option value="0">Select Model</option>
                         {incConfig.wr.map((w, idx) => <option key={idx} value={w.rate}>{w.name} ({w.rate})</option>)}
                     </select>
                     <input type="number" value={r.qty} onChange={(e)=>updRow('wr', i, 'qty', e.target.value)} className="w-14 text-center text-xs p-2 rounded border dark:bg-slate-900 dark:text-white" />
                     <button onClick={() => delRow('wr', i)} className="text-red-400"><Trash2 size={14}/></button>
                 </div>
             ))}
        </div>

        {/* Care+ */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border-l-4 border-l-indigo-600 shadow-sm p-3">
             <div className="flex justify-between items-center mb-2">
                 <span className="font-bold text-sm dark:text-white">Care+</span>
                 <button onClick={() => addRow('cp')} className="text-xs bg-slate-100 dark:bg-slate-700 dark:text-white p-1 rounded">+ Add</button>
             </div>
             {/* Volume Slabs */}
             {rows.cp.map((r, i) => (
                 <div key={i} className="flex gap-2 mb-2 items-center">
                     <select value={r.rate} onChange={(e)=>updRow('cp', i, 'rate', e.target.value)} className="flex-1 text-xs p-2 rounded border dark:bg-slate-900 dark:text-white">
                         <option value="0">Select Slab</option>
                         {incConfig.cp.slabs.map((s, idx) => <option key={idx} value={s.rate}>{s.label} ({s.rate})</option>)}
                     </select>
                     <input type="number" value={r.qty} onChange={(e)=>updRow('cp', i, 'qty', e.target.value)} className="w-14 text-center text-xs p-2 rounded border dark:bg-slate-900 dark:text-white" />
                     <button onClick={() => delRow('cp', i)} className="text-red-400"><Trash2 size={14}/></button>
                 </div>
             ))}

             {/* Kickers */}
             <div className="mt-4 border-t border-slate-100 dark:border-slate-700 pt-2">
                 <h5 className="text-xs font-bold text-indigo-500 mb-2">Kickers</h5>
                 <div className="grid grid-cols-2 gap-2">
                     <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded">
                         <label className="block text-[10px] text-slate-400">Flip/Fold 7 (S25)</label>
                         <div className="flex gap-1 mt-1">
                             <input type="number" placeholder="Qty" value={meta.k_ff7} onChange={(e)=>setMeta({...meta, k_ff7: parseFloat(e.target.value)||0})} className="w-12 text-xs p-1 border rounded dark:bg-slate-800 dark:text-white"/>
                             <select value={meta.t_ff7} onChange={(e)=>setMeta({...meta, t_ff7: e.target.value})} className="text-[10px] p-1 border rounded dark:bg-slate-800 dark:text-white">
                                 <option value="low">Low</option>
                                 <option value="high">High</option>
                             </select>
                         </div>
                     </div>
                     <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded">
                         <label className="block text-[10px] text-slate-400">S25 / Flagship</label>
                         <div className="flex gap-1 mt-1">
                             <input type="number" placeholder="Qty" value={meta.k_s25} onChange={(e)=>setMeta({...meta, k_s25: parseFloat(e.target.value)||0})} className="w-12 text-xs p-1 border rounded dark:bg-slate-800 dark:text-white"/>
                             <select value={meta.t_s25} onChange={(e)=>setMeta({...meta, t_s25: e.target.value})} className="text-[10px] p-1 border rounded dark:bg-slate-800 dark:text-white">
                                 <option value="low">Low</option>
                                 <option value="high">High</option>
                             </select>
                         </div>
                     </div>
                 </div>
             </div>
        </div>

        {/* Note PC */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border-l-4 border-l-teal-600 shadow-sm p-3">
             <div className="flex justify-between items-center mb-2">
                 <span className="font-bold text-sm dark:text-white">Note PC</span>
                 <button onClick={() => addRow('npc')} className="text-xs bg-slate-100 dark:bg-slate-700 dark:text-white p-1 rounded">+ Add</button>
             </div>
             {rows.npc.map((r, i) => (
                 <div key={i} className="flex gap-2 mb-2 items-center">
                     <select value={r.rate} onChange={(e)=>updRow('npc', i, 'rate', e.target.value)} className="flex-1 text-xs p-2 rounded border dark:bg-slate-900 dark:text-white">
                         <option value="0">Select Model</option>
                         {incConfig.npc.map((n, idx) => <option key={idx} value={n.rate}>{n.name} ({n.rate})</option>)}
                     </select>
                     <input type="number" value={r.qty} onChange={(e)=>updRow('npc', i, 'qty', e.target.value)} className="w-14 text-center text-xs p-2 rounded border dark:bg-slate-900 dark:text-white" />
                     <button onClick={() => delRow('npc', i)} className="text-red-400"><Trash2 size={14}/></button>
                 </div>
             ))}
        </div>

        {/* Bundles */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border-l-4 border-l-orange-500 shadow-sm p-3">
             <div className="flex justify-between items-center mb-2">
                 <span className="font-bold text-sm dark:text-white">Bundles</span>
                 <button onClick={() => addRow('bun')} className="text-xs bg-slate-100 dark:bg-slate-700 dark:text-white p-1 rounded">+ Add</button>
             </div>
             {rows.bun.map((r, i) => (
                 <div key={i} className="flex gap-2 mb-2 items-center">
                     <select value={r.rate} onChange={(e)=>updRow('bun', i, 'rate', e.target.value)} className="flex-1 text-xs p-2 rounded border dark:bg-slate-900 dark:text-white">
                         <option value="0">Select Bundle</option>
                         {incConfig.bun.std.map((b, idx) => <option key={'s'+idx} value={b.rate}>{b.name} (Std - {b.rate})</option>)}
                         {incConfig.bun.excl.map((b, idx) => <option key={'e'+idx} value={b.rate}>{b.name} (Excl - {b.rate})</option>)}
                     </select>
                     <input type="number" value={r.qty} onChange={(e)=>updRow('bun', i, 'qty', e.target.value)} className="w-14 text-center text-xs p-2 rounded border dark:bg-slate-900 dark:text-white" />
                     <button onClick={() => delRow('bun', i)} className="text-red-400"><Trash2 size={14}/></button>
                 </div>
             ))}
        </div>

        {/* Accessories */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border-l-4 border-l-yellow-500 shadow-sm p-3">
             <div className="flex justify-between items-center mb-2">
                 <span className="font-bold text-sm dark:text-white">Accessories</span>
             </div>
             <div className="flex flex-col gap-2">
                 <div>
                     <label className="text-xs text-slate-400">Total Accessory Sales (Value)</label>
                     <input type="number" value={meta.accVal} onChange={(e)=>setMeta({...meta, accVal: parseFloat(e.target.value)||0})} className="w-full p-2 border rounded text-sm font-bold dark:bg-slate-900 dark:text-white" />
                 </div>
                 <div className="flex justify-between items-center text-xs text-slate-500 mt-1">
                     <span>Base Target: {meta.accBase || (rows.sp.reduce((a,c)=>a+(c.qty* (c.fm?incConfig.sp.fm_mult:1)*25),0) || 0)}</span>
                     <span className="text-emerald-600 font-bold">Payout: ₹{Math.floor(result.logs.find(l=>l.c==='Accessories')?.v || 0)}</span>
                 </div>
             </div>
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
