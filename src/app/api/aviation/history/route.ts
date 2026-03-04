import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const timeParam = searchParams.get("time");

    if (!timeParam) {
        return NextResponse.json({ error: "Missing time parameter" }, { status: 400 });
    }

    const targetTimeMs = parseInt(timeParam);
    if (isNaN(targetTimeMs)) {
        return NextResponse.json({ error: "Invalid time parameter" }, { status: 400 });
    }

    const targetDate = new Date(targetTimeMs);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        return NextResponse.json({ records: [], targetTime: targetTimeMs });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        // Find the closest timestamp before or exactly at target time
        const { data: timeData, error: timeError } = await supabase
            .from("aviation_history")
            .select("timestamp")
            .lte("timestamp", targetDate.toISOString())
            .order("timestamp", { ascending: false })
            .limit(1);

        if (timeError) {
            console.error("[API/aviation/history] Supabase error:", timeError);
            return NextResponse.json({ records: [], targetTime: targetTimeMs });
        }

        if (!timeData || timeData.length === 0) {
            return NextResponse.json({ records: [], targetTime: targetTimeMs });
        }

        const closestTimestamp = timeData[0].timestamp;

        // Fetch all generic records that match this exact timestamp
        const { data: records, error: recordsError } = await supabase
            .from("aviation_history")
            .select("icao24, timestamp, latitude, longitude, altitude, heading, speed, callsign")
            .eq("timestamp", closestTimestamp);

        if (recordsError) {
            console.error("[API/aviation/history] Supabase records error:", recordsError);
            return NextResponse.json({ records: [], targetTime: targetTimeMs });
        }

        return NextResponse.json({
            records,
            recordTime: new Date(closestTimestamp).getTime()
        });

    } catch (err) {
        console.error("[API/aviation/history] Unexpected error:", err);
        return NextResponse.json({ records: [], targetTime: targetTimeMs });
    }
}
