import { Atom, Radiation } from "lucide-react";
import {
    createSvgIconUrl,
    type WorldPlugin,
    type GeoEntity,
    type TimeRange,
    type PluginContext,
    type LayerConfig,
    type CesiumEntityOptions,
    type FilterDefinition
} from "@worldwideview/wwv-plugin-sdk";

const STATUS_COLORS: Record<string, string> = {
    "operational": "#22c55e", // Green
    "under construction": "#eab308", // Yellow
    "decommissioned": "#64748b", // Slate
    "abandoned": "#ef4444", // Red
};

export class NuclearPlugin implements WorldPlugin {
    id = "nuclear";
    name = "Nuclear Facilities";
    description = "Global nuclear power plants and reactors from OSM.";
    icon = Atom;
    category = "infrastructure" as const;
    version = "1.0.0";
    
    // Cache for colored icons
    private iconUrls: Record<string, string> = {};

    async initialize(_ctx: PluginContext): Promise<void> { }
    destroy(): void { }

    async fetch(_timeRange: TimeRange): Promise<GeoEntity[]> {
        // Rendering managed by StaticDataPlugin loader
        return [];
    }

    getPollingInterval(): number { return 0; }

    getLayerConfig(): LayerConfig {
        return {
            color: "#22d3ee",
            clusterEnabled: true,
            clusterDistance: 50,
            maxEntities: 1000,
        };
    }

    getFilterDefinitions(): FilterDefinition[] {
        return [
            {
                id: "status",
                label: "Facility Status",
                propertyKey: "status",
                type: "select",
                options: [
                    { value: "operational", label: "Operational" },
                    { value: "under construction", label: "Under Construction" },
                    { value: "decommissioned", label: "Decommissioned" },
                    { value: "abandoned", label: "Abandoned" }
                ]
            }
        ];
    }

    getLegend() {
        return [
            { label: "Operational", color: STATUS_COLORS["operational"], filterId: "status", filterValue: "operational" },
            { label: "Under Const.", color: STATUS_COLORS["under construction"], filterId: "status", filterValue: "under construction" },
            { label: "Decommissioned", color: STATUS_COLORS["decommissioned"], filterId: "status", filterValue: "decommissioned" },
            { label: "Abandoned", color: STATUS_COLORS["abandoned"], filterId: "status", filterValue: "abandoned" }
        ];
    }

    renderEntity(entity: GeoEntity): CesiumEntityOptions {
        const status = (entity.properties?.status as string)?.toLowerCase() || "unknown";
        const color = STATUS_COLORS[status] || "#22d3ee"; // Default to cyan if unknown

        if (!this.iconUrls[color]) {
            this.iconUrls[color] = createSvgIconUrl(Radiation, { color });
        }

        // Cesium viewer UI dynamically builds infobox from entity.properties.
        // To enrich it, we could mutate the properties inline or just rely on the plugin infrastructure.
        // For static data, the properties are whatever were in the GeoJSON.
        // Note: SDK doesn't natively support full infobox HTML override in renderEntity.

        return {
            type: "billboard",
            iconUrl: this.iconUrls[color],
            color: color
        };
    }
}
