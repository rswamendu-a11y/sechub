import React, { useState, useEffect } from 'react';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { UploadCloud, FileText, Image, ExternalLink, Trash2, Eye, X } from 'lucide-react';

const Locker = () => {
  const [files, setFiles] = useState([]);
  const [viewingFile, setViewingFile] = useState(null); // { name, data, type }

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      try {
        await Filesystem.mkdir({ path: 'locker', directory: Directory.Data, recursive: true });
      } catch (e) {}

      const res = await Filesystem.readdir({
        path: 'locker',
        directory: Directory.Data,
      });

      const fileList = res.files.map(f => ({
         name: f.name,
         type: f.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image',
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
       const base64Data = base64Raw.split(',')[1];

       try {
           await Filesystem.writeFile({
               path: 'locker/' + file.name,
               data: base64Data,
               directory: Directory.Data,
           });
           alert("Uploaded successfully!");
           loadFiles();
       } catch (err) {
           console.error(err);
           alert("Upload Failed: " + err.message);
       }
    };
    reader.readAsDataURL(file);
  };

  const handlePreview = async (file) => {
      if(file.type === 'pdf') {
          openExternal(file);
          return;
      }

      try {
          const content = await Filesystem.readFile({
              path: file.path,
              directory: Directory.Data
          });
          setViewingFile({
              name: file.name,
              data: content.data,
              type: 'image'
          });
      } catch(e) {
          console.error(e);
          alert("Could not load image preview.");
      }
  };

  const openExternal = async (file) => {
      try {
          const uriResult = await Filesystem.getUri({
              path: file.path,
              directory: Directory.Data
          });

          await Share.share({
              title: file.name,
              text: `Viewing ${file.name}`,
              url: uriResult.uri,
              dialogTitle: 'Open with...'
          });
      } catch (e) {
          console.error(e);
          alert("Error opening file: " + e.message);
      }
  };

  const deleteFile = async (file) => {
      if(!confirm("Delete this file permanently?")) return;
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
                        <div className="truncate font-bold text-sm dark:text-white w-32 sm:w-60">{f.name}</div>
                   </div>
                   <div className="flex gap-2">
                       {f.type === 'image' && (
                           <button onClick={() => handlePreview(f)} className="px-3 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-lg flex items-center gap-2 text-xs font-bold">
                               <Eye size={16}/> View
                           </button>
                       )}
                       {f.type === 'pdf' && (
                           <button onClick={() => openExternal(f)} className="px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg flex items-center gap-2 text-xs font-bold">
                               <ExternalLink size={16}/> Open
                           </button>
                       )}
                       <button onClick={() => deleteFile(f)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"><Trash2 size={18}/></button>
                   </div>
               </div>
           ))}

           {files.length === 0 && <div className="text-center text-slate-400 text-sm mt-4">No files stored.</div>}
       </div>

       {/* Image Preview Modal */}
       {viewingFile && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-in fade-in duration-200">
               <div className="relative max-w-full max-h-full">
                   <button
                       onClick={() => setViewingFile(null)}
                       className="absolute -top-12 right-0 p-2 text-white bg-slate-800 rounded-full hover:bg-slate-700 transition"
                   >
                       <X size={24} />
                   </button>
                   <img
                       src={`data:image/jpeg;base64,${viewingFile.data}`}
                       className="max-w-full max-h-[80vh] rounded-lg shadow-2xl"
                       alt="Preview"
                   />
                   <div className="text-center text-white mt-4 font-bold">{viewingFile.name}</div>
               </div>
           </div>
       )}
    </div>
  );
};

export default Locker;
