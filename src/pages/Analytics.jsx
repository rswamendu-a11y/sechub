import React, { useMemo } from 'react';
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

  const chartData = useMemo(() => {
    // Buckets: "1-7", "8-14", "15-21", "22-End"
    // Data structure: { samsung: [b1, b2, b3, b4], iphone: [...], ... }
    const buckets = [0, 0, 0, 0]; // Just to size the arrays
    const data = {};
    BRANDS.forEach(b => data[b.k] = [0, 0, 0, 0]);

    Object.keys(sales).forEach(dateStr => {
      const d = new Date(dateStr);
      const day = d.getDate();
      // Filter for current month only? Assuming all data for now, or maybe filter by current month.
      // Let's stick to current month for "Weekly Achievement" usually implies current context.
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      if(d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
         let bucketIdx = 0;
         if (day >= 1 && day <= 7) bucketIdx = 0;
         else if (day >= 8 && day <= 14) bucketIdx = 1;
         else if (day >= 15 && day <= 21) bucketIdx = 2;
         else bucketIdx = 3;

         const entry = sales[dateStr];
         BRANDS.forEach(b => {
            const qty = entry[b.k] || 0;
            data[b.k][bucketIdx] += qty;
         });
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
  }, [sales]);

  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'bottom' },
      title: { display: true, text: 'Weekly Volume by Brand (Current Month)' },
    },
    scales: {
      x: { stacked: true },
      y: { stacked: true }
    }
  };

  return (
    <div className="fade-in pb-24 p-4">
       <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 h-[500px] flex flex-col justify-center">
          <Bar data={chartData} options={options} />
       </div>
    </div>
  );
};

export default Analytics;
