/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { db } from '../db';
import { Check, RefreshCw, Loader2, Image as ImageIcon, AlertCircle } from 'lucide-react';

const DEFAULT_ITEMS = [
  { id: 'ref_1', name: 'Chauvet SlimPAR Pro H USB LED Par fixture', type: 'LED Par (Wash)' },
  { id: 'ref_2', name: 'ETC Source Four LED Series 2 Ellipsoidal lighting fixture', type: 'LED Ellipsoidal (Profile)' },
  { id: 'ref_3', name: 'ADJ Encore FR150z LED Fresnel lighting fixture', type: 'LED Fresnel' },
  { id: 'ref_4', name: 'Professional 5-Pin XLR DMX Control Cable', type: 'DMX Control Cable' },
  { id: 'ref_5', name: 'Chauvet DJ DMX-4 Portable Dimmer Pack', type: 'Portable Dimmer Pack' }
];

export default function ImageApprovalPage() {
  const [images, setImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const generateImage = async (itemId: string, prompt: string) => {
    setLoading(prev => ({ ...prev, [itemId]: true }));
    setError(null);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: `A high-quality, professional product photograph of a ${prompt}. Studio lighting, clean white background, isolated.` }]
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1"
          }
        }
      });

      let imageUrl = '';
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      if (imageUrl) {
        setImages(prev => ({ ...prev, [itemId]: imageUrl }));
      } else {
        throw new Error("No image data returned");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to generate image. Please try again.");
    } finally {
      setLoading(prev => ({ ...prev, [itemId]: false }));
    }
  };

  const handleApprove = async (itemId: string) => {
    const imageUrl = images[itemId];
    if (!imageUrl) return;

    try {
      const ref = await db.identificationReferences.get(itemId);
      if (ref) {
        const newPhoto = {
          id: `ai_${Date.now()}`,
          data: imageUrl,
          thumbnail: imageUrl // For simplicity in this demo
        };
        await db.identificationReferences.update(itemId, {
          photos: [newPhoto]
        });
        // Remove from local state to show it's "done"
        setImages(prev => {
          const next = { ...prev };
          delete next[itemId];
          return next;
        });
      }
    } catch (err) {
      console.error(err);
      setError("Failed to save to database.");
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Reference Image Generation</h1>
        <p className="text-slate-500 mt-2">Generate and approve typical images for the default equipment list.</p>
      </header>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
          <AlertCircle size={20} />
          <p>{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {DEFAULT_ITEMS.map(item => (
          <div key={item.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="aspect-square bg-slate-100 flex items-center justify-center relative">
              {images[item.id] ? (
                <img src={images[item.id]} alt={item.name} className="w-full h-full object-cover" />
              ) : (
                <div className="text-slate-400 flex flex-col items-center gap-2">
                  <ImageIcon size={48} strokeWidth={1} />
                  <span className="text-sm">No image generated</span>
                </div>
              )}
              
              {loading[item.id] && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                  <Loader2 className="animate-spin text-emerald-600" size={32} />
                </div>
              )}
            </div>
            
            <div className="p-4">
              <h3 className="font-bold text-slate-900">{item.type}</h3>
              <p className="text-xs text-slate-500 mb-4">{item.name}</p>
              
              <div className="flex gap-2">
                <button
                  onClick={() => generateImage(item.id, item.name)}
                  disabled={loading[item.id]}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={16} className={loading[item.id] ? 'animate-spin' : ''} />
                  {images[item.id] ? 'Regenerate' : 'Generate'}
                </button>
                
                {images[item.id] && (
                  <button
                    onClick={() => handleApprove(item.id)}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <Check size={16} />
                    Approve
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
