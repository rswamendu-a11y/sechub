import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Plus, Trash2, Calendar, Smartphone } from 'lucide-react';

const Tracker = () => {
  const { sales, addSale, deleteSale, date, setDate } = useAppStore();
  const [saleItem, setSaleItem] = useState({ brand: 'samsung', model: '', variant: '', qty: 1, total: '' });
  const [isFormOpen, setIsFormOpen] = useState(false);

  const currentSales = sales[date] || { entries: [], models: '' };

  const handleAdd = (e) => {
    e.preventDefault();
    if (!saleItem.model || !saleItem.total) return;

    addSale(date, {
        brand: saleItem.brand,
        model: saleItem.model,
        variant: saleItem.variant, // Added Variant
        qty: Number(saleItem.qty),
        total: Number(saleItem.total)
    });

    // Reset form but KEEP DATE and BRAND
    setSaleItem(prev => ({ ...prev, model: '', variant: '', qty: 1, total: '' }));
    setIsFormOpen(false);
  };

  return (
    <div className="fade-in pb-24 p-4 space-y-4">
        {/* Header & Date Picker */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex justify-between items-center sticky top-0 z-20">
            <div>
                <h2 className="font-bold dark:text-white">Daily Tracker</h2>
                <p className="text-xs text-slate-400">Record your sales</p>
            </div>
            <div className="bg-slate-100 dark:bg-slate-700 p-2 rounded-xl flex items-center gap-2">
                <Calendar size={16} className="text-slate-500 dark:text-slate-300"/>
                <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="bg-transparent border-none text-xs font-bold w-28 dark:text-white outline-none"
                />
            </div>
        </div>

        {/* Daily Stats Summary */}
        <div className="grid grid-cols-2 gap-3">
            <div className="bg-indigo-600 text-white p-4 rounded-2xl shadow-lg shadow-indigo-500/20">
                <div className="text-xs opacity-70 font-bold uppercase">Total Value</div>
                <div className="text-2xl font-bold">₹{(currentSales.samsungVal || 0).toLocaleString()}</div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="text-xs text-slate-400 font-bold uppercase">Total Units</div>
                <div className="text-2xl font-bold dark:text-white">{currentSales.samsung || 0}</div>
            </div>
        </div>

        {/* Add Button */}
        <button
            onClick={() => setIsFormOpen(true)}
            className="w-full py-3 bg-slate-900 dark:bg-slate-700 text-white rounded-xl font-bold shadow-lg flex justify-center items-center gap-2"
        >
            <Plus size={18} /> Add Sale
        </button>

        {/* Form Modal */}
        {isFormOpen && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-slide-up">
                    <h3 className="font-bold text-lg mb-4 dark:text-white">Add New Sale</h3>
                    <form onSubmit={handleAdd} className="space-y-3">
                        <div>
                            <label className="text-xs font-bold text-slate-400">Brand</label>
                            <select
                                value={saleItem.brand}
                                onChange={(e) => setSaleItem({...saleItem, brand: e.target.value})}
                                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-700 dark:text-white border-none"
                            >
                                <option value="samsung">Samsung</option>
                                <option value="apple">Apple</option>
                                <option value="oppo">Oppo</option>
                                <option value="vivo">Vivo</option>
                                <option value="realme">Realme</option>
                                <option value="xiaomi">Xiaomi</option>
                                <option value="motorola">Motorola</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <label className="text-xs font-bold text-slate-400">Model</label>
                                <input
                                    required
                                    placeholder="e.g. S23 Ultra"
                                    value={saleItem.model}
                                    onChange={(e) => setSaleItem({...saleItem, model: e.target.value})}
                                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-700 dark:text-white border-none"
                                />
                            </div>
                            <div className="w-1/3">
                                <label className="text-xs font-bold text-slate-400">Variant</label>
                                <input
                                    placeholder="8/128"
                                    value={saleItem.variant}
                                    onChange={(e) => setSaleItem({...saleItem, variant: e.target.value})}
                                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-700 dark:text-white border-none"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                             <div className="w-1/3">
                                <label className="text-xs font-bold text-slate-400">Qty</label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    value={saleItem.qty}
                                    onChange={(e) => setSaleItem({...saleItem, qty: e.target.value})}
                                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-700 dark:text-white border-none text-center"
                                />
                             </div>
                             <div className="flex-1">
                                <label className="text-xs font-bold text-slate-400">Total Value</label>
                                <input
                                    type="number"
                                    required
                                    placeholder="0"
                                    value={saleItem.total}
                                    onChange={(e) => setSaleItem({...saleItem, total: e.target.value})}
                                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-700 dark:text-white border-none"
                                />
                             </div>
                        </div>
                        <div className="pt-2 flex gap-3">
                            <button type="button" onClick={() => setIsFormOpen(false)} className="flex-1 p-3 rounded-xl bg-slate-100 dark:bg-slate-700 font-bold text-slate-500">Cancel</button>
                            <button type="submit" className="flex-1 p-3 rounded-xl bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-500/30">Save</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* Sales List */}
        <div className="space-y-2">
            {(currentSales.entries || []).length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">No sales recorded for this date.</div>
            ) : (
                [...(currentSales.entries || [])].reverse().map((entry) => (
                    <div key={entry.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                                <Smartphone size={18} className="text-slate-500 dark:text-slate-300" />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm dark:text-white">{entry.model} <span className="text-slate-400 text-xs font-normal">{entry.variant ? `(${entry.variant})` : ''}</span></h4>
                                <p className="text-xs text-slate-400">{entry.brand} • {new Date(entry.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="font-bold text-indigo-600 dark:text-indigo-400">₹{entry.total.toLocaleString()}</div>
                            <div className="flex items-center justify-end gap-2">
                                <span className="text-xs font-bold text-slate-400">{entry.qty}u</span>
                                <button onClick={() => deleteSale(date, entry.id)} className="text-red-400 hover:bg-red-50 p-1 rounded"><Trash2 size={14}/></button>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    </div>
  );
};

export default Tracker;
