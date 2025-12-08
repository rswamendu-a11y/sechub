import React, { useState, useEffect } from 'react';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { UploadCloud, FileText, Image, Eye, Trash2, X } from 'lucide-react';

const Locker = () => {
  const [files, setFiles] = useState([]);
  const [viewFile, setViewFile] = useState(null); // { type, data, name }

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      // Create dir if not exists (safeguard)
      try {
        await Filesystem.mkdir({ path: 'locker', directory: Directory.Data, recursive: true });
      } catch (e) {} // ignore if exists

      const res = await Filesystem.readdir({
        path: 'locker',
        directory: Directory.Data,
      });

      // Map file info (Capacitor readdir returns just names usually, or Stat info)
      // We will store metadata in a separate JSON or just infer from extension
      const fileList = res.files.map(f => ({
         name: f.name,
         type: f.name.endsWith('.pdf') ? 'pdf' : 'image',
         path: 'locker/' + f.name
      }));
      setFiles(fileList);
    } catch (e) {
      console.error("Locker Load Error:", e);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
       const base64Raw = event.target.result;
       // Remove data:image/png;base64, prefix for Capacitor Write
       const base64Data = base64Raw.split(',')[1];

       try {
           await Filesystem.writeFile({
               path: 'locker/' + file.name,
               data: base64Data,
               directory: Directory.Data,
               // encoding: Encoding.UTF8 // Only for text, binaries don't need this if base64 string provided
           });
           alert("Uploaded!");
           loadFiles();
       } catch (err) {
           console.error(err);
           alert("Upload Failed");
       }
    };
    reader.readAsDataURL(file);
  };

  const viewFileAction = async (file) => {
      try {
          const content = await Filesystem.readFile({
              path: file.path,
              directory: Directory.Data
          });
          // Content.data is the base64 string
          const mime = file.type === 'pdf' ? 'application/pdf' : 'image/jpeg'; // naive mime
          const dataUrl = `data:${mime};base64,${content.data}`;
          setViewFile({ ...file, data: dataUrl });
      } catch (e) {
          alert("Error reading file");
      }
  };

  const deleteFile = async (file) => {
      if(!confirm("Delete this file?")) return;
      try {
          await Filesystem.deleteFile({
              path: file.path,
              directory: Directory.Data
          });
          loadFiles();
      } catch (e) {
          alert("Delete failed");
      }
  };

  return (
    <div className="fade-in space-y-6 pb-24 p-4">
       <div className="bg-slate-800 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-3"><UploadCloud size={24} /> Locker</h2>
            <p className="text-slate-400 text-sm">Secure Local Storage</p>
       </div>

       <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 text-center">
            <label className="cursor-pointer flex flex-col items-center gap-3 py-4 text-slate-500 hover:text-indigo-600 transition">
                <input type="file" onChange={handleUpload} className="hidden" accept="image/*,application/pdf" />
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-700 rounded-full flex items-center justify-center"><UploadCloud size={32} /></div>
                <span className="font-bold text-sm dark:text-white">Upload File (PDF/Img)</span>
            </label>
       </div>

       <div className="space-y-3">
           {files.map((f, i) => (
               <div key={i} className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex justify-between items-center">
                   <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/50 rounded-lg flex items-center justify-center text-indigo-600">
                            {f.type === 'pdf' ? <FileText size={20}/> : <Image size={20}/>}
                        </div>
                        <div className="truncate font-bold text-sm dark:text-white w-40">{f.name}</div>
                   </div>
                   <div className="flex gap-2">
                       <button onClick={() => viewFileAction(f)} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded"><Eye size={18}/></button>
                       <button onClick={() => deleteFile(f)} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 size={18}/></button>
                   </div>
               </div>
           ))}
       </div>

       {/* Modal Viewer */}
       {viewFile && (
           <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-800 w-full max-w-4xl h-[80vh] rounded-2xl shadow-2xl flex flex-col relative">
                     <button onClick={() => setViewFile(null)} className="absolute top-4 right-4 z-10 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"><X size={20}/></button>
                     <div className="flex-1 w-full h-full p-2 bg-slate-100 dark:bg-slate-900 rounded-2xl overflow-auto flex items-center justify-center">
                         {viewFile.type === 'pdf' ? (
                             <iframe src={viewFile.data} className="w-full h-full rounded" title="PDF Viewer"></iframe>
                         ) : (
                             <img src={viewFile.data} alt="View" className="max-w-full max-h-full rounded shadow-lg" />
                         )}
                     </div>
                </div>
           </div>
       )}
    </div>
  );
};

export default Locker;
