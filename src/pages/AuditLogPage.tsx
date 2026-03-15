/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { processImage } from '../utils/image';
import { Plus, Trash2, Camera, Image, Search, Filter, MapPin, Tag, AlertCircle, Download, BookOpen, X, ChevronRight, Edit2 } from 'lucide-react';
import type { AuditLogEntry, Photo, IdentificationReference } from '../types';
import { exportToCSV, exportToPDF, exportToRTF } from '../utils/export';
import ConfirmModal from '../components/ConfirmModal';

export default function AuditLogPage() {
  const auditLogs = useLiveQuery(() => db.auditLogs.orderBy('timestamp').reverse().toArray());
  const categories = useLiveQuery(() => db.categories.toArray());
  const locations = useLiveQuery(() => db.locations.toArray());
  const references = useLiveQuery(() => db.identificationReferences.toArray());

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingLog, setViewingLog] = useState<AuditLogEntry | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [showRefPicker, setShowRefPicker] = useState(false);
  const [search, setSearch] = useState('');
  const [refSearch, setRefSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterCondition, setFilterCondition] = useState('All');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [newEntry, setNewEntry] = useState<Partial<AuditLogEntry>>({
    assetId: '',
    category: 'LED Fixture',
    specificType: '',
    condition: 'Good/Show Ready',
    location: 'Storage',
    notes: '',
    photos: []
  });

  const selectedRef = references?.find(r => r.type === newEntry.specificType && r.category === newEntry.category);

  const handleSelectRef = (ref: IdentificationReference) => {
    setNewEntry(prev => ({
      ...prev,
      category: ref.category,
      specificType: ref.type
    }));
    setShowRefPicker(false);
  };

  const handleAddEntry = async () => {
    if (!newEntry.assetId || !newEntry.category) return;
    
    if (editingId) {
      await db.auditLogs.update(editingId, {
        assetId: newEntry.assetId,
        category: newEntry.category,
        specificType: newEntry.specificType || '',
        condition: newEntry.condition || 'Good/Show Ready',
        location: newEntry.location || 'Storage',
        notes: newEntry.notes || '',
        photos: newEntry.photos || []
      });
    } else {
      await db.auditLogs.add({
        id: uuidv4(),
        assetId: newEntry.assetId,
        category: newEntry.category,
        specificType: newEntry.specificType || '',
        condition: newEntry.condition || 'Good/Show Ready',
        location: newEntry.location || 'Storage',
        notes: newEntry.notes || '',
        timestamp: new Date().toISOString(),
        photos: newEntry.photos || []
      } as AuditLogEntry);
    }
    
    setNewEntry({ assetId: '', category: 'Fixture', specificType: '', condition: 'Good/Show Ready', location: 'Storage', notes: '', photos: [] });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleEdit = (log: AuditLogEntry) => {
    setNewEntry({
      assetId: log.assetId,
      category: log.category,
      specificType: log.specificType,
      condition: log.condition,
      location: log.location,
      notes: log.notes,
      photos: log.photos
    });
    setEditingId(log.id);
    setIsAdding(true);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const processed = await Promise.all(files.map(file => processImage(file)));
      const newPhotos: Photo[] = processed.map(p => ({
        id: uuidv4(),
        data: p.data,
        thumbnail: p.thumbnail
      }));
      setNewEntry(prev => ({ ...prev, photos: [...(prev.photos || []), ...newPhotos] }));
    }
  };

  const filteredLogs = auditLogs?.filter(log => {
    const matchesSearch = log.assetId.toLowerCase().includes(search.toLowerCase()) || 
                         log.notes.toLowerCase().includes(search.toLowerCase()) ||
                         log.specificType.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filterCategory === 'All' || log.category === filterCategory;
    const matchesCondition = filterCondition === 'All' || log.condition === filterCondition;
    return matchesSearch && matchesCategory && matchesCondition;
  });

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'Good/Show Ready': return 'text-emerald-600 bg-emerald-50';
      case 'Needs Repair': return 'text-amber-600 bg-amber-50';
      case 'Missing Parts': return 'text-orange-600 bg-orange-50';
      case 'Dead/Scrap': return 'text-red-600 bg-red-50';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto pb-24">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Audit Log</h1>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowExport(!showExport)}
            className="bg-white border border-slate-200 text-slate-600 p-2 rounded-full shadow-sm hover:bg-slate-50 transition-colors"
          >
            <Download size={24} />
          </button>
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-emerald-600 text-white p-2 rounded-full shadow-lg hover:bg-emerald-700 transition-colors"
          >
            <Plus size={24} />
          </button>
        </div>
      </div>

      {showExport && (
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm mb-6 animate-in fade-in slide-in-from-top-4">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Export Audit Results</h3>
          <div className="grid grid-cols-3 gap-3">
            <button 
              onClick={() => { exportToCSV(filteredLogs || []); setShowExport(false); }}
              className="flex flex-col items-center gap-1 p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <span className="text-xs font-bold text-slate-700">CSV</span>
            </button>
            <button 
              onClick={() => { exportToPDF(filteredLogs || []); setShowExport(false); }}
              className="flex flex-col items-center gap-1 p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <span className="text-xs font-bold text-slate-700">PDF</span>
            </button>
            <button 
              onClick={() => { exportToRTF(filteredLogs || []); setShowExport(false); }}
              className="flex flex-col items-center gap-1 p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <span className="text-xs font-bold text-slate-700">RTF</span>
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by Asset ID or notes..." 
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          <select 
            className="p-2 border border-slate-200 rounded-lg text-sm bg-white min-w-[120px]"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="All">All Categories</option>
            {categories?.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
          <select 
            className="p-2 border border-slate-200 rounded-lg text-sm bg-white min-w-[120px]"
            value={filterCondition}
            onChange={(e) => setFilterCondition(e.target.value)}
          >
            <option value="All">All Conditions</option>
            <option value="Good/Show Ready">Good</option>
            <option value="Needs Repair">Needs Repair</option>
            <option value="Missing Parts">Missing Parts</option>
            <option value="Dead/Scrap">Dead/Scrap</option>
          </select>
        </div>
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editingId ? 'Edit Audit Entry' : 'New Audit Entry'}</h2>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                <div className="flex items-center gap-3">
                  <BookOpen className="text-emerald-600" size={20} />
                  <div>
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Reference Link</p>
                    <p className="text-sm font-medium text-slate-700">
                      {newEntry.specificType ? `${newEntry.category}: ${newEntry.specificType}` : 'No reference selected'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowRefPicker(true)}
                  className="text-xs bg-white text-emerald-600 px-3 py-1.5 rounded-lg border border-emerald-200 font-bold hover:bg-emerald-100 transition-colors"
                >
                  Change
                </button>
              </div>

              {selectedRef && selectedRef.photos.length > 0 && (
                <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg border border-slate-100">
                  <img 
                    src={selectedRef.photos[0].thumbnail} 
                    alt="" 
                    className="w-12 h-12 rounded object-cover" 
                    referrerPolicy="no-referrer"
                  />
                  <p className="text-[10px] text-slate-500 italic">Reference image for visual comparison</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Asset ID</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border border-slate-200 rounded-lg"
                    placeholder="e.g. L-001"
                    value={newEntry.assetId}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, assetId: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <select 
                    className="w-full p-2 border border-slate-200 rounded-lg"
                    value={newEntry.category}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, category: e.target.value }))}
                  >
                    {categories?.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Condition</label>
                  <select 
                    className="w-full p-2 border border-slate-200 rounded-lg"
                    value={newEntry.condition}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, condition: e.target.value as any }))}
                  >
                    <option value="Good/Show Ready">Good</option>
                    <option value="Needs Repair">Needs Repair</option>
                    <option value="Missing Parts">Missing Parts</option>
                    <option value="Dead/Scrap">Dead/Scrap</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                  <select 
                    className="w-full p-2 border border-slate-200 rounded-lg"
                    value={newEntry.location}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, location: e.target.value }))}
                  >
                    {locations?.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea 
                  className="w-full p-2 border border-slate-200 rounded-lg h-20"
                  placeholder="Any specific issues or observations..."
                  value={newEntry.notes}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Photos</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {newEntry.photos?.map((p, i) => (
                    <div key={p.id} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200">
                      <img src={p.thumbnail} alt="" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => setNewEntry(prev => ({ ...prev, photos: prev.photos?.filter((_, idx) => idx !== i) }))}
                        className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl-lg"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  <label className="w-16 h-16 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-colors">
                    <Camera size={20} className="text-slate-400" />
                    <span className="text-[10px] text-slate-400">Camera</span>
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} />
                  </label>
                  <label className="w-16 h-16 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-colors">
                    <Image size={20} className="text-slate-400" />
                    <span className="text-[10px] text-slate-400">Gallery</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => { setIsAdding(false); setEditingId(null); }}
                  className="flex-1 py-2 border border-slate-200 rounded-xl text-slate-600 font-medium"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddEntry}
                  className="flex-1 py-2 bg-emerald-600 text-white rounded-xl font-medium"
                >
                  {editingId ? 'Update Entry' : 'Save Entry'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRefPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Select Equipment</h2>
              <button onClick={() => setShowRefPicker(false)} className="p-1 hover:bg-slate-100 rounded-full">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search equipment..." 
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={refSearch}
                onChange={(e) => setRefSearch(e.target.value)}
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {references?.filter(r => 
                r.type.toLowerCase().includes(refSearch.toLowerCase()) || 
                r.category.toLowerCase().includes(refSearch.toLowerCase())
              ).map(ref => (
                <button 
                  key={ref.id}
                  onClick={() => handleSelectRef(ref)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50 transition-all text-left group"
                >
                  <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                    {ref.photos.length > 0 ? (
                      <img src={ref.photos[0].thumbnail} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <Tag size={16} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">{ref.category}</p>
                    <p className="text-sm font-bold text-slate-900 truncate">{ref.type}</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                </button>
              ))}
              <button 
                onClick={() => {
                  setNewEntry(prev => ({ ...prev, specificType: 'Other', category: 'LED Fixture' }));
                  setShowRefPicker(false);
                }}
                className="w-full p-3 rounded-xl border border-dashed border-slate-200 text-slate-400 text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                + Use Custom / Not Listed
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${getConditionColor(viewingLog.condition)}`}>
                    {viewingLog.condition}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                    {viewingLog.location}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 break-words">{viewingLog.assetId}</h2>
                <p className="text-slate-500 font-medium">{viewingLog.specificType || viewingLog.category}</p>
              </div>
              <button 
                onClick={() => setViewingLog(null)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors ml-4"
              >
                <X size={24} className="text-slate-400" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Audit Details</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm py-2 border-b border-slate-100">
                      <span className="text-slate-500">Category</span>
                      <span className="font-bold text-slate-900">{viewingLog.category}</span>
                    </div>
                    <div className="flex justify-between text-sm py-2 border-b border-slate-100">
                      <span className="text-slate-500">Audit Date</span>
                      <span className="font-bold text-slate-900">{new Date(viewingLog.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Notes</h3>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 whitespace-pre-wrap text-slate-700 leading-relaxed italic">
                    {viewingLog.notes || 'No notes provided.'}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => { handleEdit(viewingLog); setViewingLog(null); }}
                    className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-slate-200 active:scale-95 transition-all"
                  >
                    <Edit2 size={18} />
                    Edit Entry
                  </button>
                  <button 
                    onClick={() => { setConfirmDeleteId(viewingLog.id); setViewingLog(null); }}
                    className="flex-1 py-3 border border-red-100 text-red-600 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-50 active:scale-95 transition-all"
                  >
                    <Trash2 size={18} />
                    Delete
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Audit Photos</h3>
                <div className="grid grid-cols-2 gap-3">
                  {viewingLog.photos.map(p => (
                    <div key={p.id} className="aspect-square rounded-xl overflow-hidden border border-slate-100 shadow-sm">
                      <img src={p.data} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  ))}
                  {viewingLog.photos.length === 0 && (
                    <div className="col-span-2 py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                      <Camera size={32} className="mb-2 opacity-20" />
                      <p className="text-xs">No photos captured</p>
                    </div>
                  )}
                </div>
                
                {references?.find(r => r.type === viewingLog.specificType && r.category === viewingLog.category) && (
                  <div className="mt-8">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Reference Comparison</h3>
                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex items-center gap-4">
                      <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border border-emerald-200">
                        <img 
                          src={references.find(r => r.type === viewingLog.specificType && r.category === viewingLog.category)!.photos[0]?.thumbnail} 
                          alt="" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Linked Reference</p>
                        <p className="text-sm font-bold text-slate-900 truncate">{viewingLog.specificType}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {filteredLogs?.map(log => (
          <div 
            key={log.id} 
            onClick={() => setViewingLog(log)}
            className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm cursor-pointer hover:border-emerald-200 hover:shadow-md transition-all group"
          >
            <div className="flex justify-between items-start mb-3 gap-2">
              <div className="flex gap-3 min-w-0 flex-1">
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-lg bg-slate-50 flex items-center justify-center overflow-hidden flex-shrink-0 border border-slate-100">
                    {log.photos.length > 0 ? (
                      <img src={log.photos[0].thumbnail} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Tag className="text-slate-300" size={20} />
                    )}
                  </div>
                  {references?.find(r => r.type === log.specificType && r.category === log.category)?.photos[0] && (
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-md border-2 border-white overflow-hidden shadow-sm flex-shrink-0" title="Reference Image">
                      <img 
                        src={references.find(r => r.type === log.specificType && r.category === log.category)!.photos[0].thumbnail} 
                        alt="" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-slate-900 break-words">{log.assetId}</h3>
                  <p className="text-xs text-slate-500 break-words">{log.specificType || log.category}</p>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider flex-shrink-0 ${getConditionColor(log.condition)}`}>
                {log.condition}
              </span>
            </div>
            
            <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
              <div className="flex items-center gap-1">
                <MapPin size={14} className="text-slate-400" />
                {log.location}
              </div>
              <div className="flex items-center gap-1">
                <AlertCircle size={14} className="text-slate-400" />
                {new Date(log.timestamp).toLocaleDateString()}
              </div>
            </div>

            {log.notes && (
              <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded-lg mb-3 italic line-clamp-3">
                "{log.notes}"
              </p>
            )}

            <div className="flex justify-end mt-2 pt-2 border-t border-slate-50">
              <button 
                onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(log.id); }}
                className="flex items-center gap-1 text-slate-400 hover:text-red-500 transition-colors p-2 text-xs font-medium"
              >
                <Trash2 size={16} />
                Delete Entry
              </button>
            </div>
          </div>
        ))}
        {filteredLogs?.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <p>No audit entries found. Start your audit!</p>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => {
          if (confirmDeleteId) db.auditLogs.delete(confirmDeleteId);
        }}
        title="Delete Audit Entry"
        message="Are you sure you want to delete this audit entry? This action cannot be undone."
      />
    </div>
  );
}
