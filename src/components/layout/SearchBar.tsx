"use client";

import { useState, useEffect, useRef } from "react";
import { Search, MapPin } from "lucide-react";
import { useStore } from "@/core/state/store";
import { COUNTRIES } from "@/core/data/countries";
import { pluginManager } from "@/core/plugins/PluginManager";
import type { GeoEntity } from "@/core/plugins/PluginTypes";

interface SearchResult {
    id: string;
    label: string;
    subLabel?: string;
    score: number;
    lat: number;
    lon: number;
    type: "country" | "entity";
    pluginId?: string;
    entity?: GeoEntity;
}

interface SearchSection {
    title: string;
    icon: React.ReactNode;
    results: SearchResult[];
    maxScore: number;
}

function calculateScore(query: string, text: string | undefined): number {
    if (!text || !query) return 0;
    const lowerQuery = query.toLowerCase();
    const lowerText = text.toLowerCase();
    if (lowerText === lowerQuery) return 100;
    if (lowerText.startsWith(lowerQuery)) return 50;
    if (lowerText.includes(lowerQuery)) return 10;
    return 0;
}

export function SearchBar() {
    const [query, setQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [sections, setSections] = useState<SearchSection[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);

    const setCameraPosition = useStore((s) => s.setCameraPosition);
    const setSelectedEntity = useStore((s) => s.setSelectedEntity);
    const toggleLayer = useStore((s) => s.toggleLayer);
    const layers = useStore((s) => s.layers);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (!query.trim()) {
            setSections([]);
            return;
        }

        const newSections: SearchSection[] = [];
        const lowerQuery = query.toLowerCase();

        // 1. Search Countries
        const countryResults: SearchResult[] = [];
        for (const country of COUNTRIES) {
            const nameScore = calculateScore(lowerQuery, country.name);
            const isoScore = calculateScore(lowerQuery, country.isoCode);
            const maxScore = Math.max(nameScore, isoScore);
            if (maxScore > 0) {
                countryResults.push({
                    id: country.id,
                    label: country.name,
                    subLabel: country.isoCode,
                    score: maxScore,
                    lat: country.lat,
                    lon: country.lon,
                    type: "country",
                });
            }
        }
        if (countryResults.length > 0) {
            countryResults.sort((a, b) => b.score - a.score);
            newSections.push({
                title: "Countries",
                icon: <MapPin size={16} />,
                results: countryResults.slice(0, 5),
                maxScore: countryResults[0].score,
            });
        }

        // 2. Search Entities per Plugin
        const entitiesByPlugin = useStore.getState().entitiesByPlugin;
        for (const [pluginId, entities] of Object.entries(entitiesByPlugin)) {
            const pluginResults: SearchResult[] = [];
            const managedNode = pluginManager.getPlugin(pluginId);
            if (!managedNode) continue;

            const isLayerEnabled = layers[pluginId]?.enabled;
            if (!isLayerEnabled) continue; // Only search active layers

            for (const entity of entities) {
                let maxScore = calculateScore(lowerQuery, entity.label || entity.id);

                // Check properties (like mmsi, callsign, etc.)
                if (entity.properties) {
                    for (const val of Object.values(entity.properties)) {
                        if (typeof val === "string" || typeof val === "number") {
                            const propScore = calculateScore(lowerQuery, String(val));
                            if (propScore > maxScore) maxScore = propScore;
                        }
                    }
                }

                if (maxScore > 0) {
                    pluginResults.push({
                        id: entity.id,
                        label: entity.label || entity.id,
                        score: maxScore,
                        lat: entity.latitude,
                        lon: entity.longitude,
                        type: "entity",
                        pluginId: pluginId,
                        entity: entity,
                    });
                }
            }

            if (pluginResults.length > 0) {
                pluginResults.sort((a, b) => b.score - a.score);
                const PluginIcon = managedNode.plugin.icon;
                newSections.push({
                    title: managedNode.plugin.name,
                    icon: typeof PluginIcon === "string" ? <span>{PluginIcon}</span> : PluginIcon ? <PluginIcon size={16} /> : <MapPin size={16} />,
                    results: pluginResults.slice(0, 5),
                    maxScore: pluginResults[0].score,
                });
            }
        }

        // Sort sections by top score
        newSections.sort((a, b) => b.maxScore - a.maxScore);
        setSections(newSections);
    }, [query, layers]); // Re-run if query or active layers change

    const handleSelect = (result: SearchResult) => {
        setIsOpen(false);
        setQuery(""); // Clear or keep? Let's clear for now.

        // Fly to location
        // For countries, zoom out a bit (e.g. altitude 5000000)
        // For entities, zoom in closer (e.g. altitude 50000)
        const altitude = result.type === "country" ? 5000000 : 50000;
        setCameraPosition(result.lat, result.lon, altitude);

        if (result.type === "entity" && result.entity) {
            setSelectedEntity(result.entity);
        } else {
            setSelectedEntity(null);
        }
    };

    return (
        <div className="search-bar" ref={containerRef} style={{ position: "relative" }}>
            <div className="search-bar__input-wrapper" style={{ display: "flex", alignItems: "center", background: "rgba(255, 255, 255, 0.05)", borderRadius: "var(--radius-md)", padding: "4px 8px", border: "1px solid var(--border-subtle)" }}>
                <Search size={16} color="var(--text-muted)" style={{ marginRight: "8px" }} />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    placeholder="Search countries, flights, vessels..."
                    style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--text-main)",
                        outline: "none",
                        width: "250px",
                        fontSize: "0.9rem"
                    }}
                />
            </div>

            {isOpen && sections.length > 0 && (
                <div className="search-bar__dropdown glass-panel" style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    left: 0,
                    right: 0,
                    maxHeight: "400px",
                    overflowY: "auto",
                    zIndex: 100,
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    padding: "12px"
                }}>
                    {sections.map((section) => (
                        <div key={section.title} className="search-section">
                            <div className="search-section__header" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: "6px" }}>
                                {section.icon}
                                {section.title}
                            </div>
                            <div className="search-section__results" style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                {section.results.map((result) => (
                                    <button
                                        key={result.id}
                                        className="search-result-item"
                                        onClick={() => handleSelect(result)}
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            padding: "6px 8px",
                                            background: "rgba(255, 255, 255, 0.02)",
                                            border: "none",
                                            borderRadius: "var(--radius-sm)",
                                            color: "var(--text-main)",
                                            cursor: "pointer",
                                            textAlign: "left"
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)"}
                                        onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)"}
                                    >
                                        <span style={{ fontWeight: 500, fontSize: "0.85rem" }}>{result.label}</span>
                                        {result.subLabel && <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{result.subLabel}</span>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {isOpen && query.trim() && sections.length === 0 && (
                <div className="search-bar__dropdown glass-panel" style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    left: 0,
                    right: 0,
                    padding: "12px",
                    zIndex: 100,
                    textAlign: "center",
                    color: "var(--text-muted)",
                    fontSize: "0.85rem"
                }}>
                    No results found.
                </div>
            )}
        </div>
    );
}
