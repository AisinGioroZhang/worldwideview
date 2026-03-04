import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// In-memory cache
let cachedData: unknown = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5000; // 5 seconds

export async function GET() {
    const now = Date.now();

    // Return cached data if fresh
    if (cachedData && now - cacheTimestamp < CACHE_TTL) {
        return NextResponse.json(cachedData);
    }

    try {
        const username = process.env.OPENSKY_USERNAME;
        const password = process.env.OPENSKY_PASSWORD;

        const headers: Record<string, string> = {};
        if (username && password) {
            headers["Authorization"] =
                "Basic " + Buffer.from(`${username}:${password}`).toString("base64");
        }

        const res = await fetch("https://opensky-network.org/api/states/all", {
            headers,
            next: { revalidate: 5 },
        });

        if (!res.ok) {
            // OpenSky rate limit or error — return cached or empty
            if (cachedData) return NextResponse.json(cachedData);
            return NextResponse.json(
                { states: [], time: Math.floor(now / 1000), error: `OpenSky returned ${res.status}` },
                { status: 200 }
            );
        }

        const data = await res.json();
        cachedData = data;
        cacheTimestamp = now;

        // Asynchronously save to Supabase to build history (do not block the response)
        if (data.states && Array.isArray(data.states)) {
            recordToSupabase(data.states, data.time || Math.floor(now / 1000)).catch(err => {
                console.error("[API/aviation] Supabase record error:", err);
            });
        }

        return NextResponse.json(data);
    } catch (err) {
        console.error("[API/aviation] Error:", err);
        if (cachedData) return NextResponse.json(cachedData);
        return NextResponse.json(
            { states: [], time: Math.floor(now / 1000) },
            { status: 200 }
        );
    }
}

// Fire-and-forget helper to save states to Supabase
async function recordToSupabase(states: any[], timeSecs: number) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        return; // Supabase not configured, skip recording
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const timestamp = new Date(timeSecs * 1000).toISOString();

    // Map the OpenSky states array to our database schema
    // OpenSky array format:
    // [icao24, callsign, origin_country, time_position, last_contact, longitude, latitude, baro_altitude, on_ground, velocity, true_track, vertical_rate, sensors, geo_altitude, squawk, spi, position_source]
    const records = states
        .filter(s => s[5] !== null && s[6] !== null) // must have valid lon/lat
        .map(s => ({
            timestamp,
            icao24: s[0],
            callsign: s[1]?.trim() || null,
            longitude: s[5],
            latitude: s[6],
            altitude: s[7], // baro_altitude (meters)
            speed: s[9],    // velocity (m/s)
            heading: s[10], // true_track
        }));

    if (records.length === 0) return;

    // Supabase allows bulk inserts, but a single payload with 5000+ planes can hit PostgREST limits (400 Bad Request)
    // We chunk the inserts into smaller batches.
    const CHUNK_SIZE = 2000;
    let successCount = 0;

    for (let i = 0; i < records.length; i += CHUNK_SIZE) {
        const chunk = records.slice(i, i + CHUNK_SIZE);
        const { error } = await supabase.from("aviation_history").insert(chunk);

        if (error) {
            console.error(`[API/aviation] Failed to insert chunk into Supabase:`, error.message);
        } else {
            successCount += chunk.length;
        }
    }

    console.log(`[API/aviation] Recorded ${successCount}/${records.length} states to Supabase history.`);
}
