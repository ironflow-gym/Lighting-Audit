/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Photo {
  id: string;
  data: string; // Base64 full resolution
  thumbnail: string; // Base64 thumbnail
}

export interface IdentificationReference {
  id: string;
  category: string;
  type: string;
  features: string;
  photos: Photo[];
}

export interface AuditLogEntry {
  id: string;
  assetId: string;
  category: string;
  specificType: string;
  condition: 'Good/Show Ready' | 'Needs Repair' | 'Missing Parts' | 'Dead/Scrap';
  location: string;
  notes: string;
  timestamp: string;
  photos: Photo[];
}

export interface Category {
  id: string;
  name: string;
}

export interface Location {
  id: string;
  name: string;
}
