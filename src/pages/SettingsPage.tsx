/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, initializeDefaults } from '../db';
import { saveAs } from 'file-saver';
import { v4 as uuidv4 } from 'uuid';
import { 
  Download, Upload, RotateCcw, ShieldAlert, Info, 
  CheckCircle2, XCircle, MapPin, Tag, Plus, 
  Trash2, Edit2, X, Save 
} from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

export default function SettingsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const locations = useLiveQuery(() => db.locations.toArray());
  const categories = useLiveQuery(() => db.categories.toArray());

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [confirmDeleteLocation, setConfirmDeleteLocation] = useState<{ id: string, name: string } | null>(null);
  const [confirmDeleteCategory, setConfirmDeleteCategory] = useState<{ id: string, name: string } | null>(null);

  // Management State
  const [editingLocation, setEditingLocation] = useState<{ id: string, name: string } | null>(null);
  const [newLocationName, setNewLocationName] = useState('');
  const [editingCategory, setEditingCategory] = useState<{ id: string, name: string } | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');

  const handleAddLocation = async () => {
    if (!newLocationName.trim()) return;
    const exists = await db.locations.where('name').equals(newLocationName.trim()).first();
    if (exists) {
      setStatus({ type: 'error', message: 'Location already exists.' });
      return;
    }
    await db.locations.add({ id: uuidv4(), name: newLocationName.trim() });
    setNewLocationName('');
  };

  const handleUpdateLocation = async () => {
    if (!editingLocation || !editingLocation.name.trim()) return;
    const oldLocation = await db.locations.get(editingLocation.id);
    if (oldLocation && oldLocation.name !== editingLocation.name.trim()) {
      const newName = editingLocation.name.trim();
      await db.transaction('rw', [db.auditLogs, db.locations], async () => {
        await db.auditLogs.where('location').equals(oldLocation.name).modify({ location: newName });
        await db.locations.update(editingLocation.id, { name: newName });
      });
      setStatus({ type: 'success', message: 'Location updated and propagated to audit logs.' });
    }
    setEditingLocation(null);
  };

  const executeDeleteLocation = async (id: string, name: string) => {
    const count = await db.auditLogs.where('location').equals(name).count();
    if (count > 0) {
      setStatus({ type: 'error', message: `Cannot delete location: ${count} audit entries are linked to it.` });
      return;
    }
    await db.locations.delete(id);
    setStatus({ type: 'success', message: 'Location deleted.' });
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    const exists = await db.categories.where('name').equals(newCategoryName.trim()).first();
    if (exists) {
      setStatus({ type: 'error', message: 'Category already exists.' });
      return;
    }
    await db.categories.add({ id: uuidv4(), name: newCategoryName.trim() });
    setNewCategoryName('');
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !editingCategory.name.trim()) return;
    const oldCategory = await db.categories.get(editingCategory.id);
    if (oldCategory && oldCategory.name !== editingCategory.name.trim()) {
      const newName = editingCategory.name.trim();
      await db.transaction('rw', [db.auditLogs, db.identificationReferences, db.categories], async () => {
        await db.auditLogs.where('category').equals(oldCategory.name).modify({ category: newName });
        await db.identificationReferences.where('category').equals(oldCategory.name).modify({ category: newName });
        await db.categories.update(editingCategory.id, { name: newName });
      });
      setStatus({ type: 'success', message: 'Category updated and propagated to logs and references.' });
    }
    setEditingCategory(null);
  };

  const executeDeleteCategory = async (id: string, name: string) => {
    const auditCount = await db.auditLogs.where('category').equals(name).count();
    const refCount = await db.identificationReferences.where('category').equals(name).count();
    if (auditCount > 0 || refCount > 0) {
      setStatus({ type: 'error', message: `Cannot delete category: It is used in ${auditCount} audit logs and ${refCount} references.` });
      return;
    }
    await db.categories.delete(id);
    setStatus({ type: 'success', message: 'Category deleted.' });
  };

  const handleExportBackup = async () => {
    const data = {
      identificationReferences: await db.identificationReferences.toArray(),
      auditLogs: await db.auditLogs.toArray(),
      categories: await db.categories.toArray(),
      locations: await db.locations.toArray(),
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    saveAs(blob, `lighting-audit-backup-${new Date().toISOString().split('T')[0]}.json`);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setShowImportConfirm(true);
  };

  const executeImport = async () => {
    if (!pendingFile) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        
        await db.transaction('rw', [db.identificationReferences, db.auditLogs, db.categories, db.locations], async () => {
          await db.identificationReferences.clear();
          await db.auditLogs.clear();
          await db.categories.clear();
          await db.locations.clear();

          if (data.identificationReferences) await db.identificationReferences.bulkAdd(data.identificationReferences);
          if (data.auditLogs) await db.auditLogs.bulkAdd(data.auditLogs);
          if (data.categories) await db.categories.bulkAdd(data.categories);
          if (data.locations) await db.locations.bulkAdd(data.locations);
        });

        setStatus({ type: 'success', message: 'Backup imported successfully!' });
        setTimeout(() => window.location.reload(), 1500);
      } catch (err) {
        console.error(err);
        setStatus({ type: 'error', message: 'Failed to import backup. Please ensure the file is a valid JSON backup.' });
      } finally {
        setShowImportConfirm(false);
        setPendingFile(null);
      }
    };
    reader.readAsText(pendingFile);
  };

  const handleResetApp = async () => {
    await db.transaction('rw', [db.identificationReferences, db.auditLogs, db.categories, db.locations], async () => {
      await db.identificationReferences.clear();
      await db.auditLogs.clear();
      await db.categories.clear();
      await db.locations.clear();
    });

    setStatus({ type: 'success', message: 'Application data cleared.' });
    await initializeDefaults();
    setShowResetConfirm(false);
    setTimeout(() => window.location.reload(), 1500);
  };

  return (
    <div className="p-4 max-w-4xl mx-auto pb-24">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Settings</h1>

      {status && (
        <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
          {status.type === 'success' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
          <p className="text-sm font-medium">{status.message}</p>
        </div>
      )}

      <div className="space-y-6">
        <section className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MapPin size={20} className="text-emerald-600" />
              <h2 className="text-lg font-bold text-slate-900">Manage Locations</h2>
            </div>
          </div>
          
          <div className="flex gap-2 mb-4">
            <input 
              type="text" 
              placeholder="New location name..." 
              className="flex-1 p-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={newLocationName}
              onChange={(e) => setNewLocationName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddLocation()}
            />
            <button 
              onClick={handleAddLocation}
              className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors"
            >
              <Plus size={20} />
            </button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {locations?.map(loc => (
              <div key={loc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 gap-2">
                <div className="min-w-0 flex-1">
                  {editingLocation?.id === loc.id ? (
                    <div className="flex gap-2 items-center">
                      <input 
                        autoFocus
                        className="flex-1 bg-white p-1 border border-emerald-300 rounded text-sm outline-none min-w-0"
                        value={editingLocation.name}
                        onChange={(e) => setEditingLocation({ ...editingLocation, name: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdateLocation();
                          if (e.key === 'Escape') setEditingLocation(null);
                        }}
                      />
                      <button onClick={handleUpdateLocation} className="text-emerald-600 p-1 hover:bg-emerald-50 rounded flex-shrink-0">
                        <Save size={14} />
                      </button>
                      <button onClick={() => setEditingLocation(null)} className="text-slate-400 p-1 hover:bg-slate-100 rounded flex-shrink-0">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <span className="text-sm text-slate-700 font-medium break-words block">{loc.name}</span>
                  )}
                </div>
                
                {editingLocation?.id !== loc.id && (
                  <div className="flex gap-1 flex-shrink-0">
                    <button 
                      onClick={() => setEditingLocation(loc)}
                      className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => setConfirmDeleteLocation(loc)}
                      className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Tag size={20} className="text-blue-600" />
              <h2 className="text-lg font-bold text-slate-900">Manage Categories</h2>
            </div>
          </div>
          
          <div className="flex gap-2 mb-4">
            <input 
              type="text" 
              placeholder="New category name..." 
              className="flex-1 p-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
            />
            <button 
              onClick={handleAddCategory}
              className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
            </button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {categories?.map(cat => (
              <div key={cat.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 gap-2">
                <div className="min-w-0 flex-1">
                  {editingCategory?.id === cat.id ? (
                    <div className="flex gap-2 items-center">
                      <input 
                        autoFocus
                        className="flex-1 bg-white p-1 border border-blue-300 rounded text-sm outline-none min-w-0"
                        value={editingCategory.name}
                        onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdateCategory();
                          if (e.key === 'Escape') setEditingCategory(null);
                        }}
                      />
                      <button onClick={handleUpdateCategory} className="text-blue-600 p-1 hover:bg-blue-50 rounded flex-shrink-0">
                        <Save size={14} />
                      </button>
                      <button onClick={() => setEditingCategory(null)} className="text-slate-400 p-1 hover:bg-slate-100 rounded flex-shrink-0">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <span className="text-sm text-slate-700 font-medium break-words block">{cat.name}</span>
                  )}
                </div>
                
                {editingCategory?.id !== cat.id && (
                  <div className="flex gap-1 flex-shrink-0">
                    <button 
                      onClick={() => setEditingCategory(cat)}
                      className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => setConfirmDeleteCategory(cat)}
                      className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Download size={20} className="text-emerald-600" />
            <h2 className="text-lg font-bold text-slate-900">Data Backup</h2>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            Export a complete JSON backup of all your data, including photos, categories, and audit logs.
          </p>
          <button 
            onClick={handleExportBackup}
            className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors"
          >
            <Download size={18} />
            Export JSON Backup
          </button>
        </section>

        <section className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Upload size={20} className="text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900">Restore Data</h2>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            Import a previously exported JSON backup. This will replace all current data.
          </p>
          <input 
            type="file" 
            accept=".json" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleImportBackup}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-3 border-2 border-blue-100 text-blue-600 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors"
          >
            <Upload size={18} />
            Import JSON Backup
          </button>
        </section>

        <section className="bg-white p-6 rounded-2xl border border-red-50 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <ShieldAlert size={20} className="text-red-500" />
            <h2 className="text-lg font-bold text-red-600">Danger Zone</h2>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            Permanently delete all data and reset the application to its original state.
          </p>
          <button 
            onClick={() => setShowResetConfirm(true)}
            className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
          >
            <RotateCcw size={18} />
            Reset Application Data
          </button>
        </section>

        <section className="bg-slate-900 p-6 rounded-2xl text-white">
          <div className="flex items-center gap-2 mb-2">
            <Info size={18} className="text-emerald-400" />
            <h3 className="font-bold">About Lighting Audit PWA</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Designed for theatrical lighting technicians. All data is stored locally on your device using IndexedDB. 
            No data is sent to a server. Remember to export backups regularly to prevent data loss.
          </p>
          <div className="mt-4 pt-4 border-t border-slate-800 text-[10px] text-slate-500 flex justify-between">
            <span>Version 1.0.0</span>
            <span>Built with React & Dexie</span>
          </div>
        </section>
      </div>

      <ConfirmModal
        isOpen={!!confirmDeleteLocation}
        onClose={() => setConfirmDeleteLocation(null)}
        onConfirm={() => {
          if (confirmDeleteLocation) executeDeleteLocation(confirmDeleteLocation.id, confirmDeleteLocation.name);
        }}
        title="Delete Location"
        message={`Are you sure you want to delete the location "${confirmDeleteLocation?.name}"?`}
      />

      <ConfirmModal
        isOpen={!!confirmDeleteCategory}
        onClose={() => setConfirmDeleteCategory(null)}
        onConfirm={() => {
          if (confirmDeleteCategory) executeDeleteCategory(confirmDeleteCategory.id, confirmDeleteCategory.name);
        }}
        title="Delete Category"
        message={`Are you sure you want to delete the category "${confirmDeleteCategory?.name}"?`}
      />

      <ConfirmModal
        isOpen={showImportConfirm}
        onClose={() => { setShowImportConfirm(false); setPendingFile(null); }}
        onConfirm={executeImport}
        title="Import Backup"
        message="This will overwrite all existing data with the contents of the backup file. This action cannot be undone."
        confirmText="Yes, Import"
        isDanger={true}
      />

      <ConfirmModal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleResetApp}
        title="Reset Application"
        message="PERMANENT ACTION: This will delete ALL data and reset the application to its original state. Are you sure?"
        confirmText="Yes, Delete All"
        isDanger={true}
      />
    </div>
  );
}
