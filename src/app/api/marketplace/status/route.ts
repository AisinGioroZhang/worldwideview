import { NextResponse } from "next/server";
import { validateMarketplaceAuth } from "@/lib/marketplace/auth";
import { getInstalledPlugins } from "@/lib/marketplace/repository";
import { handlePreflight, withCors } from "@/lib/marketplace/cors";
import { BUILT_IN_PLUGIN_IDS } from "@/lib/marketplace/builtinPlugins";

export async function OPTIONS(request: Request) {
    return handlePreflight(request);
}

export async function GET(request: Request) {
    const authError = await validateMarketplaceAuth(request);
    if (authError) return withCors(authError, request);

    try {
        const dbPlugins = await getInstalledPlugins();
        const dbIds = new Set(dbPlugins.map((p) => p.pluginId));

        // Merge built-in plugins that aren't already in the DB
        const builtInRecords = BUILT_IN_PLUGIN_IDS
            .filter((id) => !dbIds.has(id))
            .map((id) => ({
                pluginId: id,
                version: "built-in",
                config: "{}",
                installedAt: "",
            }));

        const plugins = [...dbPlugins, ...builtInRecords];
        return withCors(NextResponse.json({ plugins }), request);
    } catch (err) {
        console.error("[marketplace/status] Error:", err);
        return withCors(
            NextResponse.json({ error: "Failed to fetch status" }, { status: 500 }),
            request,
        );
    }
}
