/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { BarChart3, AlertTriangle, Package, ClipboardList, Download } from 'lucide-react';
import { exportToCSV, exportToPDF, exportToRTF } from '../utils/export';

export default function SummaryPage() {
  const auditLogs = useLiveQuery(() => db.auditLogs.toArray());
  const categories = useLiveQuery(() => db.categories.toArray());

  if (!auditLogs) return null;

  const totalItems = auditLogs.length;
  const needsRepair = auditLogs.filter(l => l.condition === 'Needs Repair' || l.condition === 'Dead/Scrap').length;
  
  const categoryCounts = categories?.map(cat => ({
    name: cat.name,
    count: auditLogs.filter(l => l.category === cat.name).length
  })).filter(c => c.count > 0) || [];

  const repairList = auditLogs.filter(l => l.condition === 'Needs Repair' || l.condition === 'Dead/Scrap');

  const cableBreakdown = auditLogs
    .filter(l => l.category === 'Cable')
    .reduce((acc, log) => {
      const type = log.specificType || 'Unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  return (
    <div className="p-4 max-w-4xl mx-auto pb-24">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Summary Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <ClipboardList size={18} />
            <span className="text-sm font-medium">Total Audited</span>
          </div>
          <p className="text-3xl font-bold text-slate-900">{totalItems}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 text-amber-500 mb-2">
            <AlertTriangle size={18} />
            <span className="text-sm font-medium">Issues Found</span>
          </div>
          <p className="text-3xl font-bold text-slate-900">{needsRepair}</p>
        </div>
      </div>

      <section className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Download size={20} className="text-emerald-600" />
          <h2 className="text-lg font-bold text-slate-900">Generate Reports</h2>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <button 
            onClick={() => exportToCSV(auditLogs)}
            className="flex flex-col items-center gap-1 p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <span className="text-xs font-bold text-slate-700">CSV</span>
          </button>
          <button 
            onClick={() => exportToPDF(auditLogs)}
            className="flex flex-col items-center gap-1 p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <span className="text-xs font-bold text-slate-700">PDF</span>
          </button>
          <button 
            onClick={() => exportToRTF(auditLogs)}
            className="flex flex-col items-center gap-1 p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <span className="text-xs font-bold text-slate-700">RTF</span>
          </button>
        </div>
      </section>

      <div className="space-y-6">
        <section>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={20} className="text-emerald-600" />
            <h2 className="text-lg font-bold text-slate-900">Inventory by Category</h2>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 font-bold">Category</th>
                  <th className="px-4 py-3 font-bold text-right">Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categoryCounts.map(cat => (
                  <tr key={cat.name}>
                    <td className="px-4 py-3 text-sm font-medium text-slate-700">{cat.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-900 text-right font-bold">{cat.count}</td>
                  </tr>
                ))}
                {categoryCounts.length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-4 py-8 text-center text-slate-400 text-sm">No data available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-4">
            <Package size={20} className="text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900">Cable Inventory Breakdown</h2>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 font-bold">Cable Type</th>
                  <th className="px-4 py-3 font-bold text-right">Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.entries(cableBreakdown).map(([type, count]) => (
                  <tr key={type}>
                    <td className="px-4 py-3 text-sm font-medium text-slate-700">{type}</td>
                    <td className="px-4 py-3 text-sm text-slate-900 text-right font-bold">{count}</td>
                  </tr>
                ))}
                {Object.keys(cableBreakdown).length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-4 py-8 text-center text-slate-400 text-sm">No cable data available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={20} className="text-red-500" />
            <h2 className="text-lg font-bold text-slate-900">Repair & Maintenance List</h2>
          </div>
          <div className="space-y-3">
            {repairList.map(item => (
              <div key={item.id} className="bg-white p-4 rounded-2xl border border-red-100 shadow-sm flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-slate-900">{item.assetId}</h4>
                  <p className="text-xs text-slate-500">{item.specificType || item.category} • {item.location}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${item.condition === 'Dead/Scrap' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                  {item.condition}
                </span>
              </div>
            ))}
            {repairList.length === 0 && (
              <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 text-center">
                <p className="text-emerald-700 font-medium">All equipment is show ready! ✨</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
