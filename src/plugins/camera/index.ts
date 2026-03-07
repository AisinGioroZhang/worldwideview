import { Camera } from "lucide-react";
import type {
    WorldPlugin,
    GeoEntity,
    TimeRange,
    PluginContext,
    LayerConfig,
    CesiumEntityOptions,
    FilterDefinition,
} from "@/core/plugins/PluginTypes";
import { CameraDetail } from "./CameraDetail";
import { CameraSettings } from "./CameraSettings";
import { useStore } from "@/core/state/store";
import { SmartFetcher } from "@/core/data/SmartFetcher";

export class CameraPlugin implements WorldPlugin {
    id = "camera";
    name = "Cameras";
    description = "Public live cameras from across the globe";
    icon = Camera;
    category = "infrastructure" as const;
    version = "1.0.0";

    private context: PluginContext | null = null;
    private cachedEntities: GeoEntity[] | null = null;
    private lastSettings: string | null = null;

    async initialize(ctx: PluginContext): Promise<void> {
        this.context = ctx;
    }

    destroy(): void {
        this.context = null;
    }

    requiresConfiguration(settingsRaw: any): boolean {
        const settings = { sourceType: "url", ...(settingsRaw || {}) };
        if (settings.sourceType === "default") return false;
        if (settings.sourceType === "insecam" && !settings.insecamCategory) return true;
        if (settings.sourceType === "url" && !settings.customUrl) return true;
        if (settings.sourceType === "file" && !settings.customData) return true;
        return false;
    }

    async fetch(_timeRange: TimeRange): Promise<GeoEntity[]> {
        const settingsRaw = useStore.getState().dataConfig.pluginSettings[this.id];
        const settings = { sourceType: "url", ...(settingsRaw || {}) };
        const settingsStr = JSON.stringify(settings);

        // Invalidate cache if settings changed
        if (this.lastSettings !== settingsStr) {
            this.cachedEntities = null;
            this.lastSettings = settingsStr;
        }

        if (this.cachedEntities) return this.cachedEntities;

        try {
            let data: any[] = [];

            if (settings.sourceType === "insecam") {
                if (!settings.insecamCategory || !settings.loaded) return []; // Wait for manual load
                const res = await fetch(`/api/camera/insecam?category=${settings.insecamCategory}`);
                if (!res.ok) throw new Error("Failed to load from Insecam API");
                const rawData = await res.json();

                this.cachedEntities = rawData.map((cam: any, index: number): GeoEntity => ({
                    id: `insecam-${cam.id || index}`,
                    pluginId: "camera",
                    latitude: parseFloat(cam.loclat),
                    longitude: parseFloat(cam.loclon),
                    timestamp: new Date(),
                    label: cam.city || cam.country || "Insecam Camera",
                    properties: {
                        ...cam,
                        stream: cam.image,
                        preview_url: cam.image,
                        categories: cam.manufacturer ? [cam.manufacturer] : [],
                    },
                }));

                return this.cachedEntities!;
            } else if (settings.sourceType === "url") {
                if (!settings.customUrl || !settings.loaded) return []; // Wait for manual load
                // Ensure URL has a protocol
                let fetchUrl = settings.customUrl;
                if (!/^https?:\/\//i.test(fetchUrl)) {
                    fetchUrl = `http://${fetchUrl}`;
                }

                // Delegate to SmartFetcher for robust cross-origin fetching
                data = await SmartFetcher.fetchJson(fetchUrl);
            } else if (settings.sourceType === "file") {
                if (!settings.customData || !settings.loaded) return []; // Wait for manual load
                data = settings.customData;
            } else {
                // Default fallback (though disabled in UI currently)
                const res = await fetch("/cameras.json");
                if (!res.ok) throw new Error("Failed to load cameras.json");
                data = await res.json();
            }

            if (!Array.isArray(data)) return [];

            this.cachedEntities = data.map((cam: any, index: number): GeoEntity => ({
                id: `camera-${index}`,
                pluginId: "camera",
                latitude: cam.latitude,
                longitude: cam.longitude,
                timestamp: new Date(),
                label: cam.city || cam.country || "Unknown Camera",
                properties: {
                    ...cam,
                },
            }));

            return this.cachedEntities;
        } catch (error) {
            console.error("[CameraPlugin] Fetch error:", error);
            if (this.context?.onError) {
                this.context.onError(error instanceof Error ? error : new Error(String(error)));
            }
            return [];
        }
    }

    getPollingInterval(): number {
        // Cameras are relatively static in terms of position, 
        // but we might want to refresh if the JSON updates.
        return 3600000; // 1 hour
    }

    getLayerConfig(): LayerConfig {
        return {
            color: "#60a5fa",
            clusterEnabled: true,
            clusterDistance: 50,
            maxEntities: 10000,
        };
    }

    renderEntity(entity: GeoEntity): CesiumEntityOptions {
        return {
            type: "point",
            color: "#60a5fa",
            size: 6,
            outlineColor: "#ffffff",
            outlineWidth: 1.5,
            labelText: entity.label,
            labelFont: "11px Inter, system-ui, sans-serif",
        };
    }

    getDetailComponent() {
        return CameraDetail;
    }

    getSettingsComponent() {
        return CameraSettings;
    }

    getFilterDefinitions(): FilterDefinition[] {
        return [
            {
                id: "country",
                label: "Country",
                type: "text",
                propertyKey: "country",
            },
            {
                id: "city",
                label: "City",
                type: "text",
                propertyKey: "city",
            },
            {
                id: "is_popular",
                label: "Popular Only",
                type: "boolean",
                propertyKey: "is_popular",
            }
        ];
    }
}
