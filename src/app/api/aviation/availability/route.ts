import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        return NextResponse.json({ availability: [] });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false },
    });

    try {
        // For a true gap analysis without RPC, it's expensive.
        // We'll approximate by finding the absolute min and absolute max.
        // If there are large gaps, an RPC would be required to break this up.
        const { data: minData } = await supabase
            .from("aviation_history")
            .select("timestamp")
            .order("timestamp", { ascending: true })
            .limit(1);

        const { data: maxData } = await supabase
            .from("aviation_history")
            .select("timestamp")
            .order("timestamp", { ascending: false })
            .limit(1);

        const ranges = [];

        if (minData && minData.length > 0 && maxData && maxData.length > 0) {
            ranges.push({
                start: new Date(minData[0].timestamp).getTime(),
                end: new Date(maxData[0].timestamp).getTime(),
            });
        }

        return NextResponse.json({ availability: ranges });
    } catch (err) {
        console.error("[API/aviation/availability] Error:", err);
        return NextResponse.json({ availability: [] });
    }
}
