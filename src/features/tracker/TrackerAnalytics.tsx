import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Card } from '../../components/ui';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { getWeekOfMonth, parseISO, startOfMonth, endOfMonth, eachWeekOfInterval } from 'date-fns';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const BRANDS = [
  {k:'samsung', l:'Samsung', c:'#3b82f6'},
  {k:'iphone', l:'Apple', c:'#475569'},
  {k:'oppo', l:'Oppo', c:'#10b981'},
  {k:'vivo', l:'Vivo', c:'#06b6d4'},
  {k:'realme', l:'Realme', c:'#eab308'},
  {k:'mi', l:'Xiaomi', c:'#f97316'},
  {k:'moto', l:'Moto', c:'#6366f1'},
  {k:'other', l:'Others', c:'#9ca3af'}
];

export const TrackerAnalytics: React.FC = () => {
  const { sales } = useAppStore();
  const [mode, setMode] = React.useState<'volume'|'value'>('volume');

  // Stats Logic
  const getStats = () => {
    const today = new Date().toISOString().split('T')[0];
    const currentMonthPrefix = today.slice(0, 7); // YYYY-MM

    let ftd = { vol: 0, val: 0, samVol: 0, samVal: 0 };
    let mtd = { vol: 0, val: 0, samVol: 0, samVal: 0, breakdown: {} as Record<string, number> };
    BRANDS.forEach(b => mtd.breakdown[b.k] = 0);

    // FTD
    const todayData = sales[today];
    if (todayData) {
      BRANDS.forEach(b => {
        const v = todayData[b.k] || 0;
        const va = todayData[b.k+'Val'] || 0;
        ftd.vol += v;
        ftd.val += va;
        if (b.k === 'samsung') { ftd.samVol += v; ftd.samVal += va; }
      });
    }

    // MTD
    Object.keys(sales).forEach(date => {
      if (date.startsWith(currentMonthPrefix)) {
        BRANDS.forEach(b => {
          const v = sales[date][b.k] || 0;
          const va = sales[date][b.k+'Val'] || 0;
          mtd.vol += v;
          mtd.val += va;

          if(mode === 'volume') mtd.breakdown[b.k] += v;
          else mtd.breakdown[b.k] += va;

          if (b.k === 'samsung') { mtd.samVol += v; mtd.samVal += va; }
        });
      }
    });

    return { ftd, mtd };
  };

  const getWeeklyChartData = () => {
    // Generate labels for weeks of current month
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    const weeks = eachWeekOfInterval({ start, end });
    const labels = weeks.map((_, i) => `Week ${i + 1}`);

    // Initialize data structure: { 'samsung': [w1, w2, w3, w4], 'apple': ... }
    const data: Record<string, number[]> = {};
    BRANDS.forEach(b => data[b.k] = new Array(labels.length).fill(0));

    Object.keys(sales).forEach(dateStr => {
      if(dateStr.startsWith(now.toISOString().slice(0, 7))) {
        const date = parseISO(dateStr);
        const weekIdx = getWeekOfMonth(date) - 1; // 0-based index
        if (weekIdx >= 0 && weekIdx < labels.length) {
          BRANDS.forEach(b => {
            const val = mode === 'volume' ? (sales[dateStr][b.k] || 0) : (sales[dateStr][b.k+'Val'] || 0);
            data[b.k][weekIdx] += val;
          });
        }
      }
    });

    return {
      labels,
      datasets: BRANDS.map(b => ({
        label: b.l,
        data: data[b.k],
        backgroundColor: b.c,
        stack: 'Stack 0',
      }))
    };
  };

  const stats = getStats();
  const chartData = getWeeklyChartData();

  const samShareFTD = stats.ftd.vol ? (mode==='volume' ? stats.ftd.samVol/stats.ftd.vol : stats.ftd.samVal/stats.ftd.val)*100 : 0;

  return (
    <div className="space-y-6 fade-in">
       {/* Mode Toggle */}
       <div className="bg-white dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 flex shadow-sm">
          <button onClick={() => setMode('volume')} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${mode==='volume' ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900 shadow-md' : 'text-slate-400'}`}>Volume</button>
          <button onClick={() => setMode('value')} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${mode==='value' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}>Value</button>
       </div>

       {/* FTD Card */}
       <div className={`rounded-3xl p-8 text-white shadow-xl relative overflow-hidden transition-all duration-500 ${mode==='volume' ? 'bg-slate-800' : 'bg-indigo-600'}`}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
          <div className="relative z-10">
             <div className="flex justify-between items-start mb-8">
                <div>
                   <div className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider w-fit mb-2 backdrop-blur-sm">Today</div>
                   <h2 className="text-5xl font-extrabold tracking-tight">
                     {mode==='volume' ? stats.ftd.vol : `₹${(stats.ftd.val/1000).toFixed(1)}k`}
                   </h2>
                   <p className="text-white/60 text-sm mt-1 font-medium">{mode==='volume' ? 'Total Units' : 'Total Revenue'}</p>
                </div>
                <div className="text-right">
                   <div className="text-[10px] uppercase font-bold text-white/60 mb-1">Sam Share</div>
                   <div className="text-3xl font-bold">{samShareFTD.toFixed(1)}%</div>
                </div>
             </div>
          </div>
       </div>

       {/* Weekly Chart */}
       <Card className="h-80 relative">
          <h3 className="font-bold dark:text-white mb-4">Weekly Achievement</h3>
          <div className="h-64">
             <Bar
               data={chartData}
               options={{
                 responsive: true,
                 maintainAspectRatio: false,
                 scales: {
                   x: { stacked: true, grid: { display: false } },
                   y: { stacked: true, display: false }
                 },
                 plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true } } }
               }}
             />
          </div>
       </Card>
    </div>
  );
};
