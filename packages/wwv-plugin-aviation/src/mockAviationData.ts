import type { GeoEntity } from "@worldwideview/wwv-plugin-sdk";

const CALLSIGN_PREFIXES = [
    "UAL", "DAL", "AAL", "BAW", "AFR", "KLM", "DLH", "SIA", "QFA", "JAL", "ANA", "THY"
];

function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomLatLon(): { lat: number; lon: number } {
    // Uniform-ish global spread: lon uniform, lat from inverse-sine transform.
    const u = Math.random();
    const v = Math.random();
    const lon = -180 + 360 * u;
    const lat = (Math.asin(2 * v - 1) * 180) / Math.PI;
    return { lat, lon };
}

function makeIcao(index: number): string {
    return index.toString(16).padStart(6, "0").slice(-6);
}

export function generateMockAviationEntities(count: number): GeoEntity[] {
    const now = Date.now();
    const entities: GeoEntity[] = new Array(count);

    for (let i = 0; i < count; i++) {
        const { lat, lon } = randomLatLon();
        const onGround = Math.random() < 0.08;
        const altitudeM = onGround ? 0 : randomInt(500, 12500);
        const heading = randomInt(0, 359);
        const speed = onGround ? randomInt(0, 25) : randomInt(140, 280);
        const icao24 = makeIcao(i + 1);
        const callsign = `${randomChoice(CALLSIGN_PREFIXES)}${randomInt(10, 9999)}`;

        let altitudeBand = "extreme";
        if (altitudeM <= 0) altitudeBand = "grounded";
        else if (altitudeM < 3000) altitudeBand = "low";
        else if (altitudeM < 8000) altitudeBand = "mid";
        else if (altitudeM < 12000) altitudeBand = "high";

        entities[i] = {
            id: `aviation-mock-${icao24}`,
            pluginId: "aviation",
            latitude: lat,
            longitude: lon,
            altitude: altitudeM,
            heading,
            speed,
            timestamp: new Date(now - randomInt(0, 60_000)),
            label: callsign,
            properties: {
                icao24,
                callsign,
                origin_country: "Mock",
                altitude_m: altitudeM,
                altitude_band: altitudeBand,
                velocity_ms: speed,
                heading,
                vertical_rate: onGround ? 0 : randomInt(-15, 15),
                on_ground: onGround,
                squawk: String(randomInt(1000, 7777)),
            },
        };
    }

    return entities;
}
