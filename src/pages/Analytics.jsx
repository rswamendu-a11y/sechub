import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const Analytics = () => {
  const { sales } = useAppStore();
  const brands = [
      {k:'samsung', l:'Samsung', c:'#3b82f6'},
      {k:'apple', l:'Apple', c:'#6366f1'},
      {k:'oppo', l:'Oppo', c:'#22c55e'},
      {k:'vivo', l:'Vivo', c:'#eab308'},
      {k:'realme', l:'Realme', c:'#f59e0b'},
      {k:'xiaomi', l:'Xiaomi', c:'#f97316'},
      {k:'motorola', l:'Motorola', c:'#ef4444'},
      {k:'other', l:'Other', c:'#94a3b8'}
  ];

  const getWeekRange = () => {
      const curr = new Date();
      const first = curr.getDate() - curr.getDay(); // First day is the day of the month - the day of the week
      const last = first + 6; // last day is the first day + 6

      const firstday = new Date(curr.setDate(first));
      const lastday = new Date(curr.setDate(last));

      // Return array of YYYY-MM-DD strings
      const dates = [];
      for (let d = new Date(firstday); d <= lastday; d.setDate(d.getDate() + 1)) {
          dates.push(d.toISOString().split('T')[0]);
      }
      return dates;
  };

  const weeklyStats = useMemo(() => {
      const weekDates = getWeekRange();
      const stats = {};
      brands.forEach(b => stats[b.k] = { qty: 0, val: 0 });

      weekDates.forEach(dateStr => {
          const entry = sales[dateStr];
          if (entry) {
             if (entry.entries) {
                 entry.entries.forEach(e => {
                     if (stats[e.brand]) {
                         stats[e.brand].qty += e.qty;
                         stats[e.brand].val += e.total;
                     }
                 });
             } else {
                 // Fallback
                 brands.forEach(b => {
                     if (stats[b.k]) {
                         stats[b.k].qty += (entry[b.k] || 0);
                         stats[b.k].val += (entry[b.k+'Val'] || 0);
                     }
                 });
             }
          }
      });
      return stats;
  }, [sales]);

  const [metric, setMetric] = useState('qty'); // qty | val

  const chartData = {
      labels: brands.map(b => b.l),
      datasets: [
          {
              label: metric === 'qty' ? 'Volume (Units)' : 'Value (₹)',
              data: brands.map(b => metric === 'qty' ? weeklyStats[b.k].qty : weeklyStats[b.k].val),
              backgroundColor: brands.map(b => b.c),
              borderRadius: 6,
          }
      ]
  };

  const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
          legend: { display: false },
          title: { display: false },
      },
      scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 } } },
          y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 } } }
      }
  };

  return (
    <div className="fade-in pb-24 p-4 space-y-6">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
             <div className="flex justify-between items-center mb-4">
                 <div>
                     <h2 className="font-bold dark:text-white">Weekly Achievement</h2>
                     <p className="text-xs text-slate-400">Current Week Performance</p>
                 </div>
                 <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                    <button
                        onClick={() => setMetric('qty')}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition ${metric === 'qty' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
                    >
                        Vol
                    </button>
                    <button
                        onClick={() => setMetric('val')}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition ${metric === 'val' ? 'bg-white shadow text-emerald-600' : 'text-slate-500'}`}
                    >
                        Val
                    </button>
                 </div>
             </div>

             <div className="h-64">
                 <Bar data={chartData} options={options} />
             </div>
        </div>

        {/* Breakdown Table */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
             <table className="w-full text-xs text-center">
                 <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase font-bold">
                     <tr>
                         <th className="p-3 text-left">Brand</th>
                         <th className="p-3">Units</th>
                         <th className="p-3 text-right">Value</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                     {brands.map(b => (
                         <tr key={b.k} className="dark:text-slate-300">
                             <td className="p-3 text-left font-bold flex items-center gap-2">
                                 <div className="w-2 h-2 rounded-full" style={{backgroundColor: b.c}}></div>
                                 {b.l}
                             </td>
                             <td className="p-3 font-bold">{weeklyStats[b.k].qty}</td>
                             <td className="p-3 text-right">₹{weeklyStats[b.k].val.toLocaleString()}</td>
                         </tr>
                     ))}
                 </tbody>
                 <tfoot className="bg-slate-50 dark:bg-slate-900 font-bold dark:text-white">
                     <tr>
                         <td className="p-3 text-left">TOTAL</td>
                         <td className="p-3">{brands.reduce((a,b) => a + weeklyStats[b.k].qty, 0)}</td>
                         <td className="p-3 text-right">₹{brands.reduce((a,b) => a + weeklyStats[b.k].val, 0).toLocaleString()}</td>
                     </tr>
                 </tfoot>
             </table>
        </div>
    </div>
  );
};

export default Analytics;
