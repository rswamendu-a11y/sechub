import React, { useMemo, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Download } from 'lucide-react';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

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
  const { sales, profile } = useAppStore();
  const [metric, setMetric] = useState('volume'); // 'volume' or 'value'
  const [dealerBrand, setDealerBrand] = useState('samsung');

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

  const priceBrackets = useMemo(() => {
    // 100K+, 70-100k, 40-70k, 30-40k, 20-30k, 15-20k, 10-15k, <10k
    const brackets = [0, 0, 0, 0, 0, 0, 0, 0];

    Object.keys(sales).forEach(dateStr => {
        const d = new Date(dateStr);
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        if(d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
            const entry = sales[dateStr];
            if (entry.entries) {
                entry.entries.forEach(e => {
                    if (e.brand !== dealerBrand) return;
                    const price = e.price || 0;
                    if (price >= 100000) brackets[0]++;
                    else if (price >= 70000) brackets[1]++;
                    else if (price >= 40000) brackets[2]++;
                    else if (price >= 30000) brackets[3]++;
                    else if (price >= 20000) brackets[4]++;
                    else if (price >= 15000) brackets[5]++;
                    else if (price >= 10000) brackets[6]++;
                    else brackets[7]++;
                });
            }
        }
    });
    return brackets;
  }, [sales, dealerBrand]);

  const handleExportPDF = async () => {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("Weekly Performance Report", 14, 20);
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);

      if (profile.name || profile.outlet) {
          doc.text(`Name: ${profile.name || 'N/A'} | Outlet: ${profile.outlet || 'N/A'}`, 14, 34);
      }

      // Calculation Logic (Independent of View)
      const volData = {};
      const valData = {};
      BRANDS.forEach(b => {
          volData[b.k] = [0, 0, 0, 0];
          valData[b.k] = [0, 0, 0, 0];
      });

      Object.keys(sales).forEach(dateStr => {
          const d = new Date(dateStr);
          const currentMonth = new Date().getMonth();
          const currentYear = new Date().getFullYear();

          if(d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
             const day = d.getDate();
             let bucketIdx = 0;
             if (day >= 1 && day <= 7) bucketIdx = 0;
             else if (day >= 8 && day <= 14) bucketIdx = 1;
             else if (day >= 15 && day <= 21) bucketIdx = 2;
             else bucketIdx = 3;

             const entry = sales[dateStr];
             if (entry.entries) {
                 entry.entries.forEach(e => {
                     const k = e.brand;
                     if (volData[k]) {
                         volData[k][bucketIdx] += e.qty || 0;
                         valData[k][bucketIdx] += e.total || 0;
                     }
                 });
             } else {
                  // Fallback for legacy data structure
                  BRANDS.forEach(b => {
                      const k = b.k;
                      if (volData[k]) {
                          volData[k][bucketIdx] += entry[k] || 0;
                          valData[k][bucketIdx] += entry[k+'Val'] || 0;
                      }
                  });
             }
          }
      });

      // Table 1: Volume
      const volTableBody = BRANDS.map(b => {
          const row = volData[b.k];
          const total = row.reduce((a,c) => a+c, 0);
          return [b.l, ...row, total];
      });

      const startY = (profile.name || profile.outlet) ? 42 : 36;

      doc.text("Volume (Units)", 14, startY);
      doc.autoTable({
          startY: startY + 5,
          head: [['Brand', 'Week 1', 'Week 2', 'Week 3', 'Week 4', 'Total Qty']],
          body: volTableBody,
          theme: 'grid',
          headStyles: { fillColor: [79, 70, 229] },
      });

      // Table 2: Value
      const valTableBody = BRANDS.map(b => {
          const row = valData[b.k];
          const total = row.reduce((a,c) => a+c, 0);
          // Format numbers for value
          return [b.l, ...row.map(v => v.toLocaleString()), total.toLocaleString()];
      });

      const finalY = doc.lastAutoTable.finalY || 40;
      doc.text("Value (INR)", 14, finalY + 10);

      doc.autoTable({
          startY: finalY + 15,
          head: [['Brand', 'Week 1', 'Week 2', 'Week 3', 'Week 4', 'Total Val']],
          body: valTableBody,
          theme: 'grid',
          headStyles: { fillColor: [16, 185, 129] }, // Emerald
      });

      const fileName = `Performance_${Date.now()}.pdf`;

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
              title: 'Performance Report',
              url: uriResult.uri
          });
      } catch (e) {
          console.error(e);
          // Browser fallback
          doc.save(fileName);
      }
  };

  return (
    <div className="fade-in pb-24 p-4 space-y-4">
       <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
           <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                <button
                    onClick={() => setMetric('volume')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition ${metric === 'volume' ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                >
                    Volume
                </button>
                <button
                    onClick={() => setMetric('value')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition ${metric === 'value' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                >
                    Value
                </button>
           </div>
           <button onClick={handleExportPDF} className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-lg flex items-center gap-2 text-sm font-bold pr-4">
               <Download size={18}/> Export PDF
           </button>
       </div>

       <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 h-[500px]">
          <Bar data={chartData} options={options} />
       </div>

       {/* MTD vs LMTD Comparison */}
       <GrowthTracker sales={sales} brands={BRANDS} />

       {/* Price Bracket Table */}
       <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
            {/* Dealer Price Header with Filter */}
            <div className="p-4 bg-red-800 text-white font-bold flex justify-between items-center border-b border-red-900">
                <span>DEALER PRICE (RANGE) - INR</span>
                <select
                    value={dealerBrand}
                    onChange={(e) => setDealerBrand(e.target.value)}
                    className="bg-red-900/50 text-white border border-red-700 rounded-lg p-1 text-xs outline-none focus:ring-1 focus:ring-white"
                >
                    {BRANDS.map(b => <option key={b.k} value={b.k}>{b.l}</option>)}
                </select>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-center text-sm">
                    <thead className="bg-red-700 text-white text-xs uppercase font-bold">
                        <tr>
                            <th className="p-3 border-r border-red-600">Category</th>
                            <th className="p-3 border-r border-red-600">100K & above</th>
                            <th className="p-3 border-r border-red-600">70k - &lt;100K</th>
                            <th className="p-3 border-r border-red-600">40k - &lt;70K</th>
                            <th className="p-3 border-r border-red-600">30 - &lt;40k</th>
                            <th className="p-3 border-r border-red-600">20 - &lt;30</th>
                            <th className="p-3 border-r border-red-600">15 - &lt;20k</th>
                            <th className="p-3 border-r border-red-600">10 - &lt;15k</th>
                            <th className="p-3">&lt;10K</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        <tr className="dark:text-white font-bold">
                            <td className="p-4 text-left border-r border-slate-100 dark:border-slate-700">Mobile Phones</td>
                            <td className="p-4 border-r border-slate-100 dark:border-slate-700">{priceBrackets[0]}</td>
                            <td className="p-4 border-r border-slate-100 dark:border-slate-700">{priceBrackets[1]}</td>
                            <td className="p-4 border-r border-slate-100 dark:border-slate-700">{priceBrackets[2]}</td>
                            <td className="p-4 border-r border-slate-100 dark:border-slate-700">{priceBrackets[3]}</td>
                            <td className="p-4 border-r border-slate-100 dark:border-slate-700">{priceBrackets[4]}</td>
                            <td className="p-4 border-r border-slate-100 dark:border-slate-700">{priceBrackets[5]}</td>
                            <td className="p-4 border-r border-slate-100 dark:border-slate-700">{priceBrackets[6]}</td>
                            <td className="p-4">{priceBrackets[7]}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
       </div>
    </div>
  );
};

const GrowthTracker = ({ sales, brands }) => {
    const [metric, setMetric] = useState('volume'); // volume | value

    const stats = useMemo(() => {
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();
        const currentDay = today.getDate();

        // Calculate Last Month Year/Month
        const lastMonthDate = new Date(today);
        lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
        const lastMonthYear = lastMonthDate.getFullYear();
        const lastMonth = lastMonthDate.getMonth();

        // Initialize Stats
        const currentStats = {};
        const lastStats = {};
        brands.forEach(b => {
            currentStats[b.k] = { qty: 0, val: 0 };
            lastStats[b.k] = { qty: 0, val: 0 };
        });

        Object.keys(sales).forEach(dateStr => {
            const d = new Date(dateStr);
            const dYear = d.getFullYear();
            const dMonth = d.getMonth();
            const dDay = d.getDate();

            const entry = sales[dateStr];
            // Helper to add
            const addToStats = (targetStats) => {
                if (entry.entries) {
                    entry.entries.forEach(e => {
                        if (targetStats[e.brand]) {
                            targetStats[e.brand].qty += e.qty;
                            targetStats[e.brand].val += e.total;
                        }
                    });
                } else {
                    // Fallback
                    brands.forEach(b => {
                        if (targetStats[b.k]) {
                            targetStats[b.k].qty += entry[b.k] || 0;
                            targetStats[b.k].val += entry[b.k+'Val'] || 0;
                        }
                    });
                }
            };

            // Check Current MTD
            if (dYear === currentYear && dMonth === currentMonth && dDay <= currentDay) {
                addToStats(currentStats);
            }

            // Check Last Month TD
            // Note: If today is 31st and last month only has 30 days, logic might need adjustment.
            // Simple approach: dDay <= currentDay. If last month has fewer days, it naturally limits.
            if (dYear === lastMonthYear && dMonth === lastMonth && dDay <= currentDay) {
                addToStats(lastStats);
            }
        });

        return { current: currentStats, last: lastStats };
    }, [sales, brands]);

    const chartData = useMemo(() => {
        return {
            labels: brands.map(b => b.l),
            datasets: [
                {
                    label: 'Current Month (MTD)',
                    data: brands.map(b => metric === 'volume' ? stats.current[b.k].qty : stats.current[b.k].val),
                    backgroundColor: '#6366f1', // Indigo
                    borderRadius: 4,
                },
                {
                    label: 'Last Month (LMTD)',
                    data: brands.map(b => metric === 'volume' ? stats.last[b.k].qty : stats.last[b.k].val),
                    backgroundColor: '#94a3b8', // Slate
                    borderRadius: 4,
                }
            ]
        };
    }, [stats, metric, brands]);

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'bottom' },
            title: {
                display: true,
                text: `MTD vs LMTD (${metric === 'volume' ? 'Volume' : 'Value'})`,
                color: '#64748b'
            },
            tooltip: {
                callbacks: {
                    label: (context) => {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                             label += metric === 'value' ? context.parsed.y.toLocaleString() : context.parsed.y;
                        }
                        return label;
                    }
                }
            }
        },
        scales: {
            x: { grid: { display: false } },
            y: { beginAtZero: true, grid: { color: '#f1f5f9' } }
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
             <div className="flex justify-between items-center mb-4">
                 <h3 className="font-bold text-slate-700 dark:text-slate-200">Growth Tracker</h3>
                 <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                    <button
                        onClick={() => setMetric('volume')}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition ${metric === 'volume' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
                    >
                        Vol
                    </button>
                    <button
                        onClick={() => setMetric('value')}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition ${metric === 'value' ? 'bg-white shadow text-emerald-600' : 'text-slate-500'}`}
                    >
                        Val
                    </button>
                 </div>
             </div>
             <div className="h-64">
                 <Bar data={chartData} options={options} />
             </div>

             {/* Summary Table for Quick View */}
             <div className="mt-4 overflow-x-auto">
                 <table className="w-full text-xs text-center">
                     <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase">
                         <tr>
                             <th className="p-2 text-left">Brand</th>
                             <th className="p-2 pr-6">MTD Vol</th>
                             <th className="p-2">LMTD Vol</th>
                             <th className="p-2">Diff</th>
                             <th className="p-2 pr-6">MTD Val</th>
                             <th className="p-2">LMTD Val</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                         {brands.map(b => {
                             const cQty = stats.current[b.k].qty;
                             const lQty = stats.last[b.k].qty;
                             const diff = cQty - lQty;
                             const cVal = stats.current[b.k].val;
                             const lVal = stats.last[b.k].val;

                             return (
                                 <tr key={b.k} className="dark:text-slate-300">
                                     <td className="p-2 text-left font-bold">{b.l}</td>
                                     <td className="p-2 pr-6">{cQty}</td>
                                     <td className="p-2 text-slate-400">{lQty}</td>
                                     <td className={`p-2 font-bold ${diff >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{diff > 0 ? '+' : ''}{diff}</td>
                                     <td className="p-2 pr-6">{cVal.toLocaleString()}</td>
                                     <td className="p-2 text-slate-400">{lVal.toLocaleString()}</td>
                                 </tr>
                             );
                         })}
                     </tbody>
                 </table>
             </div>
        </div>
    );
};

export default Analytics;
