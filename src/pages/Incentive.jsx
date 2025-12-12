import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Settings, Trash2, PlusCircle, Save, RotateCcw, Download, ChevronRight, X, Info, BarChart2 } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Incentive Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-4 text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error loading Incentive Data</h2>
          <p className="text-sm text-slate-500 mb-4">Something went wrong. Please try resetting the configuration.</p>
          <button
            onClick={() => { window.location.reload(); }}
            className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold"
          >
            Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const IncentiveContent = () => {
  const { incConfig, setIncConfig, resetIncConfig, profile, sales } = useAppStore();
  const [view, setView] = useState('calc'); // 'calc' or 'config'
  const [activeTab, setActiveTab] = useState('SP'); // For Config

  // Local state for calculation inputs (Rows)
  const [rows, setRows] = useState({ sp: [], tb: [], wr: [], cp: [], npc: [], bun: [] });
  const [meta, setMeta] = useState({
      k_ff7: 0, t_ff7: 'low', k_s25: 0, t_s25: 'low',
      accVal: 0, accBase: 0, target: 35, channel: 'standard', status: 'existing',
      pli: 0
  });
  const [result, setResult] = useState({ logs: [], grand: 0, spQ: 0, ach: 0 });
  const [samsungIncentive, setSamsungIncentive] = useState({ totalVal: 0, slabInc: 0, totalInc: 0 });

  // Initialize rows on mount
  useEffect(() => {
    try {
        if (!rows.sp || rows.sp.length === 0) {
            setRows({
                sp: [{ qty: 1, rate: 0, fm: false }],
                tb: [{ qty: 1, rate: 0, fm: false }],
                wr: [{ qty: 1, rate: 0, fm: false }],
                cp: [{ qty: 1, rate: 0, fm: false }],
                npc: [{ qty: 1, rate: 0, fm: false }],
                bun: [{ qty: 1, rate: 0, fm: false }]
            });
        }
    } catch(e) { console.error(e); }
  }, []);

  // Sync Calc Logic
  useEffect(() => {
    calculate();
    calculateSamsungIncentive();
  }, [rows, meta, incConfig, sales]);

  // Auto-populate rows from Sales Data (Dealer Price Logic)
  useEffect(() => {
      calculateAutoIncentives();
  }, [sales]);

  const getPerUnitIncentive = (price) => {
      if (price >= 100000) return 700;
      if (price >= 70000) return 600;
      if (price >= 40000) return 500;
      if (price >= 30000) return 300;
      if (price >= 20000) return 200;
      if (price >= 15000) return 100;
      if (price >= 10000) return 75;
      return 25; // < 10k
  };

  const calculateAutoIncentives = () => {
      try {
        if (!sales) return;
        const today = new Date();
        const currentMonthStr = today.toISOString().slice(0, 7);

        const spRows = [];
        const tbRows = [];

        const addToRows = (arr, rate) => {
            const existing = arr.find(r => r.rate === rate);
            if (existing) existing.qty += 1;
            else arr.push({ qty: 1, rate, fm: false });
        };

        Object.keys(sales).forEach(dateStr => {
             if (dateStr.startsWith(currentMonthStr)) {
                 const entry = sales[dateStr];
                 if (entry && entry.entries && Array.isArray(entry.entries)) {
                     entry.entries.forEach(e => {
                         if (e.brand && e.brand.toLowerCase() === 'samsung') {
                             const price = e.total || 0;
                             const isTablet = (e.model || '').toLowerCase().includes('tab');

                             if (isTablet) {
                                 addToRows(tbRows, getPerUnitIncentive(price));
                             } else {
                                 addToRows(spRows, getPerUnitIncentive(price));
                             }
                         }
                     });
                 }
             }
        });

        if (spRows.length > 0 || tbRows.length > 0) {
            setRows(prev => ({
                ...prev,
                sp: spRows.length > 0 ? spRows : prev.sp,
                tb: tbRows.length > 0 ? tbRows : prev.tb
            }));
        }

      } catch (e) { console.error("Auto Calc Error", e); }
  };

  const calculateSamsungIncentive = () => {
      try {
          if (!sales) return;

          let totalVal = 0;
          const today = new Date();
          const currentMonthStr = today.toISOString().slice(0, 7);

          Object.keys(sales).forEach(dateStr => {
              if (dateStr.startsWith(currentMonthStr)) {
                  const entry = sales[dateStr];
                  if(entry && entry.entries && Array.isArray(entry.entries)) {
                      entry.entries.forEach(e => {
                          if(e && e.brand && (e.brand.toLowerCase() === 'samsung')) {
                              totalVal += (e.total || 0);
                          }
                      });
                  } else if (entry) {
                      if(entry.samsungVal) totalVal += (entry.samsungVal || 0);
                  }
              }
          });

          let slabInc = 0;
          if (totalVal < 600000) slabInc = 0;
          else if (totalVal < 800000) slabInc = 1500;
          else if (totalVal < 1000000) slabInc = 2500;
          else if (totalVal < 1200000) slabInc = 4000;
          else if (totalVal < 1500000) slabInc = 6000;
          else if (totalVal < 2000000) slabInc = 9000;
          else slabInc = 12000;

          const totalInc = slabInc;
          setSamsungIncentive({ totalVal, slabInc, totalInc });
      } catch (error) {
          console.error("Samsung Incentive Calc Error:", error);
          setSamsungIncentive({ totalVal: 0, slabInc: 0, totalInc: 0 });
      }
  };

  const addRow = (key) => {
      try {
        setRows({ ...rows, [key]: [...(rows[key] || []), { qty: 1, rate: 0, fm: false }] });
      } catch(e) { console.error(e); }
  };

  const delRow = (key, idx) => {
      try {
        const newRows = [...(rows[key] || [])];
        newRows.splice(idx, 1);
        setRows({ ...rows, [key]: newRows });
      } catch(e) { console.error(e); }
  };

  const updRow = (key, idx, field, val) => {
      try {
        const newRows = [...(rows[key] || [])];
        if (newRows[idx]) {
            newRows[idx][field] = (field === 'rate' || field === 'qty') ? parseFloat(val) || 0 : val;
            setRows({ ...rows, [key]: newRows });
        }
      } catch(e) { console.error(e); }
  };

  const calculate = () => {
      try {
          const c = incConfig;
          if(!c) return;

          let logs = [];

          // --- Smartphones ---
          let spQ=0, spRaw=0;
          (rows.sp || []).forEach(r => {
              if(r && r.qty>0) { spQ+=r.qty; spRaw += r.qty * (r.fm ? r.rate*(c.sp?.fm_mult||2) : r.rate); }
          });

          const isExempt = (meta.channel === 'sis_pro' || meta.status === 'new_joinee');
          const gateSet = isExempt ? (c.sp?.gates?.sis || []) : (c.sp?.gates?.std || []);
          let gateM = 0;
          let gateN = "Missed Gate";
          for(let g of gateSet) { if(g && spQ >= g.min) { gateM = g.p; gateN = ""; break; } }

          let spFin = spRaw * gateM;
          let spPot = spRaw * (gateM > 0 ? gateM : 1.0);
          const ach = meta.target > 0 ? spQ/meta.target : 0;

          let missed = false;
          if(!isExempt && meta.channel === 'standard' && ach < (c.sp?.target_thresh || 0.8)) {
              missed=true; gateN=`Missed Target (${spQ}/${meta.target})`;
          } else if(gateM === 0) {
              missed=true; gateN=`Missed Volume Gate (${spQ})`;
          }
          logs.push({c:"Smartphones", n:gateN, v:spFin, pot:spPot, missed});

          // --- Tablets ---
          let tbTot=0; (rows.tb || []).forEach(r => tbTot += (r.qty||0)*r.rate);
          let tbFin = Math.min(tbTot, c.caps?.tb || 15000);
          logs.push({c:"Tablets", n:tbTot>tbFin?"Capped":"", v:tbFin});

          // --- Wearables ---
          let wrTot=0; (rows.wr || []).forEach(r => wrTot += (r.qty||0)*r.rate);
          // Check for Volume Slabs if items doesn't cover it (Hybrid approach)
          // Currently WR is purely item based in UI, but if user adds slabs in config, we could support it.
          // For now, simple sum.
          logs.push({c:"Wearables", n:"", v:wrTot});

          let comb = spFin + wrTot;
          // For Grand Total Potential, we want (spRaw + wrTot) before caps/gates if possible.
          // User asked for "Potential Earnings (spRaw/Accumulated values) before monthly volume gates".
          let combPot = spRaw + wrTot;

          if(comb > (c.caps?.global || 75000)) { comb = c.caps.global; logs.push({c:"Global Cap", n:"Max 75k applied", v:0}); }

          // --- Care+ ---
          let cpTot=0, cpQ=0;
          (rows.cp || []).forEach(r => { cpQ+=r.qty; cpTot+=(r.qty||0)*r.rate; });

          let kickTot = 0;
          if(c.carePlus?.kickers?.ff7) {
            if(meta.k_ff7 > 0) kickTot += meta.k_ff7 * (meta.t_ff7==='high' ? (c.carePlus.kickers.ff7.h||0) : (c.carePlus.kickers.ff7.l||0));
          }
          if(c.carePlus?.kickers?.s25) {
            if(meta.k_s25 > 0) kickTot += meta.k_s25 * (meta.t_s25==='high' ? (c.carePlus.kickers.s25.h||0) : (c.carePlus.kickers.s25.l||0));
          }

          let cpVol = cpTot;
          if(cpQ>=8) cpVol*=1.2;

          // Potential ignores the <3 gate
          let cpPot = cpVol + kickTot;

          if(cpQ>0 && cpQ<3) { cpVol=0; logs.push({c:"Care+", n:"Gate < 3", v:0}); }

          let cpFinal = cpVol + kickTot;
          logs.push({c:"Care+", n:`Vol: ${cpQ}, Kickers: ${kickTot}`, v:cpFinal});

          // --- Note PC ---
          let npcTot=0; (rows.npc || []).forEach(r => npcTot += (r.qty||0)*r.rate);
          let npcFin = Math.min(npcTot, c.caps?.npc || 10000);
          logs.push({c:"Note PC", n:npcTot>npcFin?"Capped":"", v:npcFin});

          // --- Bundles ---
          let bunTot = 0;
          (rows.bun || []).forEach(r => bunTot += (r.qty||0)*r.rate);
          let bunFin = Math.min(bunTot, c.caps?.bun || 5000);
          logs.push({c:"Bundles", n:bunTot>bunFin?"Capped":"", v:bunFin});

          // --- Accessories ---
          let accTot = 0;
          const ab = meta.accBase || (spRaw * 25);
          let accPct = 0;
          // Updated accessor: c.accessories?.items
          if(ab > 0 && meta.channel!=='exclusive' && c.accessories?.items) {
              accPct = (meta.accVal/ab)*100;
              for(let t of c.accessories.items) { if(accPct>=t.min) { accTot = t.rate; break; } }
          }
          logs.push({c:"Accessories", n:`Base: ${ab.toFixed(0)} (${accPct.toFixed(1)}%)`, v:accTot});

          // --- Misc ---
          if (c.misc?.amount) {
              logs.push({c:"Misc", n:"", v:c.misc.amount});
          }

          const pli = samsungIncentive.slabInc || 0;

          // GRAND TOTAL: Use Potential values (spRaw, cpPot) and ignore caps/gates where applicable for "Accumulated" view.
          // Note: tbFin, npcFin, bunFin are capped values. Since they are usually per-unit or small caps, we might keep them or use Totals.
          // User asked for "Accumulated values before monthly volume gates".
          // SP has the main volume gate. CP has a small volume gate.
          // We will use spRaw instead of spFin.
          // We will use cpPot instead of cpFinal.
          // We will use tbTot, npcTot, bunTot (uncapped) or keep caps? "Accumulated values". Caps are usually hard limits.
          // Let's use the Raw Totals for specific categories if that's what "Potential" implies.
          // However, usually caps are "hard". Gates are "conditional".
          // I will use spRaw + wrTot (combPot) + tbTot + npcTot + cpPot + bunTot + accTot + misc + pli.
          // This represents "Total Earnings Generated" regardless of gates/caps.

          let grand = pli + combPot + tbTot + npcTot + cpPot + bunTot + accTot + (c.misc?.amount || 0) + (meta.pli || 0);

          // Check if user wants "Potential before GATES" but respecting CAPS?
          // "Potential Earnings (spRaw/Accumulated values) before monthly volume gates"
          // I'll stick to uncapped spRaw/wrTot but maybe respect category caps if they aren't "monthly volume gates"?
          // To be safe and show "Max Potential", I'll use the Raw values.

          setResult({ logs, grand, spQ, ach: (ach*100).toFixed(0) });
      } catch (error) {
          console.error("Calculation Error:", error);
      }
  };

  const handleExport = async () => {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("Incentive Report", 14, 20);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

      const rows = result.logs.map(l => [l.c, l.n, l.v]);
      rows.push(['PLI (Auto)', 'Tentative', samsungIncentive.slabInc]);
      rows.push(['PLI (Adj)', 'Manual', meta.pli || 0]);
      rows.push(['TOTAL (Potential)', 'Before Gates', result.grand]);

      doc.autoTable({
          startY: 35,
          head: [['Category', 'Details', 'Payout']],
          body: rows,
          theme: 'grid',
          headStyles: { fillColor: [79, 70, 229] }
      });

      const fileName = `Incentive_${Date.now()}.pdf`;
      try {
          const pdfOutput = doc.output('datauristring');
          await Filesystem.writeFile({
              path: fileName,
              data: pdfOutput.split(',')[1],
              directory: Directory.Cache
          });

          const uriResult = await Filesystem.getUri({
              path: fileName,
              directory: Directory.Cache
          });

          await Share.share({
              title: 'Incentive Report',
              url: uriResult.uri
          });
      } catch(e) {
          console.error(e);
          doc.save(fileName);
      }
  };

  // --- CONFIG HANDLERS ---
  const updateConfig = (path, val) => {
      try {
        const newConfig = JSON.parse(JSON.stringify(incConfig));
        const parts = path.split('.');
        let obj = newConfig;
        for (let i = 0; i < parts.length - 1; i++) {
            obj = obj[parts[i]];
        }
        obj[parts[parts.length - 1]] = parseFloat(val) || val;
        setIncConfig(newConfig);
      } catch(e) { console.error(e); }
  };

  const addConfigItem = (path, template) => {
      try {
        const newConfig = JSON.parse(JSON.stringify(incConfig));
        const parts = path.split('.');
        let obj = newConfig;
        for (let i = 0; i < parts.length; i++) {
            if (!obj[parts[i]]) obj[parts[i]] = []; // Ensure array exists
            obj = obj[parts[i]];
        }
        if(Array.isArray(obj)) {
            obj.push(template);
            setIncConfig(newConfig);
        }
      } catch(e) { console.error(e); }
  };

  const removeConfigItem = (path, index) => {
      try {
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
      } catch(e) { console.error(e); }
  };

  const ConfigSection = () => (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg mb-24 h-full flex flex-col">
       <div className="flex justify-between items-center mb-4">
         <div className="flex items-center gap-2">
            <button onClick={() => setView('calc')} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full">
                <ChevronRight className="rotate-180" size={20} />
            </button>
            <h3 className="font-bold text-lg dark:text-white">Configuration</h3>
         </div>
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
                        <h4 className="font-bold text-sm text-blue-600">Slabs (Dealer Price)</h4>
                        <button onClick={() => addConfigItem('sp.slabs', {min:0, rate:0, label:'New'})} className="text-emerald-500"><PlusCircle size={16}/></button>
                    </div>
                    {(incConfig.sp?.slabs || []).map((s, i) => (
                        <div key={i} className="flex gap-2 mb-2 items-center">
                            <input placeholder="Min Price" type="number" value={s.min} onChange={(e)=>updateConfig(`sp.slabs.${i}.min`, e.target.value)} className="w-1/3 p-2 border rounded text-xs" />
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
                    {(incConfig.sp?.gates?.std || []).map((g, i) => (
                         <div key={'g'+i} className="flex gap-2 mb-1 items-center">
                             <span className="text-xs dark:text-slate-400">Min</span>
                             <input type="number" value={g.min} onChange={(e)=>updateConfig(`sp.gates.std.${i}.min`, e.target.value)} className="w-16 p-2 border rounded text-xs" />
                             <span className="text-xs dark:text-slate-400">Mult</span>
                             <input type="number" value={g.p} onChange={(e)=>updateConfig(`sp.gates.std.${i}.p`, e.target.value)} className="w-16 p-2 border rounded text-xs" />
                             <button onClick={() => removeConfigItem('sp.gates.std', i)} className="text-red-400 ml-auto"><Trash2 size={14}/></button>
                         </div>
                    ))}
                </div>
            </>
        )}

        {activeTab === 'TB' && (
            <>
                <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-sm text-blue-600">Volume Slabs</h4>
                    <button onClick={() => addConfigItem('tb.slabs', {min:0, rate:0, label:'New'})} className="text-emerald-500"><PlusCircle size={16}/></button>
                </div>
                {(incConfig.tb?.slabs || []).map((s, i) => (
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
                {(incConfig.tb?.focus || []).map((f, i) => (
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
                    <h4 className="font-bold text-sm text-blue-600">Items (Model Based)</h4>
                    <button onClick={() => addConfigItem('wearables.items', {name:'New', rate:0, keys:''})} className="text-emerald-500"><PlusCircle size={16}/></button>
                </div>
                {(incConfig.wearables?.items || []).map((s, i) => (
                    <div key={i} className="flex gap-2 mb-2 items-center">
                        <input value={s.name} onChange={(e)=>updateConfig(`wearables.items.${i}.name`, e.target.value)} className="w-1/2 p-2 border rounded text-xs" placeholder="Model" />
                        <input type="number" value={s.rate} onChange={(e)=>updateConfig(`wearables.items.${i}.rate`, e.target.value)} className="w-1/4 p-2 border rounded text-xs" placeholder="Rate" />
                        <button onClick={() => removeConfigItem('wearables.items', i)} className="text-red-400"><Trash2 size={14}/></button>
                    </div>
                ))}

                <div className="flex justify-between items-center mt-4 mb-2">
                    <h4 className="font-bold text-sm text-blue-600">Volume Slabs</h4>
                    <button onClick={() => addConfigItem('wearables.slabs', {min:0, rate:0})} className="text-emerald-500"><PlusCircle size={16}/></button>
                </div>
                {(incConfig.wearables?.slabs || []).map((s, i) => (
                     <div key={i} className="flex gap-2 mb-2 items-center">
                         <input type="number" value={s.min} onChange={(e)=>updateConfig(`wearables.slabs.${i}.min`, e.target.value)} className="w-1/3 p-2 border rounded text-xs" placeholder="Min Qty" />
                         <input type="number" value={s.rate} onChange={(e)=>updateConfig(`wearables.slabs.${i}.rate`, e.target.value)} className="w-1/3 p-2 border rounded text-xs" placeholder="Rate/Unit" />
                         <button onClick={() => removeConfigItem('wearables.slabs', i)} className="text-red-400"><Trash2 size={14}/></button>
                     </div>
                ))}
            </>
        )}

        {activeTab === 'CP' && (
            <>
                <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-sm text-blue-600">Care+ Slabs</h4>
                    <button onClick={() => addConfigItem('carePlus.items', {min:0, rate:0, label:'New'})} className="text-emerald-500"><PlusCircle size={16}/></button>
                </div>
                {(incConfig.carePlus?.items || []).map((s, i) => (
                    <div key={i} className="flex gap-2 mb-2 items-center">
                        <input placeholder="Min" type="number" value={s.min} onChange={(e)=>updateConfig(`carePlus.items.${i}.min`, e.target.value)} className="w-1/3 p-2 border rounded text-xs" />
                        <input placeholder="Rate" type="number" value={s.rate} onChange={(e)=>updateConfig(`carePlus.items.${i}.rate`, e.target.value)} className="w-1/3 p-2 border rounded text-xs" />
                        <input placeholder="Label" value={s.label} onChange={(e)=>updateConfig(`carePlus.items.${i}.label`, e.target.value)} className="w-1/3 p-2 border rounded text-xs" />
                        <button onClick={() => removeConfigItem('carePlus.items', i)} className="text-red-400"><Trash2 size={14}/></button>
                    </div>
                ))}

                <div className="flex justify-between items-center mt-4 mb-2">
                    <h4 className="font-bold text-sm text-blue-600">Kicker Rates</h4>
                </div>
                {/* FF7 Kickers */}
                <div className="mb-2 p-2 border rounded">
                    <div className="text-xs font-bold mb-1">FF Series</div>
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <label className="text-[10px]">High Target Rate</label>
                            <input type="number" value={incConfig.carePlus?.kickers?.ff7?.h || 0} onChange={(e)=>updateConfig('carePlus.kickers.ff7.h', e.target.value)} className="w-full p-1 text-xs border rounded" />
                        </div>
                        <div className="flex-1">
                            <label className="text-[10px]">Low Target Rate</label>
                            <input type="number" value={incConfig.carePlus?.kickers?.ff7?.l || 0} onChange={(e)=>updateConfig('carePlus.kickers.ff7.l', e.target.value)} className="w-full p-1 text-xs border rounded" />
                        </div>
                    </div>
                </div>
                {/* S25 Kickers */}
                <div className="mb-2 p-2 border rounded">
                    <div className="text-xs font-bold mb-1">S Series</div>
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <label className="text-[10px]">High Target Rate</label>
                            <input type="number" value={incConfig.carePlus?.kickers?.s25?.h || 0} onChange={(e)=>updateConfig('carePlus.kickers.s25.h', e.target.value)} className="w-full p-1 text-xs border rounded" />
                        </div>
                        <div className="flex-1">
                            <label className="text-[10px]">Low Target Rate</label>
                            <input type="number" value={incConfig.carePlus?.kickers?.s25?.l || 0} onChange={(e)=>updateConfig('carePlus.kickers.s25.l', e.target.value)} className="w-full p-1 text-xs border rounded" />
                        </div>
                    </div>
                </div>
            </>
        )}

        {activeTab === 'NPC' && (
             <>
                 <div className="flex justify-between items-center mb-2">
                     <h4 className="font-bold text-sm text-blue-600">Items (Model Based)</h4>
                     <button onClick={() => addConfigItem('notePC.items', {name:'New', rate:0})} className="text-emerald-500"><PlusCircle size={16}/></button>
                 </div>
                 {(incConfig.notePC?.items || []).map((s, i) => (
                     <div key={i} className="flex gap-2 mb-2 items-center">
                         <input value={s.name} onChange={(e)=>updateConfig(`notePC.items.${i}.name`, e.target.value)} className="w-1/2 p-2 border rounded text-xs" placeholder="Model" />
                         <input type="number" value={s.rate} onChange={(e)=>updateConfig(`notePC.items.${i}.rate`, e.target.value)} className="w-1/4 p-2 border rounded text-xs" placeholder="Rate" />
                         <button onClick={() => removeConfigItem('notePC.items', i)} className="text-red-400"><Trash2 size={14}/></button>
                     </div>
                 ))}

                 <div className="flex justify-between items-center mt-4 mb-2">
                    <h4 className="font-bold text-sm text-blue-600">Volume Slabs</h4>
                    <button onClick={() => addConfigItem('notePC.slabs', {min:0, rate:0})} className="text-emerald-500"><PlusCircle size={16}/></button>
                </div>
                {(incConfig.notePC?.slabs || []).map((s, i) => (
                     <div key={i} className="flex gap-2 mb-2 items-center">
                         <input type="number" value={s.min} onChange={(e)=>updateConfig(`notePC.slabs.${i}.min`, e.target.value)} className="w-1/3 p-2 border rounded text-xs" placeholder="Min Qty" />
                         <input type="number" value={s.rate} onChange={(e)=>updateConfig(`notePC.slabs.${i}.rate`, e.target.value)} className="w-1/3 p-2 border rounded text-xs" placeholder="Rate/Unit" />
                         <button onClick={() => removeConfigItem('notePC.slabs', i)} className="text-red-400"><Trash2 size={14}/></button>
                     </div>
                ))}
             </>
        )}

        {activeTab === 'Bun' && (
             <>
                 <div className="flex justify-between items-center mb-2">
                     <h4 className="font-bold text-sm text-blue-600">Items (Model Based)</h4>
                     <button onClick={() => addConfigItem('bundles.items', {name:'New', rate:0})} className="text-emerald-500"><PlusCircle size={16}/></button>
                 </div>
                 {(incConfig.bundles?.items || []).map((s, i) => (
                     <div key={i} className="flex gap-2 mb-2 items-center">
                         <input value={s.name} onChange={(e)=>updateConfig(`bundles.items.${i}.name`, e.target.value)} className="w-1/2 p-2 border rounded text-xs" placeholder="Name" />
                         <input type="number" value={s.rate} onChange={(e)=>updateConfig(`bundles.items.${i}.rate`, e.target.value)} className="w-1/4 p-2 border rounded text-xs" placeholder="Rate" />
                         <button onClick={() => removeConfigItem('bundles.items', i)} className="text-red-400"><Trash2 size={14}/></button>
                     </div>
                 ))}

                 <div className="flex justify-between items-center mt-4 mb-2">
                    <h4 className="font-bold text-sm text-blue-600">Volume Slabs</h4>
                    <button onClick={() => addConfigItem('bundles.slabs', {min:0, rate:0})} className="text-emerald-500"><PlusCircle size={16}/></button>
                </div>
                {(incConfig.bundles?.slabs || []).map((s, i) => (
                     <div key={i} className="flex gap-2 mb-2 items-center">
                         <input type="number" value={s.min} onChange={(e)=>updateConfig(`bundles.slabs.${i}.min`, e.target.value)} className="w-1/3 p-2 border rounded text-xs" placeholder="Min Qty" />
                         <input type="number" value={s.rate} onChange={(e)=>updateConfig(`bundles.slabs.${i}.rate`, e.target.value)} className="w-1/3 p-2 border rounded text-xs" placeholder="Rate/Unit" />
                         <button onClick={() => removeConfigItem('bundles.slabs', i)} className="text-red-400"><Trash2 size={14}/></button>
                     </div>
                ))}
             </>
        )}

        {activeTab === 'Acc' && (
             <>
                 <div className="flex justify-between items-center mb-2">
                     <h4 className="font-bold text-sm text-blue-600">Accessories Slabs</h4>
                     <button onClick={() => addConfigItem('accessories.items', {min:0, rate:0})} className="text-emerald-500"><PlusCircle size={16}/></button>
                 </div>
                 {(incConfig.accessories?.items || []).map((s, i) => (
                     <div key={i} className="flex gap-2 mb-2 items-center">
                         <input type="number" value={s.min} onChange={(e)=>updateConfig(`accessories.items.${i}.min`, e.target.value)} className="w-1/2 p-2 border rounded text-xs" placeholder="Min %" />
                         <input type="number" value={s.rate} onChange={(e)=>updateConfig(`accessories.items.${i}.rate`, e.target.value)} className="w-1/4 p-2 border rounded text-xs" placeholder="Rate" />
                         <button onClick={() => removeConfigItem('accessories.items', i)} className="text-red-400"><Trash2 size={14}/></button>
                     </div>
                 ))}
             </>
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
                    <button onClick={handleExport} className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 px-3 py-1 rounded-lg flex items-center gap-1"><Download size={14} /> PDF</button>
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

        {/* Tentative PLI Card */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4 rounded-2xl shadow-lg relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-20"><BarChart2 size={64}/></div>
             <h3 className="font-bold text-sm opacity-80 mb-2">Tentative PLI (Est.)</h3>
             <div className="flex justify-between items-end mb-2">
                 <div>
                     <div className="text-3xl font-bold">₹{samsungIncentive.slabInc.toLocaleString()}</div>
                     <div className="text-xs opacity-80">Total Value: ₹{samsungIncentive.totalVal.toLocaleString()}</div>
                 </div>
                 <div className="text-right">
                     <label className="text-[10px] uppercase font-bold opacity-70 block">PLI Adjustment</label>
                     <input
                        type="number"
                        value={meta.pli}
                        onChange={(e) => setMeta({...meta, pli: parseFloat(e.target.value)||0})}
                        className="w-16 bg-white/20 border-none rounded text-right text-sm p-1 text-white placeholder-white"
                     />
                 </div>
             </div>
        </div>

        {/* Smartphones */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border-l-4 border-l-blue-600 shadow-sm p-3">
             <div className="flex justify-between items-center mb-2">
                 <span className="font-bold text-sm dark:text-white">Smartphones</span>
                 <button onClick={() => addRow('sp')} className="text-xs bg-slate-100 dark:bg-slate-700 dark:text-white p-1 rounded">+ Add</button>
             </div>
             {(rows.sp || []).map((r, i) => (
                 <div key={i} className="flex gap-2 mb-2 items-center">
                     <select value={r.rate} onChange={(e)=>updRow('sp', i, 'rate', e.target.value)} className="flex-1 text-xs p-2 rounded border dark:bg-slate-900 dark:text-white">
                         <option value="0">Select Slab</option>
                         {(incConfig.sp?.slabs || []).map((s, idx) => <option key={idx} value={s.rate}>{s.label} ({s.rate})</option>)}
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
             {(rows.tb || []).map((r, i) => (
                 <div key={i} className="flex gap-2 mb-2 items-center">
                     <select value={r.rate} onChange={(e)=>updRow('tb', i, 'rate', e.target.value)} className="flex-1 text-xs p-2 rounded border dark:bg-slate-900 dark:text-white">
                         <option value="0">Select Model</option>
                         {(incConfig.tb?.slabs || []).map((s, idx) => <option key={'s'+idx} value={s.rate}>{s.label} ({s.rate})</option>)}
                         {(incConfig.tb?.focus || []).map((f, idx) => <option key={'f'+idx} value={f.rate}>{f.name} ({f.rate})</option>)}
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
             {(rows.wr || []).map((r, i) => (
                 <div key={i} className="flex gap-2 mb-2 items-center">
                     <select value={r.rate} onChange={(e)=>updRow('wr', i, 'rate', e.target.value)} className="flex-1 text-xs p-2 rounded border dark:bg-slate-900 dark:text-white">
                         <option value="0">Select Model</option>
                         {(incConfig.wearables?.items || []).map((w, idx) => <option key={idx} value={w.rate}>{w.name} ({w.rate})</option>)}
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
             {(rows.cp || []).map((r, i) => (
                 <div key={i} className="flex gap-2 mb-2 items-center">
                     <select value={r.rate} onChange={(e)=>updRow('cp', i, 'rate', e.target.value)} className="flex-1 text-xs p-2 rounded border dark:bg-slate-900 dark:text-white">
                         <option value="0">Select Slab</option>
                         {(incConfig.carePlus?.items || []).map((s, idx) => <option key={idx} value={s.rate}>{s.label} ({s.rate})</option>)}
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
                         <label className="block text-[10px] text-slate-400">FF SERIES</label>
                         <div className="flex gap-1 mt-1">
                             <input type="number" placeholder="Qty" value={meta.k_ff7} onChange={(e)=>setMeta({...meta, k_ff7: parseFloat(e.target.value)||0})} className="w-12 text-xs p-1 border rounded dark:bg-slate-800 dark:text-white"/>
                             <select value={meta.t_ff7} onChange={(e)=>setMeta({...meta, t_ff7: e.target.value})} className="text-[10px] p-1 border rounded dark:bg-slate-800 dark:text-white">
                                 <option value="low">Low</option>
                                 <option value="high">High</option>
                             </select>
                         </div>
                     </div>
                     <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded">
                         <label className="block text-[10px] text-slate-400">S SERIES</label>
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
             {(rows.npc || []).map((r, i) => (
                 <div key={i} className="flex gap-2 mb-2 items-center">
                     <select value={r.rate} onChange={(e)=>updRow('npc', i, 'rate', e.target.value)} className="flex-1 text-xs p-2 rounded border dark:bg-slate-900 dark:text-white">
                         <option value="0">Select Model</option>
                         {(incConfig.notePC?.items || []).map((n, idx) => <option key={idx} value={n.rate}>{n.name} ({n.rate})</option>)}
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
             {(rows.bun || []).map((r, i) => (
                 <div key={i} className="flex gap-2 mb-2 items-center">
                     <select value={r.rate} onChange={(e)=>updRow('bun', i, 'rate', e.target.value)} className="flex-1 text-xs p-2 rounded border dark:bg-slate-900 dark:text-white">
                         <option value="0">Select Bundle</option>
                         {(incConfig.bundles?.items || []).map((b, idx) => <option key={'s'+idx} value={b.rate}>{b.name} (Std - {b.rate})</option>)}
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
                     <span>Base Target: {meta.accBase || ((rows.sp||[]).reduce((a,c)=>a+(c.qty* (c.fm?(incConfig.sp?.fm_mult||2):1)*25),0) || 0)}</span>
                     <span className="text-emerald-600 font-bold">Payout: ₹{Math.floor(result.logs.find(l=>l.c==='Accessories')?.v || 0)}</span>
                 </div>
                 {/* Misc / Other Section */}
                 <div className="mt-2 pt-2 border-t border-slate-100">
                     <label className="text-xs text-slate-400">Misc. Incentive / Adjustment</label>
                     <input type="number" value={incConfig.misc?.amount || 0} onChange={(e)=>updateConfig('misc.amount', e.target.value)} className="w-full p-2 border rounded text-sm font-bold dark:bg-slate-900 dark:text-white" />
                 </div>
             </div>
        </div>

        {/* Result Footer */}
        <div className="fixed bottom-16 left-0 w-full glass p-3 border-t border-slate-200 dark:border-slate-800 z-40">
             <div className="flex justify-between items-center">
                 <div className="text-right flex-1 pr-4">
                     <div className="text-[10px] font-bold text-slate-400 uppercase">Total Payout</div>
                     <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">₹{Math.floor(result.grand).toLocaleString()}</div>
                 </div>
             </div>
             <div className="text-center mt-1">
                 <span className="text-[10px] text-slate-400 italic">THIS INCENTIVE WORKING IS SUBJECT TO QUALIFICATION CRITERIA</span>
             </div>
        </div>
    </div>
  );
};

// Wrap export with Error Boundary
const Incentive = () => (
  <ErrorBoundary>
    <IncentiveContent />
  </ErrorBoundary>
);

export default Incentive;
