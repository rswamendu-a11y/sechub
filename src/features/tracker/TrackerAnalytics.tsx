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

const PRICE_BRACKETS = [
    { label: '100K & above', min: 100000, max: Infinity },
    { label: '70k - <100K', min: 70000, max: 100000 },
    { label: '40k - <70K', min: 40000, max: 70000 },
    { label: '30k - <40k', min: 30000, max: 40000 },
    { label: '20k - <30k', min: 20000, max: 30000 },
    { label: '15k - <20k', min: 15000, max: 20000 },
    { label: '10k - <15k', min: 10000, max: 15000 },
    { label: '< 10K', min: 0, max: 10000 }
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

  const getPriceBracketStats = () => {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const buckets: Record<string, number> = {};
      PRICE_BRACKETS.forEach(b => buckets[b.label] = 0);

      Object.entries(sales).forEach(([date, data]) => {
          if(!date.startsWith(currentMonth)) return;
          const logs = data.models || "";
          const lines = logs.split('\n');

          lines.forEach((line: string) => {
              if(!line.trim()) return;
              // Regex matches: [Date Time] Brand Model (Variant) - Qty u (Val: Total)
              const match = line.match(/\[(.*?)\]\s+(.*?)\s+(.*?)\s+(?:\((.*?)\)\s+)?-\s+(\d+)u\s+\(Val:\s+(\d+)\)/);
              if(match) {
                  const qty = parseInt(match[5]) || 0;
                  const total = parseInt(match[6]) || 0;
                  const price = qty > 0 ? total / qty : 0;

                  for (const b of PRICE_BRACKETS) {
                      if (price >= b.min && price < b.max) {
                          buckets[b.label] += qty;
                          break;
                      }
                  }
              }
          });
      });
      return buckets;
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
  const bracketStats = getPriceBracketStats();

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

       {/* Price Bracket Analysis */}
       <Card>
           <h3 className="font-bold dark:text-white mb-4">Price Bracket Analysis</h3>
           <div className="overflow-x-auto">
               <table className="w-full text-sm text-left">
                   <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-700/50 dark:text-slate-400">
                       <tr>
                           <th className="px-4 py-3 rounded-l-lg">Price Range</th>
                           <th className="px-4 py-3 rounded-r-lg text-right">Volume</th>
                       </tr>
                   </thead>
                   <tbody>
                       {PRICE_BRACKETS.map((bracket, i) => (
                           <tr key={i} className="border-b border-slate-100 dark:border-slate-700 last:border-0">
                               <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{bracket.label}</td>
                               <td className="px-4 py-3 text-right font-bold text-indigo-600 dark:text-indigo-400">{bracketStats[bracket.label]}</td>
                           </tr>
                       ))}
                   </tbody>
               </table>
           </div>
       </Card>
    </div>
  );
};
