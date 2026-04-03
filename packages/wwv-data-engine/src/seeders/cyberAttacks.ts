import { setLiveSnapshot } from '../redis';
import { registerSeeder } from '../scheduler';

export interface CyberAttack {
    id: string;
    targetName: string;
    targetLatitude: number;
    targetLongitude: number;
    originName: string;
    originLatitude: number;
    originLongitude: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    type: string; // DDoS, Malware, Intrusion, Data Exfiltration
    active: boolean;
}

const COUNTRIES = [
    { name: 'China', lat: 35.8617, lon: 104.1954 },
    { name: 'United States', lat: 37.0902, lon: -95.7129 },
    { name: 'Russia', lat: 61.5240, lon: 105.3188 },
    { name: 'Iran', lat: 32.4279, lon: 53.6880 },
    { name: 'North Korea', lat: 40.3399, lon: 127.5101 },
    { name: 'Germany', lat: 51.1657, lon: 10.4515 },
    { name: 'UK', lat: 55.3781, lon: -3.4360 },
    { name: 'France', lat: 46.2276, lon: 2.2137 },
    { name: 'India', lat: 20.5937, lon: 78.9629 },
    { name: 'Brazil', lat: -14.2350, lon: -51.9253 }
];

const TARGETS = [
    { name: 'Washington DC (Gov)', lat: 38.9072, lon: -77.0369 },
    { name: 'New York (Fin)', lat: 40.7128, lon: -74.0060 },
    { name: 'London (Fin)', lat: 51.5074, lon: -0.1278 },
    { name: 'Frankfurt (Fin/Tech)', lat: 50.1109, lon: 8.6821 },
    { name: 'Tokyo (Tech)', lat: 35.6762, lon: 139.6503 },
    { name: 'Silicon Valley (Tech)', lat: 37.3875, lon: -122.0575 },
    { name: 'Seattle (Tech)', lat: 47.6062, lon: -122.3321 },
    { name: 'Seoul (Tech/Gov)', lat: 37.5665, lon: 126.9780 },
    { name: 'Taipei (Gov/Tech)', lat: 25.0330, lon: 121.5654 },
    { name: 'Kyiv (Gov/Infra)', lat: 50.4501, lon: 30.5234 },
    { name: 'Tel Aviv (Tech/Gov)', lat: 32.0853, lon: 34.7818 }
];

const ATTACK_TYPES = ['DDoS', 'Malware', 'Intrusion', 'Data Exfiltration', 'Ransomware'];
const SEVERITIES: ('low' | 'medium' | 'high' | 'critical')[] = ['low', 'medium', 'high', 'critical'];

function generateMockAttacks(): CyberAttack[] {
    const attacks: CyberAttack[] = [];
    // Randomly generate 20 to 50 active attacks
    const count = Math.floor(Math.random() * 30) + 20;
    
    for (let i = 0; i < count; i++) {
        const origin = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
        const target = TARGETS[Math.floor(Math.random() * TARGETS.length)];
        const type = ATTACK_TYPES[Math.floor(Math.random() * ATTACK_TYPES.length)];
        const severity = SEVERITIES[Math.floor(Math.random() * SEVERITIES.length)];
        
        // Randomize location slightly around the country/target center
        const originLat = origin.lat + (Math.random() - 0.5) * 5;
        const originLon = origin.lon + (Math.random() - 0.5) * 5;
        const targetLat = target.lat + (Math.random() - 0.5) * 1;
        const targetLon = target.lon + (Math.random() - 0.5) * 1;

        attacks.push({
            id: `atk-${Date.now().toString(36)}-${Math.floor(Math.random() * 10000)}`,
            targetName: target.name,
            targetLatitude: targetLat,
            targetLongitude: targetLon,
            originName: origin.name,
            originLatitude: originLat,
            originLongitude: originLon,
            severity,
            type,
            active: true
        });
    }
    return attacks;
}

async function runCyberAttackSeeder() {
    console.log('[CyberAttacks] Generating mock cyber attacks...');
    try {
        const attacks = generateMockAttacks();
        
        const attacksObj = attacks.reduce((acc, attack) => {
            acc[attack.id] = attack;
            return acc;
        }, {} as Record<string, CyberAttack>);
        
        await setLiveSnapshot('cyber_attacks', attacksObj, 3600);
        console.log(`[CyberAttacks] Seeded ${attacks.length} active cyber attacks.`);
    } catch (err) {
        console.error('[CyberAttacks] Error seeding cyber attacks:', err);
    }
}

export function startCyberAttackSeeder() {
    console.log('[CyberAttacks Seeder] Initializing...');
    
    // Initial run
    runCyberAttackSeeder();
    
    // Run every 5 seconds to simulate highly dynamic attack maps
    setInterval(runCyberAttackSeeder, 5000);
}

registerSeeder({
    name: "cyber_attacks",
    init: startCyberAttackSeeder
});
