import React, { useMemo, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const BRANDS = [
  { k: 'samsung', l: 'Samsung', color: '#3b82f6' },
  { k: 'iphone', l: 'Apple', color: '#475569' },
  { k: 'oppo', l: 'Oppo', color: '#10b981' },
  { k: 'vivo', l: 'Vivo', color: '#06b6d4' },
  { k: 'realme', l: 'Realme', color: '#eab308' },
  { k: 'mi', l: 'Xiaomi', color: '#f97316' },
  { k: 'moto', l: 'Moto', color: '#6366f1' },
  { k: 'other', l: 'Others', color: '#9ca3af' }
];

const Analytics = () => {
  const { sales } = useAppStore();
  const [metric, setMetric] = useState('volume'); // 'volume' or 'value'

  const chartData = useMemo(() => {
    // Buckets: "1-7", "8-14", "15-21", "22-End"
    const data = {};
    BRANDS.forEach(b => data[b.k] = [0, 0, 0, 0]);

    Object.keys(sales).forEach(dateStr => {
      const d = new Date(dateStr);
      const day = d.getDate();

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      if(d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
         let bucketIdx = 0;
         if (day >= 1 && day <= 7) bucketIdx = 0;
         else if (day >= 8 && day <= 14) bucketIdx = 1;
         else if (day >= 15 && day <= 21) bucketIdx = 2;
         else bucketIdx = 3;

         const entry = sales[dateStr];

         // Use entries array if available for accuracy, else fallback to aggregates
         if (entry.entries) {
             entry.entries.forEach(e => {
                 const k = e.brand;
                 const val = metric === 'volume' ? e.qty : e.total;
                 if(data[k]) data[k][bucketIdx] += val;
             });
         } else {
             // Fallback
             BRANDS.forEach(b => {
                const k = b.k;
                let val = 0;
                if (metric === 'volume') val = entry[k] || 0;
                else val = entry[k+'Val'] || 0;

                data[k][bucketIdx] += val;
             });
         }
      }
    });

    return {
      labels: ['1-7', '8-14', '15-21', '22-End'],
      datasets: BRANDS.map(b => ({
        label: b.l,
        data: data[b.k],
        backgroundColor: b.color,
      }))
    };
  }, [sales, metric]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true, color: '#94a3b8' } },
      title: {
          display: true,
          text: `Weekly ${metric === 'volume' ? 'Volume (Units)' : 'Value (INR)'} - Current Month`,
          color: '#94a3b8'
      },
    },
    scales: {
      x: { stacked: true, grid: { color: '#334155' }, ticks: { color: '#94a3b8' } },
      y: { stacked: true, grid: { color: '#334155' }, ticks: { color: '#94a3b8' } }
    }
  };

  return (
    <div className="fade-in pb-24 p-4 space-y-4">
       <div className="flex justify-center bg-white dark:bg-slate-800 p-1 rounded-xl w-fit mx-auto shadow-sm border border-slate-100 dark:border-slate-700">
           <button
               onClick={() => setMetric('volume')}
               className={`px-4 py-2 rounded-lg text-sm font-bold transition ${metric === 'volume' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
           >
               Volume
           </button>
           <button
               onClick={() => setMetric('value')}
               className={`px-4 py-2 rounded-lg text-sm font-bold transition ${metric === 'value' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
           >
               Value
           </button>
       </div>

       <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 h-[500px]">
          <Bar data={chartData} options={options} />
       </div>
    </div>
  );
};

export default Analytics;
