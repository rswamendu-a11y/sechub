import React, { useState, useEffect } from 'react';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Folder, FileText, Image as ImageIcon, Trash2, Plus, X, Upload } from 'lucide-react';

const DocsLocker = () => {
  const [files, setFiles] = useState([]);
  const [viewing, setViewing] = useState(null);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      // Create directory if not exists (ignore error if exists)
      try {
        await Filesystem.mkdir({
          path: 'locker',
          directory: Directory.Data,
          recursive: true
        });
      } catch (e) {}

      const result = await Filesystem.readdir({
        path: 'locker',
        directory: Directory.Data
      });
      setFiles(result.files);
    } catch (e) {
      console.error("Error loading locker files", e);
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileName = `${Date.now()}_${file.name}`;
    const reader = new FileReader();

    reader.onload = async (event) => {
      const base64String = event.target.result.split(',')[1];
      try {
        await Filesystem.writeFile({
          path: `locker/${fileName}`,
          data: base64String,
          directory: Directory.Data
        });
        loadFiles();
      } catch (err) {
        alert("Import Failed: " + err.message);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset input
  };

  const openFile = async (fileInfo) => {
    try {
        const uriResult = await Filesystem.getUri({
            path: `locker/${fileInfo.name}`,
            directory: Directory.Data
        });

        await Share.share({
            title: fileInfo.name,
            url: uriResult.uri
        });
    } catch (e) {
        alert("Cannot open file: " + e.message);
    }
  };

  const deleteFile = async (fileName) => {
      if(!confirm(`Delete ${fileName}?`)) return;
      try {
          await Filesystem.deleteFile({
              path: `locker/${fileName}`,
              directory: Directory.Data
          });
          loadFiles();
      } catch (e) {
          alert("Delete failed");
      }
  };

  return (
    <div className="fade-in pb-24 p-4 space-y-4">
      <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex justify-between items-center">
        <div>
           <h2 className="font-bold text-xl dark:text-white flex items-center gap-2">
               <Folder className="text-indigo-500" /> Docs Locker
           </h2>
           <p className="text-xs text-slate-400">Secure Storage (Internal)</p>
        </div>
        <label className="bg-indigo-600 text-white p-3 rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-500/30 cursor-pointer">
            <Plus size={20} /> <span className="text-sm font-bold">Import</span>
            <input type="file" onChange={handleImport} className="hidden" accept="image/*,application/pdf" />
        </label>
      </div>

      {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 opacity-50">
              <Folder size={64} className="text-slate-300 mb-4"/>
              <p className="text-slate-400 font-bold">Locker is Empty</p>
          </div>
      ) : (
          <div className="grid grid-cols-2 gap-4">
              {files.map((f, i) => {
                  const isImg = f.name.match(/\.(jpg|jpeg|png|webp)$/i);
                  return (
                      <div key={i} onClick={() => openFile(f)} className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 relative active:scale-95 transition-transform">
                          <div className="h-32 bg-slate-100 dark:bg-slate-900 rounded-xl mb-3 flex items-center justify-center overflow-hidden">
                              {isImg ? (
                                  <ImageIcon size={48} className="text-slate-300" />
                              ) : (
                                  <FileText size={48} className="text-red-400" />
                              )}
                          </div>
                          <div className="flex justify-between items-start">
                              <p className="text-xs font-bold truncate w-24 dark:text-slate-200">{f.name}</p>
                              <button onClick={(e) => { e.stopPropagation(); deleteFile(f.name); }} className="text-slate-400 hover:text-red-500">
                                  <Trash2 size={16} />
                              </button>
                          </div>
                      </div>
                  );
              })}
          </div>
      )}
    </div>
  );
};

export default DocsLocker;
