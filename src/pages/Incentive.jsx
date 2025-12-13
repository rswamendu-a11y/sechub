import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Settings, Trash2, PlusCircle, Save, RotateCcw, Download, ChevronRight, X, Info, BarChart2, ShieldCheck, Tablet, Smartphone } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import Config from './Config';

const Incentive = () => {
    const { incConfig, setIncConfig, resetIncConfig, profile, sales } = useAppStore();
    const [view, setView] = useState('calc'); // 'calc' or 'config'

    // Local state to match prototype logic
    const [rows, setRows] = useState({ sp: [], tb: [], wr: [], cp: [], npc: [], bun: [] });
    const [meta, setMeta] = useState({
        // General
        target: 35, channel: 'standard', status: 'existing', pli: 0,
        // Accessories
        accVal: 0, accBaseOverride: '',
        // Wearables
        ringVol: 0,
        // Care+ Kickers (Dynamic)
        kickers: {}
    });

    const [result, setResult] = useState({ logs: [], grand: 0, spQ: 0, ach: 0 });
    const [samsungIncentive, setSamsungIncentive] = useState({ totalVal: 0, slabInc: 0, totalInc: 0 });

    // --- Init ---
    useEffect(() => {
        if (!rows.sp || rows.sp.length === 0) {
            setRows({
                sp: [{ qty: 1, rate: 0, fm: false }],
                tb: [{ qty: 1, rate: 0, fm: false }],
                wr: [{ qty: 1, rate: 0, fm: false }],
                cp: [{ qty: 1, rate: 0, fm: false, pm: false }],
                npc: [{ qty: 1, rate: 0, fm: false }],
                bun: []
            });
        }
    }, []);

    // --- Auto Populate from Sales ---
    useEffect(() => {
        calculateAutoIncentives();
    }, [sales]);

    // --- Calc Trigger ---
    useEffect(() => {
        calculate();
        calculateSamsungIncentive();
    }, [rows, meta, incConfig, sales]);

    // --- Helpers ---
    const getPerUnitIncentive = (price, type = 'sp') => {
        const slabs = type === 'tb' ? (incConfig.tb?.slabs || []) : (incConfig.sp?.slabs || []);
        if (!slabs || slabs.length === 0) return 0;
        const sortedSlabs = [...slabs].sort((a, b) => b.min - a.min);
        for (let s of sortedSlabs) {
            if (price >= s.min) return s.rate;
        }
        return 0;
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
                                if (isTablet) addToRows(tbRows, getPerUnitIncentive(price, 'tb'));
                                else addToRows(spRows, getPerUnitIncentive(price, 'sp'));
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
            setSamsungIncentive({ totalVal, slabInc, totalInc: slabInc });
        } catch (error) {
            setSamsungIncentive({ totalVal: 0, slabInc: 0, totalInc: 0 });
        }
    };

    // --- Row Ops ---
    const addRow = (key) => setRows({ ...rows, [key]: [...(rows[key] || []), { qty: 1, rate: 0, fm: false }] });
    const delRow = (key, idx) => {
        const newRows = [...(rows[key] || [])];
        newRows.splice(idx, 1);
        setRows({ ...rows, [key]: newRows });
    };
    const updRow = (key, idx, field, val) => {
        const newRows = [...(rows[key] || [])];
        if (newRows[idx]) {
            newRows[idx][field] = (field === 'rate' || field === 'qty') ? parseFloat(val) || 0 : val;
            setRows({ ...rows, [key]: newRows });
        }
    };
    const updateBun = (idx, qty, rate) => {
        // We use a different approach for Bundles to match prototype input style
        // but store it in rows.bun as before or simpler
        // Prototype uses data attributes. Here we can just store {name, qty, rate} in rows.bun
        // But the prototype renders specific inputs for each bundle.
        // Let's adapt: We will store bundle inputs in meta or rows.bun
        // Let's use rows.bun but index it by the config index
        // Or better: Just use meta.bundles = { [index]: qty }
        // Let's stick to rows.bun for now but we need to reconcile with the fixed list UI
    };

    // --- Calc Core ---
    const calculate = () => {
        try {
            const c = incConfig;
            if(!c) return;

            let logs = [];

            // Smartphones
            let spQ=0, spRaw=0;
            (rows.sp || []).forEach(r => {
                if(r && r.qty>0) { spQ+=r.qty; spRaw += r.qty * (r.fm ? r.rate*(c.sp?.fm_mult||2) : r.rate); }
            });
            const isExempt = (meta.channel === 'sis_pro' || meta.status === 'new_joinee');
            const gateSet = isExempt ? (c.sp?.gates?.sis || []) : (c.sp?.gates?.std || []);
            let gateM = 0;
            let gateN = "Missed Volume Gate";
            for(let g of gateSet) { if(g && spQ >= g.min) { gateM = g.p; gateN = ""; break; } }

            let spFin = spRaw * gateM;
            let spPot = spRaw * (gateM > 0 ? gateM : 1.0);
            const ach = meta.target > 0 ? spQ/meta.target : 0;
            let missed = gateM === 0;
            if(missed) gateN = `Missed Volume Gate (${spQ})`;

            logs.push({c:"Smartphones", n:gateN, v:spFin, pot:spPot, missed});

            // Tablets
            let tbTot=0;
            (rows.tb || []).forEach(r => tbTot += (r.qty||0)*r.rate);
            let tbFin = Math.min(tbTot, c.caps?.tb || 15000);
            logs.push({c:"Tablets", n:tbTot>tbFin?"Capped":"", v:tbFin});

            // Wearables
            let wrTot=0; (rows.wr || []).forEach(r => wrTot += (r.qty||0)*r.rate);
            logs.push({c:"Wearables", n:"", v:wrTot});

            let comb = spFin + wrTot;
            if(comb > (c.caps?.global || 75000)) { comb = c.caps.global; logs.push({c:"Global Cap", n:"Max 75k applied", v:0}); }

            // Care+
            let cpTot=0, cpQ=0;
            (rows.cp || []).forEach(r => {
                cpQ+=r.qty;
                let rVal = (r.qty||0)*r.rate;
                if (r.pm) rVal = rVal * 1.25;
                cpTot += rVal;
            });

            // Dynamic Kickers
            let kickTot = 0;
            (c.carePlus?.customKickers || []).forEach((k, i) => {
                const input = meta.kickers?.[i] || { qty: 0, tier: 'low' };
                if (input.qty > 0) {
                    const rate = input.tier === 'high' ? k.h_rate : k.l_rate;
                    kickTot += input.qty * rate;
                }
            });
            cpTot += kickTot;

            // Volume Kicker Legacy Check (Prototype: if cpQ>=8 cpTot*=1.2)
            // But verify with config if that rule exists. Prototype hardcodes `if(cpQ>=8) cpTot*=1.2`
            if(cpQ >= 8) cpTot *= 1.2;

            if(cpQ>0 && cpQ<3) { cpTot=0; logs.push({c:"Care+", n:"Gate < 3", v:0}); }
            else logs.push({c:"Care+", n:"", v:cpTot});

            // Note PC
            let npcTot=0; (rows.npc || []).forEach(r => npcTot += (r.qty||0)*r.rate);
            let npcFin = Math.min(npcTot, c.caps?.npc || 10000);
            logs.push({c:"Note PC", n:npcTot>npcFin?"Capped":"", v:npcFin});

            // Bundles
            // Prototype iterates over inputs. Here we need to sum based on local state or ref
            let bunTot = 0;
            // We need to capture bundle inputs from the UI.
            // Let's assume we store them in meta.bunInputs = { [index]: qty }
            const bunList = meta.channel === 'exclusive' ? (c.bundles?.items || []) : (c.bundles?.items || []); // Simplification
            // Actually prototype splits c.bun.std and c.bun.excl
            // Our config structure in Config.jsx uses bundles.items. Let's stick to that for now.
            if(meta.bunInputs) {
                Object.entries(meta.bunInputs).forEach(([idx, qty]) => {
                    const item = (c.bundles?.items || [])[idx];
                    if(item) bunTot += (qty * item.amount);
                });
            }
            let bunFin = Math.min(bunTot, c.caps?.bun || 5000);
            logs.push({c:"Bundles", n:bunTot>bunFin?"Capped":"", v:bunFin});

            // Accessories
            let accTot = 0;
            let ab = 0;
            if (meta.accBaseOverride !== undefined && meta.accBaseOverride !== '') {
                ab = parseFloat(meta.accBaseOverride);
            } else if (c.accessories?.baseTarget) {
                ab = parseFloat(c.accessories.baseTarget);
            } else {
                ab = (spRaw * 25);
            }
            let accPct = 0;
            if(ab > 0 && meta.channel!=='exclusive' && c.accessories?.items) {
                accPct = (meta.accVal/ab)*100;
                // Find bracket
                for (let item of c.accessories.items) {
                     if (accPct >= item.min) {
                         accTot = item.rate;
                         break; // Assuming sorted descending or first match wins? Prototype uses `for(let t of c.acc) if(pct>=t.min) { accTot=t.rate; break; }` so order matters. Config should be sorted.
                     }
                }
            }
            logs.push({c:"Accessories", n:`Base: ${ab.toFixed(0)}`, v:accTot});

            // Misc from Config
            if (c.misc?.amount) {
                logs.push({c:"Misc", n:"", v:c.misc.amount});
            }

            // Total
            const tentPLI = samsungIncentive.slabInc || 0;
            const pliAdj = meta.pli || 0;
            const totalPayout = (Number(tentPLI)||0) + (Number(pliAdj)||0) + comb + tbFin + npcFin + cpTot + bunFin + accTot + (Number(c.misc?.amount)||0);

            setResult({ logs, grand: totalPayout, spQ, ach: (ach*100).toFixed(0) });
        } catch (error) {
            console.error("Calculation Error:", error);
        }
    };

    const handleExport = async (type) => {
        const rowsData = result.logs.map(l => [l.c, l.n, Math.floor(l.v)]);
        rowsData.push(['Total', '', Math.floor(result.grand)]);

        if (type === 'pdf') {
            const doc = new jsPDF();
            doc.setFontSize(18);
            doc.text("Incentive Statement", 14, 20);
            doc.autoTable({ startY: 30, head: [['Category', 'Note', 'Amount']], body: rowsData });
            const pdfOutput = doc.output('datauristring');
            // Write and Share
            const fileName = `Incentive_${Date.now()}.pdf`;
            await Filesystem.writeFile({ path: fileName, data: pdfOutput.split(',')[1], directory: Directory.Cache });
            const uri = await Filesystem.getUri({ path: fileName, directory: Directory.Cache });
            await Share.share({ title: 'Incentive', url: uri.uri });
        }
    };

    if (view === 'config') return <Config onBack={() => setView('calc')} />;

    // --- RENDER HELPERS ---
    const renderSection = (color, title, key, dataRows, opts, fm = false, focus = []) => {
        const colors = {
            blue: 'border-l-blue-600',
            green: 'border-l-green-600',
            purple: 'border-l-purple-600',
            red: 'border-l-red-600',
            gray: 'border-l-slate-600',
            orange: 'border-l-orange-500'
        };
        const bgColors = {
            blue: 'bg-blue-50 dark:bg-blue-900/10',
            green: 'bg-green-50 dark:bg-green-900/10',
            purple: 'bg-purple-50 dark:bg-purple-900/10',
            red: 'bg-red-50 dark:bg-red-900/10',
            gray: 'bg-slate-50 dark:bg-slate-800/50',
            orange: 'bg-orange-50 dark:bg-orange-900/10'
        };

        return (
            <div className={`bg-white dark:bg-slate-800 rounded-xl border-l-4 ${colors[color]} shadow-sm overflow-hidden mb-4`}>
                <div className={`px-3 py-2 ${bgColors[color]} flex justify-between items-center`}>
                    <span className="font-bold text-sm dark:text-white">{title}</span>
                    <button onClick={() => addRow(key)} className="text-xs bg-white dark:bg-slate-700 px-2 py-1 rounded shadow-sm hover:bg-slate-50 dark:text-white">+ Add</button>
                </div>
                <div className="p-3 space-y-2">
                    {dataRows.map((r, i) => (
                        <div key={i} className="flex gap-2 items-center">
                            <select
                                value={r.rate}
                                onChange={(e) => updRow(key, i, 'rate', e.target.value)}
                                className="flex-1 text-xs p-2 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 dark:text-white"
                            >
                                <option value="0">Select</option>
                                {focus.length > 0 && (
                                    <optgroup label="Focus">
                                        {focus.map((f, fi) => <option key={`f${fi}`} value={f.rate}>{f.name} ({f.rate})</option>)}
                                    </optgroup>
                                )}
                                {opts && (
                                    <optgroup label="Standard">
                                        {opts.map((o, oi) => <option key={`o${oi}`} value={o.rate || o.amount}>{o.label || o.name} ({o.rate || o.amount})</option>)}
                                    </optgroup>
                                )}
                            </select>
                            <input
                                type="number"
                                value={r.qty}
                                onChange={(e) => updRow(key, i, 'qty', e.target.value)}
                                className="w-14 text-center text-xs p-2 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 dark:text-white"
                            />
                            {fm && (
                                <div className="flex items-center px-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded h-full">
                                    <input type="checkbox" checked={r.fm} onChange={(e) => updRow(key, i, 'fm', e.target.checked)} />
                                    <span className="text-[10px] ml-1 font-bold dark:text-white">FM</span>
                                </div>
                            )}
                            <button onClick={() => delRow(key, i)} className="text-red-400"><Trash2 size={14}/></button>
                        </div>
                    ))}
                    {dataRows.length === 0 && <div className="text-xs text-slate-400 text-center italic">No items added</div>}
                </div>
            </div>
        );
    };

    return (
        <div className="fade-in space-y-4 pb-24 p-4">
             {/* Dashboard Header */}
             <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="flex justify-between items-center mb-3">
                    <h2 className="font-bold dark:text-white">Dashboard</h2>
                    <button onClick={() => setView('config')} className="text-xs bg-slate-100 dark:bg-slate-700 dark:text-white px-3 py-1 rounded-lg flex items-center gap-1"><Settings size={14} /> Config</button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div>
                        <label className="font-bold text-slate-400 block">Channel</label>
                        <select value={meta.channel} onChange={(e)=>setMeta({...meta, channel: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 dark:text-white border-none rounded p-1">
                            <option value="standard">Standard</option>
                            <option value="sis_pro">SIS Pro</option>
                            <option value="exclusive">Exclusive</option>
                        </select>
                    </div>
                    <div>
                        <label className="font-bold text-slate-400 block">Status</label>
                        <select value={meta.status} onChange={(e)=>setMeta({...meta, status: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 dark:text-white border-none rounded p-1">
                            <option value="existing">Existing</option>
                            <option value="new_joinee">New Joinee</option>
                        </select>
                    </div>
                    <div>
                        <label className="font-bold text-slate-400 block">Target</label>
                        <input type="number" value={meta.target} onChange={(e)=>setMeta({...meta, target: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 dark:text-white border-none rounded p-1"/>
                    </div>
                    <div>
                        <label className="font-bold text-slate-400 block">Achieved</label>
                        <div className="font-bold text-lg dark:text-white">{result.spQ} <span className="text-xs text-slate-400">({result.ach}%)</span></div>
                    </div>
                </div>
             </div>

             {/* PLI Card (Replicated) */}
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

            {/* SECTIONS */}
            {renderSection('blue', 'Smartphones', 'sp', rows.sp, incConfig.sp?.slabs, true)}
            {renderSection('green', 'Tablets', 'tb', rows.tb, incConfig.tb?.slabs, false, incConfig.tb?.focus)}
            {renderSection('purple', 'Wearables', 'wr', rows.wr, incConfig.wearables?.models)}

            {/* Care+ Special */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border-l-4 border-l-red-600 shadow-sm overflow-hidden mb-4">
                <div className="px-3 py-2 bg-red-50 dark:bg-red-900/10 flex justify-between items-center">
                    <span className="font-bold text-sm dark:text-white">Care+</span>
                    <button onClick={() => addRow('cp')} className="text-xs bg-white dark:bg-slate-700 px-2 py-1 rounded shadow-sm hover:bg-slate-50 dark:text-white">+ Add</button>
                </div>
                <div className="p-3 space-y-2">
                    {(rows.cp || []).map((r, i) => (
                        <div key={i} className="flex gap-2 items-center">
                            <select value={r.rate} onChange={(e)=>updRow('cp', i, 'rate', e.target.value)} className="flex-1 text-xs p-2 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 dark:text-white">
                                <option value="0">Select Slab</option>
                                {(incConfig.carePlus?.slabs || []).map((s, idx) => <option key={idx} value={s.amount}>{s.name} ({s.amount})</option>)}
                            </select>
                            <input type="number" value={r.qty} onChange={(e)=>updRow('cp', i, 'qty', e.target.value)} className="w-14 text-center text-xs p-2 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 dark:text-white" />
                            <button onClick={() => delRow('cp', i)} className="text-red-400"><Trash2 size={14}/></button>
                        </div>
                    ))}

                    {/* Kickers Area */}
                    <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-100 dark:border-red-900/30 flex flex-wrap gap-4 mt-2">
                        {(incConfig.carePlus?.customKickers || []).map((k, i) => (
                             <div key={i} className="flex-1 min-w-[120px]">
                                <label className="text-[10px] font-bold text-red-800 dark:text-red-200 block">{k.name} Kicker</label>
                                <div className="flex gap-1">
                                    <input
                                        type="number"
                                        className="w-full p-1 text-xs rounded border border-red-200 dark:border-red-800 dark:bg-slate-900 dark:text-white"
                                        placeholder="Qty"
                                        value={meta.kickers?.[i]?.qty || ''}
                                        onChange={(e) => setMeta(prev => ({ ...prev, kickers: { ...prev.kickers, [i]: { ...(prev.kickers?.[i]), qty: parseInt(e.target.value)||0 } } }))}
                                    />
                                    <select
                                        className="text-xs p-1 rounded border border-red-200 dark:border-red-800 dark:bg-slate-900 dark:text-white"
                                        value={meta.kickers?.[i]?.tier || 'low'}
                                        onChange={(e) => setMeta(prev => ({ ...prev, kickers: { ...prev.kickers, [i]: { ...(prev.kickers?.[i]), tier: e.target.value } } }))}
                                    >
                                        <option value="low">Low</option>
                                        <option value="high">High</option>
                                    </select>
                                </div>
                             </div>
                        ))}
                    </div>
                </div>
            </div>

            {renderSection('gray', 'Note PC', 'npc', rows.npc, incConfig.notePC?.models)}

            {/* Bundles & Acc (Specific Layout) */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border-l-4 border-l-orange-500 shadow-sm p-3">
                <h3 className="font-bold text-sm text-orange-700 dark:text-orange-400 mb-2">Bundles & Acc</h3>
                <div className="grid grid-cols-3 gap-2 mb-3">
                    {(incConfig.bundles?.items || []).map((b, i) => (
                        <div key={i} className="bg-orange-50 dark:bg-orange-900/20 p-2 rounded text-center border border-orange-100 dark:border-orange-800/30">
                            <div className="text-[9px] font-bold uppercase truncate dark:text-orange-200" title={b.name}>{b.name}</div>
                            <input
                                type="number"
                                className="w-full mt-1 text-center text-xs p-1 rounded border-none shadow-sm dark:bg-slate-900 dark:text-white"
                                placeholder="Qty"
                                value={meta.bunInputs?.[i] || ''}
                                onChange={(e) => setMeta(prev => ({ ...prev, bunInputs: { ...prev.bunInputs, [i]: parseInt(e.target.value)||0 } }))}
                            />
                        </div>
                    ))}
                </div>
                <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex gap-2">
                    <input type="number" className="flex-1 p-2 bg-slate-50 dark:bg-slate-900 dark:text-white text-xs rounded border-none" placeholder="Acc Val" value={meta.accVal||''} onChange={(e)=>setMeta({...meta, accVal: e.target.value})}/>
                    <input type="number" className="flex-1 p-2 bg-slate-50 dark:bg-slate-900 dark:text-white text-xs rounded border-none" placeholder="Acc Base" value={meta.accBaseOverride||''} onChange={(e)=>setMeta({...meta, accBaseOverride: e.target.value})}/>
                </div>
            </div>

            {/* Bottom Floating Bar */}
            <div className="fixed bottom-16 left-0 w-full glass p-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center z-40">
                <div className="text-right flex-1 pr-4">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Total Payout</div>
                    <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">₹{Math.floor(result.grand).toLocaleString()}</div>
                </div>
                <div className="flex gap-2">
                    <button onClick={()=>handleExport('xlsx')} className="bg-emerald-600 text-white p-2 rounded-xl"><Download size={20}/></button>
                    <button onClick={()=>handleExport('pdf')} className="bg-red-600 text-white p-2 rounded-xl"><Download size={20}/></button>
                </div>
            </div>
        </div>
    );
};

export default Incentive;
