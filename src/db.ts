/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Dexie, { type Table } from 'dexie';
import type { IdentificationReference, AuditLogEntry, Category, Location } from './types';

export class LightingAuditDB extends Dexie {
  identificationReferences!: Table<IdentificationReference>;
  auditLogs!: Table<AuditLogEntry>;
  categories!: Table<Category>;
  locations!: Table<Location>;

  constructor() {
    super('LightingAuditDB');
    this.version(1).stores({
      identificationReferences: 'id, category, type',
      auditLogs: 'id, assetId, category, specificType, condition, location, timestamp',
      categories: 'id, name',
      locations: 'id, name'
    });
  }
}

export const db = new LightingAuditDB();

// Initialize default data if empty
export async function initializeDefaults() {
  const categoryCount = await db.categories.count();
  if (categoryCount === 0) {
    await db.categories.bulkPut([
      { id: 'cat_1', name: 'LED Fixture' },
      { id: 'cat_2', name: 'Cable' },
      { id: 'cat_3', name: 'Power/Dimming' }
    ]);
  }

  const locationCount = await db.locations.count();
  if (locationCount === 0) {
    await db.locations.bulkPut([
      { id: 'loc_1', name: 'FOH Catwalk' },
      { id: 'loc_2', name: 'LX 1 (Electric)' },
      { id: 'loc_3', name: 'Storage' }
    ]);
  }

  const refCount = await db.identificationReferences.count();
  if (refCount === 0) {
    await db.identificationReferences.bulkPut([
      {
        id: 'ref_1',
        category: 'LED Fixture',
        type: 'LED Par (Wash)',
        features: 'Model: Chauvet SlimPAR Pro H USB\nManufacturer: Chauvet DJ\nFeatures: 6-in-1 LED (RGBAW+UV), Flicker-free, DMX/Master-Slave.\nReference: https://www.chauvetdj.com/products/slimpar-pro-h-usb/',
        photos: [{
          id: 'p1',
          data: 'https://picsum.photos/seed/slimpar/800/600',
          thumbnail: 'https://picsum.photos/seed/slimpar/200/200'
        }]
      },
      {
        id: 'ref_2',
        category: 'LED Fixture',
        type: 'LED Ellipsoidal (Profile)',
        features: 'Model: Source Four LED Series 2\nManufacturer: ETC\nFeatures: Lustr x7 Color System, Shutter blades, Interchangeable lens tubes.\nReference: https://www.etcconnect.com/Products/Lighting-Fixtures/Source-Four-LED-Series-2/Features.aspx',
        photos: [{
          id: 'p2',
          data: 'https://picsum.photos/seed/s4led/800/600',
          thumbnail: 'https://picsum.photos/seed/s4led/200/200'
        }]
      },
      {
        id: 'ref_3',
        category: 'LED Fixture',
        type: 'LED Fresnel',
        features: 'Model: ADJ Encore FR150z\nManufacturer: ADJ\nFeatures: 130W Warm White LED, 8-inch Fresnel lens, Manual zoom, Barn doors.\nReference: https://www.adj.com/encore-fr150z',
        photos: [{
          id: 'p3',
          data: 'https://picsum.photos/seed/fresnel/800/600',
          thumbnail: 'https://picsum.photos/seed/fresnel/200/200'
        }]
      },
      {
        id: 'ref_4',
        category: 'Cable',
        type: 'DMX Control Cable',
        features: 'Type: 5-Pin XLR (DMX512)\nUsage: Data transmission between console and fixtures.\nNote: 120-ohm shielded twisted pair.',
        photos: [{
          id: 'p4',
          data: 'https://picsum.photos/seed/dmxcable/800/600',
          thumbnail: 'https://picsum.photos/seed/dmxcable/200/200'
        }]
      },
      {
        id: 'ref_5',
        category: 'Power/Dimming',
        type: 'Portable Dimmer Pack',
        features: 'Model: DMX-4\nManufacturer: Chauvet DJ\nUsage: 4-channel dimmer/switch pack for legacy incandescent fixtures.',
        photos: [{
          id: 'p5',
          data: 'https://picsum.photos/seed/dimmer/800/600',
          thumbnail: 'https://picsum.photos/seed/dimmer/200/200'
        }]
      }
    ]);
  }
}
