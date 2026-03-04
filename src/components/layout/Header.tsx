"use client";

import { useStore } from "@/core/state/store";
import { dataBus } from "@/core/data/DataBus";
import { pluginManager } from "@/core/plugins/PluginManager";
import { Globe, Menu, Settings } from "lucide-react";
import { SearchBar } from "./SearchBar";

const REGIONS = [
    { id: "global", label: "Global", icon: Globe },
    { id: "americas", label: "Americas", icon: Globe },
    { id: "europe", label: "Europe", icon: Globe },
    { id: "mena", label: "MENA", icon: Globe },
    { id: "asiaPacific", label: "Asia", icon: Globe },
    { id: "africa", label: "Africa", icon: Globe },
    { id: "oceania", label: "Oceania", icon: Globe },
    { id: "arctic", label: "Arctic", icon: Globe },
];

const TIME_WINDOWS = ["1h", "6h", "24h", "48h", "7d"] as const;

export function Header() {
    const timeWindow = useStore((s) => s.timeWindow);
    const setTimeWindow = useStore((s) => s.setTimeWindow);
    const toggleLeftSidebar = useStore((s) => s.toggleLeftSidebar);
    const toggleConfigPanel = useStore((s) => s.toggleConfigPanel);

    return (
        <header className="header glass-panel">
            <div className="header__brand">
                <button
                    className="btn btn--icon"
                    onClick={toggleLeftSidebar}
                    title="Toggle layers"
                >
                    <Menu size={20} />
                </button>
                <div>
                    <div className="header__logo">WorldWideView</div>
                    <div className="header__subtitle">Geospatial Intelligence</div>
                </div>
            </div>
            <div className="header__controls">
                <SearchBar />
                {/* Separator */}
                <div style={{ width: 1, height: 20, background: "var(--border-subtle)", margin: "0 var(--space-sm)" }} />
                {/* Region presets */}
                {REGIONS.map((r) => (
                    <button
                        key={r.id}
                        className="btn btn--glow"
                        onClick={() => dataBus.emit("cameraPreset", { presetId: r.id })}
                        title={r.label}
                        style={{ display: "flex", alignItems: "center", gap: "6px" }}
                    >
                        <r.icon size={14} />
                        {r.label}
                    </button>
                ))}
                {/* Separator */}
                <div style={{ width: 1, height: 20, background: "var(--border-subtle)" }} />
                {/* Time windows */}
                {TIME_WINDOWS.map((tw) => (
                    <button
                        key={tw}
                        className={`btn ${timeWindow === tw ? "btn--active" : ""}`}
                        onClick={() => {
                            setTimeWindow(tw);
                            const range = useStore.getState().timeRange;
                            pluginManager.updateTimeRange(range);
                        }}
                    >
                        {tw}
                    </button>
                ))}
                {/* Separator */}
                <div style={{ width: 1, height: 20, background: "var(--border-subtle)", margin: "0 var(--space-sm)" }} />
                {/* Config Toggle */}
                <button
                    className="btn btn--icon btn--glow"
                    onClick={toggleConfigPanel}
                    title="Data Configuration"
                    style={{ padding: "0 8px" }}
                >
                    <Settings size={18} />
                </button>
                {/* Separator */}
                <div style={{ width: 1, height: 20, background: "var(--border-subtle)" }} />
                {/* Live indicator */}
                <div className="status-badge">
                    <span className="status-badge__dot" />
                    LIVE
                </div>
            </div>
        </header>
    );
}
