import { NextRequest, NextResponse } from "next/server";
import * as insecam from "insecam-api";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || "rating";

    try {
        let cameraIds: string[] = [];

        if (category === "rating") {
            cameraIds = await insecam.rating as string[];
        } else if (category === "new") {
            // Cast to any to access the "new" property, which is a reserved keyword
            cameraIds = await (insecam as any).new as string[];
        } else {
            return NextResponse.json({ error: "Invalid category parameter" }, { status: 400 });
        }

        if (!cameraIds || cameraIds.length === 0) {
            return NextResponse.json({ error: "No cameras found" }, { status: 404 });
        }

        // Limit to top 20 to avoid excessive API calls and slow response times
        const topIds = cameraIds.slice(0, 20);

        const cameraDetailsPromises = topIds.map(async (id) => {
            try {
                return await insecam.camera(id);
            } catch (err) {
                console.error(`[Insecam Proxy] Failed to fetch details for camera ${id}:`, err);
                return null;
            }
        });

        const cameras = (await Promise.all(cameraDetailsPromises)).filter(Boolean);

        return NextResponse.json(cameras);
    } catch (error: any) {
        console.error("[Insecam Proxy] Error fetching from insecam API:", error);
        return NextResponse.json(
            { error: "Failed to fetch cameras from insecam API", details: error.message },
            { status: 500 }
        );
    }
}
