import { db } from '../db';
import { setLiveSnapshot } from '../redis';
import { registerSeeder } from '../scheduler';
import crypto from 'crypto';

interface CivilUnrestEvent {
  id: string;
  latitude: number;
  longitude: number;
  type: string;
  subType: string;
  actor1: string;
  actor2: string;
  participants: number;
  date: string;
  source: string;
  notes: string;
}

const UNREST_HOTSPOTS = [
  { lat: 48.8566, lon: 2.3522, radius: 2 }, // Paris, France
  { lat: 14.6928, lon: -17.4467, radius: 2 }, // Dakar, Senegal
  { lat: 33.8886, lon: 35.4955, radius: 1 }, // Beirut, Lebanon
  { lat: -34.6037, lon: -58.3816, radius: 2 }, // Buenos Aires, Argentina
  { lat: 40.7128, lon: -74.0060, radius: 3 }, // New York, USA
  { lat: 51.5074, lon: -0.1278, radius: 2 }, // London, UK
  { lat: -1.2921, lon: 36.8219, radius: 2 }, // Nairobi, Kenya
];

const EVENT_TYPES = [
  'Protests',
  'Riots'
];

const SUB_TYPES = [
  'Peaceful protest',
  'Protest with intervention',
  'Violent demonstration',
  'Mob violence',
  'Excessive force against protesters'
];

function generateMockUnrestEvents(): CivilUnrestEvent[] {
  const events: CivilUnrestEvent[] = [];
  const today = new Date().toISOString().split('T')[0];

  for (const hotspot of UNREST_HOTSPOTS) {
    const numEvents = Math.floor(Math.random() * 5) + 1; // 1-5 events per hotspot
    
    for (let i = 0; i < numEvents; i++) {
        const u = Math.random();
        const v = Math.random();
        const w = hotspot.radius / 111.0; 
        const t = 2 * Math.PI * v;
        const x = w * Math.cos(t);
        const y = w * Math.sin(t);
        
        const lat = hotspot.lat + y;
        const lon = hotspot.lon + x;
        const type = EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)];
        const subType = SUB_TYPES[Math.floor(Math.random() * SUB_TYPES.length)];
        // participants can be between 100 to 5000
        const participants = Math.floor(Math.random() * 4900) + 100;
        
        events.push({
            id: crypto.randomUUID(),
            latitude: lat,
            longitude: lon,
            type,
            subType,
            actor1: 'Protesters',
            actor2: 'Police Forces',
            participants,
            date: today,
            source: 'Mock ACLED Data',
            notes: 'Reported ' + type.toLowerCase() + ' involving ' + subType.toLowerCase() + '.'
        });
    }
  }

  return events;
}

const insertStmt = db.prepare('INSERT OR REPLACE INTO civil_unrest (id, payload, source_ts, fetched_at) VALUES (@id, @payload, @source_ts, @fetched_at)');

export async function fetchCivilUnrest() {
  console.log('[Seeder: CivilUnrest] Mocking civil unrest data generation...');
  const events = generateMockUnrestEvents();

  const now = Date.now();
  let inserted = 0;
  
  const insertMany = db.transaction((rows: any[]) => {
      for (const row of rows) {
          insertStmt.run(row);
          inserted++;
      }
  });

  const dbRows = events.map(e => ({
      id: e.id,
      payload: JSON.stringify(e),
      source_ts: now,
      fetched_at: now
  }));
  
  insertMany(dbRows);
  console.log('[Seeder: CivilUnrest] Inserted ' + inserted + ' events into DB.');

  try {
      const geoEntities = events.map(e => ({
          id: 'unrest-' + e.id,
          latitude: e.latitude,
          longitude: e.longitude,
          properties: {
              type: e.type,
              subType: e.subType,
              participants: e.participants,
              actor1: e.actor1,
              actor2: e.actor2,
              date: e.date,
              notes: e.notes
          }
      }));
      
      await setLiveSnapshot('civil_unrest', geoEntities, 3600 * 24); // Cache for 24 hours
  } catch (err) {
      console.warn('[Seeder: CivilUnrest] Redis cache failed:', err);
  }
}

registerSeeder({
    name: 'civilUnrest',
    cron: '0 0 * * *', // Run daily at midnight
    fn: fetchCivilUnrest
});
