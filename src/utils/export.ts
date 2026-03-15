/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { AuditLogEntry } from '../types';

function getSummaryRows(logs: AuditLogEntry[]) {
  const summary: Record<string, Record<string, number>> = {};
  logs.forEach(log => {
    const cat = log.category || 'Uncategorized';
    const type = log.specificType || 'Unknown Type';
    if (!summary[cat]) summary[cat] = {};
    if (!summary[cat][type]) summary[cat][type] = 0;
    summary[cat][type]++;
  });

  const rows: [string, string, number][] = [];
  Object.entries(summary).sort().forEach(([category, types]) => {
    Object.entries(types).sort().forEach(([type, count]) => {
      rows.push([category, type, count]);
    });
  });
  return rows;
}

export function exportToCSV(logs: AuditLogEntry[]) {
  const summaryRows = getSummaryRows(logs);
  const summaryHeader = ['Category', 'Type', 'Count'];
  const mainHeader = ['Asset ID', 'Category', 'Type', 'Condition', 'Location', 'Timestamp', 'Notes'];
  
  const rows = logs.map(log => [
    log.assetId,
    log.category,
    log.specificType,
    log.condition,
    log.location,
    new Date(log.timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }),
    log.notes.replace(/,/g, ';') // Simple escaping
  ]);

  const csvContent = [
    'SUMMARY',
    summaryHeader.join(','),
    ...summaryRows.map(row => row.join(',')),
    '',
    'FULL AUDIT LOG',
    mainHeader.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, `lighting-audit-${new Date().toISOString().split('T')[0]}.csv`);
}

export function exportToPDF(logs: AuditLogEntry[]) {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text('Theatrical Lighting Audit Report', 14, 15);
  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'medium' })}`, 14, 22);

  // Summary Table
  doc.setFontSize(14);
  doc.text('Summary by Equipment Type', 14, 32);
  
  const summaryData = getSummaryRows(logs);
  autoTable(doc, {
    startY: 35,
    head: [['Category', 'Type', 'Count']],
    body: summaryData,
    theme: 'grid',
    headStyles: { fillColor: [71, 85, 105] }, // Slate-600
    margin: { bottom: 10 }
  });

  // Main Table
  const finalY = (doc as any).lastAutoTable.finalY || 35;
  doc.setFontSize(14);
  doc.text('Full Audit Details', 14, finalY + 15);

  const tableData = logs.map(log => [
    log.assetId,
    log.category,
    log.specificType,
    log.condition,
    log.location,
    new Date(log.timestamp).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
  ]);

  autoTable(doc, {
    startY: finalY + 20,
    head: [['Asset ID', 'Category', 'Type', 'Condition', 'Location', 'Date/Time']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [5, 150, 105] } // Emerald-600
  });

  doc.save(`lighting-audit-${new Date().toISOString().split('T')[0]}.pdf`);
}

export function exportToRTF(logs: AuditLogEntry[]) {
  let rtfContent = '{\\rtf1\\ansi\\deff0\n';
  rtfContent += '{\\fonttbl{\\f0 Arial;}}\n';
  rtfContent += '\\f0\\fs32 \\b Theatrical Lighting Audit Report\\b0 \\par\n';
  rtfContent += `\\fs20 Generated on: ${new Date().toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'medium' })} \\par\\par\n`;

  // Summary Section
  rtfContent += '\\fs24 \\b Summary by Equipment Type\\b0 \\par\n';
  const summaryData = getSummaryRows(logs);
  summaryData.forEach(([cat, type, count]) => {
    rtfContent += `${cat} - ${type}: ${count} \\par\n`;
  });
  rtfContent += '\\par\n';

  // Details Section
  rtfContent += '\\fs24 \\b Full Audit Details\\b0 \\par\n';
  logs.forEach(log => {
    rtfContent += `\\b Asset ID:\\b0 ${log.assetId} \\par\n`;
    rtfContent += `\\b Category:\\b0 ${log.category} \\par\n`;
    rtfContent += `\\b Type:\\b0 ${log.specificType} \\par\n`;
    rtfContent += `\\b Condition:\\b0 ${log.condition} \\par\n`;
    rtfContent += `\\b Location:\\b0 ${log.location} \\par\n`;
    rtfContent += `\\b Date/Time:\\b0 ${new Date(log.timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })} \\par\n`;
    rtfContent += `\\b Notes:\\b0 ${log.notes || 'N/A'} \\par\n`;
    rtfContent += '--------------------------------- \\par\n';
  });

  rtfContent += '}';

  const blob = new Blob([rtfContent], { type: 'application/rtf' });
  saveAs(blob, `lighting-audit-${new Date().toISOString().split('T')[0]}.rtf`);
}
