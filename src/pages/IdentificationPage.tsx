/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { processImage } from '../utils/image';
import { Plus, Trash2, Camera, Image, Search, ChevronRight, ChevronDown, Edit2, Copy, X, ExternalLink } from 'lucide-react';
import type { IdentificationReference, Category, Photo } from '../types';
import ConfirmModal from '../components/ConfirmModal';

export default function IdentificationPage() {
  const references = useLiveQuery(() => db.identificationReferences.toArray());
  const categories = useLiveQuery(() => db.categories.toArray());
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingRef, setViewingRef] = useState<IdentificationReference | null>(null);
  const [search, setSearch] = useState('');
  const [newRef, setNewRef] = useState<Partial<IdentificationReference>>({
    category: 'LED Fixture',
    type: '',
    features: '',
    photos: []
  });
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleAddRef = async () => {
    if (!newRef.type || !newRef.category) return;
    
    if (editingId) {
      await db.identificationReferences.update(editingId, {
        category: newRef.category,
        type: newRef.type,
        features: newRef.features || '',
        photos: newRef.photos || []
      });
    } else {
      await db.identificationReferences.add({
        id: uuidv4(),
        category: newRef.category,
        type: newRef.type,
        features: newRef.features || '',
        photos: newRef.photos || []
      } as IdentificationReference);
    }
    
    setNewRef({ category: 'LED Fixture', type: '', features: '', photos: [] });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleEdit = (ref: IdentificationReference) => {
    setNewRef({
      category: ref.category,
      type: ref.type,
      features: ref.features,
      photos: ref.photos
    });
    setEditingId(ref.id);
    setIsAdding(true);
  };

  const handleDuplicate = (ref: IdentificationReference) => {
    setNewRef({
      category: ref.category,
      type: `${ref.type} (Copy)`,
      features: ref.features,
      photos: ref.photos
    });
    setEditingId(null);
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
      setNewRef(prev => ({ ...prev, photos: [...(prev.photos || []), ...newPhotos] }));
    }
  };

  const handleAddNewCategory = async () => {
    if (!newCategoryName) return;
    const id = uuidv4();
    await db.categories.add({ id, name: newCategoryName });
    setNewRef(prev => ({ ...prev, category: newCategoryName }));
    setNewCategoryName('');
    setShowNewCategory(false);
  };

  const filteredRefs = references?.filter(r => 
    r.type.toLowerCase().includes(search.toLowerCase()) || 
    r.category.toLowerCase().includes(search.toLowerCase()) ||
    r.features.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 max-w-4xl mx-auto pb-24">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Identification Reference</h1>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-emerald-600 text-white p-2 rounded-full shadow-lg hover:bg-emerald-700 transition-colors"
        >
          <Plus size={24} />
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text" 
          placeholder="Search references..." 
          className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editingId ? 'Edit Reference' : 'Add New Reference'}</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <div className="flex gap-2">
                  <select 
                    className="flex-1 p-2 border border-slate-200 rounded-lg"
                    value={newRef.category}
                    onChange={(e) => setNewRef(prev => ({ ...prev, category: e.target.value }))}
                  >
                    {categories?.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                  <button 
                    onClick={() => setShowNewCategory(true)}
                    className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>

              {showNewCategory && (
                <div className="flex gap-2 animate-in fade-in slide-in-from-top-2">
                  <input 
                    type="text" 
                    placeholder="New category name"
                    className="flex-1 p-2 border border-slate-200 rounded-lg"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                  />
                  <button 
                    onClick={handleAddNewCategory}
                    className="bg-slate-800 text-white px-3 py-1 rounded-lg text-sm"
                  >
                    Add
                  </button>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Item Type</label>
                <input 
                  type="text" 
                  className="w-full p-2 border border-slate-200 rounded-lg"
                  placeholder="e.g. Source Four ERS"
                  value={newRef.type}
                  onChange={(e) => setNewRef(prev => ({ ...prev, type: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Features</label>
                <textarea 
                  className="w-full p-2 border border-slate-200 rounded-lg h-24"
                  placeholder="Describe key features for identification..."
                  value={newRef.features}
                  onChange={(e) => setNewRef(prev => ({ ...prev, features: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Photos</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {newRef.photos?.map((p, i) => (
                    <div key={p.id} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200">
                      <img src={p.thumbnail} alt="" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => setNewRef(prev => ({ ...prev, photos: prev.photos?.filter((_, idx) => idx !== i) }))}
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
                  onClick={handleAddRef}
                  className="flex-1 py-2 bg-emerald-600 text-white rounded-xl font-medium"
                >
                  {editingId ? 'Update Reference' : 'Save Reference'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewingRef && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                  {viewingRef.category}
                </span>
                <h2 className="text-2xl font-bold text-slate-900 mt-2">{viewingRef.type}</h2>
              </div>
              <button 
                onClick={() => setViewingRef(null)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={24} className="text-slate-400" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Identification Features</h3>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 whitespace-pre-wrap text-slate-700 leading-relaxed">
                  {viewingRef.features || 'No features described.'}
                </div>
                
                <div className="mt-6 flex gap-2">
                  <button 
                    onClick={() => { handleEdit(viewingRef); setViewingRef(null); }}
                    className="flex-1 py-2 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                  >
                    <Edit2 size={16} />
                    Edit
                  </button>
                  <button 
                    onClick={() => { handleDuplicate(viewingRef); setViewingRef(null); }}
                    className="flex-1 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold flex items-center justify-center gap-2"
                  >
                    <Copy size={16} />
                    Duplicate
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Photos</h3>
                <div className="grid grid-cols-2 gap-2">
                  {viewingRef.photos.map(p => (
                    <div key={p.id} className="aspect-square rounded-xl overflow-hidden border border-slate-100">
                      <img src={p.data} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  ))}
                  {viewingRef.photos.length === 0 && (
                    <div className="col-span-2 py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                      <Camera size={32} className="mb-2 opacity-20" />
                      <p className="text-xs">No photos attached</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {filteredRefs?.map(ref => (
          <div 
            key={ref.id} 
            onClick={() => setViewingRef(ref)}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm cursor-pointer hover:border-emerald-200 hover:shadow-md transition-all group flex flex-col overflow-hidden"
          >
            <div className="p-4 flex gap-4">
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                {ref.photos.length > 0 ? (
                  <img src={ref.photos[0].thumbnail} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <Camera size={24} />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mb-1">
                  {ref.category}
                </span>
                <h3 className="text-lg font-bold text-slate-900 leading-tight group-hover:text-emerald-700 transition-colors">
                  {ref.type}
                </h3>
              </div>
            </div>
            
            <div className="px-4 pb-4 flex-1">
              <p className="text-sm text-slate-500 line-clamp-3 italic">
                {ref.features || "No features described."}
              </p>
            </div>

            <div className="bg-slate-50/50 border-t border-slate-100 p-2 flex justify-end gap-1">
              <button 
                onClick={(e) => { e.stopPropagation(); handleDuplicate(ref); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-xs font-bold"
                title="Duplicate"
              >
                <Copy size={16} />
                <span>Duplicate</span>
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); handleEdit(ref); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors text-xs font-bold"
                title="Edit"
              >
                <Edit2 size={16} />
                <span>Edit</span>
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(ref.id); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors text-xs font-bold"
                title="Delete"
              >
                <Trash2 size={16} />
                <span>Delete</span>
              </button>
            </div>
          </div>
        ))}
        {filteredRefs?.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <p>No references found. Add your first piece of gear!</p>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => {
          if (confirmDeleteId) db.identificationReferences.delete(confirmDeleteId);
        }}
        title="Delete Reference"
        message="Are you sure you want to delete this identification reference? This action cannot be undone."
      />
    </div>
  );
}
