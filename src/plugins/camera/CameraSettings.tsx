"use client";

import React, { ChangeEvent } from "react";
import { useStore } from "@/core/state/store";
import { Upload, Link as LinkIcon, Globe } from "lucide-react";
import { pluginManager } from "@/core/plugins/PluginManager";

export const CameraSettings: React.FC<{ pluginId: string }> = ({ pluginId }) => {
    const settingsRaw = useStore((s) => s.dataConfig.pluginSettings[pluginId]);
    const settings = { sourceType: "url", ...(settingsRaw || {}) };
    const updatePluginSettings = useStore((s) => s.updatePluginSettings);
    const setHighlightLayerId = useStore((s) => s.setHighlightLayerId);
    const [isLoading, setIsLoading] = React.useState(false);

    const handleSourceTypeChange = (type: "default" | "url" | "file" | "insecam") => {
        updatePluginSettings(pluginId, { sourceType: type, loaded: false });
        setHighlightLayerId(null);
    };

    const handleUrlChange = (e: ChangeEvent<HTMLInputElement>) => {
        updatePluginSettings(pluginId, { sourceType: settings.sourceType, customUrl: e.target.value, loaded: false });
        setHighlightLayerId(null);
    };

    const handleInsecamCategoryChange = (e: ChangeEvent<HTMLSelectElement>) => {
        updatePluginSettings(pluginId, { sourceType: settings.sourceType, insecamCategory: e.target.value, loaded: false });
        setHighlightLayerId(null);
    };

    const handleLoadData = async () => {
        setIsLoading(true);
        updatePluginSettings(pluginId, { loaded: true });
        setHighlightLayerId(null);

        // Trigger immediate fetch to reflect new data without toggling the layer
        const managed = pluginManager.getPlugin(pluginId);
        if (managed && managed.enabled) {
            await pluginManager.fetchForPlugin(pluginId, managed.context.timeRange);
        }
        setIsLoading(false);
    };

    const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                updatePluginSettings(pluginId, { customData: json, loaded: true });
                setHighlightLayerId(null);

                // Trigger immediate fetch to reflect loaded data without toggling the layer
                const managed = pluginManager.getPlugin(pluginId);
                if (managed && managed.enabled) {
                    await pluginManager.fetchForPlugin(pluginId, managed.context.timeRange);
                }
            } catch (err) {
                console.error("Failed to parse JSON file", err);
                alert("Invalid JSON file format.");
            }
        };
        reader.readAsText(file);
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: "var(--space-xs)" }}>
                Data Source Configuration
            </div>

            <div style={{ display: "flex", gap: "var(--space-xs)" }}>
                <button
                    onClick={() => handleSourceTypeChange("url")}
                    style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "4px",
                        padding: "8px",
                        borderRadius: "var(--radius-md)",
                        background: settings.sourceType === "url" ? "var(--accent-cyan-subtle)" : "var(--bg-tertiary)",
                        border: settings.sourceType === "url" ? "1px solid var(--accent-cyan)" : "1px solid var(--border-subtle)",
                        cursor: "pointer",
                        color: settings.sourceType === "url" ? "var(--accent-cyan)" : "var(--text-secondary)",
                        transition: "all 0.2s ease"
                    }}
                >
                    <LinkIcon size={14} />
                    <span style={{ fontSize: 10 }}>URL</span>
                </button>
                <button
                    onClick={() => handleSourceTypeChange("file")}
                    style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "4px",
                        padding: "8px",
                        borderRadius: "var(--radius-md)",
                        background: settings.sourceType === "file" ? "var(--accent-cyan-subtle)" : "var(--bg-tertiary)",
                        border: settings.sourceType === "file" ? "1px solid var(--accent-cyan)" : "1px solid var(--border-subtle)",
                        cursor: "pointer",
                        color: settings.sourceType === "file" ? "var(--accent-cyan)" : "var(--text-secondary)",
                        transition: "all 0.2s ease"
                    }}
                >
                    <Upload size={14} />
                    <span style={{ fontSize: 10 }}>File</span>
                </button>
                <button
                    onClick={() => handleSourceTypeChange("insecam")}
                    style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "4px",
                        padding: "8px",
                        borderRadius: "var(--radius-md)",
                        background: settings.sourceType === "insecam" ? "var(--accent-cyan-subtle)" : "var(--bg-tertiary)",
                        border: settings.sourceType === "insecam" ? "1px solid var(--accent-cyan)" : "1px solid var(--border-subtle)",
                        cursor: "pointer",
                        color: settings.sourceType === "insecam" ? "var(--accent-cyan)" : "var(--text-secondary)",
                        transition: "all 0.2s ease"
                    }}
                >
                    <Globe size={14} />
                    <span style={{ fontSize: 10 }}>Insecam</span>
                </button>
            </div>

            {settings.sourceType === "url" && (
                <div style={inputGroupStyle}>
                    <label style={labelStyle}>URL</label>
                    <div style={{ display: "flex", gap: "var(--space-sm)", marginTop: "4px" }}>
                        <input
                            type="text"
                            placeholder="http://..."
                            value={settings.customUrl || ""}
                            onChange={handleUrlChange}
                            style={{ ...inputStyle, flex: 1 }}
                        />
                        <button
                            onClick={handleLoadData}
                            disabled={!settings.customUrl || isLoading}
                            style={{
                                background: "var(--accent-cyan)",
                                color: "var(--bg-primary)",
                                border: "none",
                                borderRadius: "var(--radius-sm)",
                                padding: "0 var(--space-md)",
                                fontSize: 12,
                                fontWeight: 500,
                                cursor: (!settings.customUrl || isLoading) ? "not-allowed" : "pointer",
                                opacity: (!settings.customUrl || isLoading) ? 0.5 : 1,
                                transition: "all 0.2s ease"
                            }}
                        >
                            {isLoading ? "Loading..." : "Load"}
                        </button>
                    </div>
                </div>
            )}

            {settings.sourceType === "file" && (
                <div style={inputGroupStyle}>
                    <label style={labelStyle}>JSON File</label>
                    <input
                        type="file"
                        accept=".json"
                        onChange={handleFileUpload}
                        style={{
                            ...inputStyle,
                            width: "100%",
                            marginTop: "4px",
                            padding: "4px",
                            fontSize: "10px"
                        }}
                    />
                    {settings.customData && Array.isArray(settings.customData) && (
                        <div style={{ fontSize: 10, color: "var(--accent-green)", marginTop: "4px" }}>
                            ✓ Data loaded ({settings.customData.length} cameras)
                        </div>
                    )}
                </div>
            )}

            {settings.sourceType === "insecam" && (
                <div style={inputGroupStyle}>
                    <label style={labelStyle}>Category</label>
                    <div style={{ display: "flex", gap: "var(--space-sm)", marginTop: "4px" }}>
                        <select
                            value={settings.insecamCategory || ""}
                            onChange={handleInsecamCategoryChange}
                            style={{ ...inputStyle, flex: 1 }}
                        >
                            <option value="">Select Category</option>
                            <option value="rating">Highest Rated</option>
                            <option value="new">Newest</option>
                        </select>
                        <button
                            onClick={handleLoadData}
                            disabled={!settings.insecamCategory || isLoading}
                            style={{
                                background: "var(--accent-cyan)",
                                color: "var(--bg-primary)",
                                border: "none",
                                borderRadius: "var(--radius-sm)",
                                padding: "0 var(--space-md)",
                                fontSize: 12,
                                fontWeight: 500,
                                cursor: (!settings.insecamCategory || isLoading) ? "not-allowed" : "pointer",
                                opacity: (!settings.insecamCategory || isLoading) ? 0.5 : 1,
                                transition: "all 0.2s ease"
                            }}
                        >
                            {isLoading ? "Loading..." : "Load"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const inputGroupStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "4px"
};

const labelStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 600,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.05em"
};

const inputStyle: React.CSSProperties = {
    background: "var(--bg-tertiary)",
    border: "1px solid var(--border-subtle)",
    color: "var(--text-primary)",
    padding: "var(--space-xs) var(--space-sm)",
    borderRadius: "var(--radius-sm)",
    fontSize: 12,
    outline: "none",
};
