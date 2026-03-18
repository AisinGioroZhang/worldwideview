"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { pluginManager } from "@/core/plugins/PluginManager";
import { useStore } from "@/core/state/store";
import type { PluginManifest } from "@/core/plugins/PluginManifest";
import { getApprovedUnverifiedIds } from "@/lib/marketplace/trustedPlugins";

/**
 * Syncs marketplace-installed plugins on window focus.
 * - Hot-loads new marketplace plugins without a page refresh.
 * - Detects built-in plugin changes that require a reload.
 * - Gates unverified plugins behind user approval.
 */
export function useMarketplaceSync() {
    const initLayer = useStore((s) => s.initLayer);
    const loadedIds = useRef<Set<string>>(new Set());
    const initialDisabledIds = useRef<Set<string> | null>(null);
    const [needsReload, setNeedsReload] = useState(false);
    const [pendingUnverified, setPendingUnverified] = useState<PluginManifest | null>(null);
    const pendingQueue = useRef<PluginManifest[]>([]);

    /** Snapshot current disabled set on first run. */
    async function captureInitialDisabled() {
        if (initialDisabledIds.current !== null) return;
        try {
            const res = await fetch("/api/marketplace/disabled-builtins");
            if (res.ok) {
                const data = await res.json();
                initialDisabledIds.current = new Set<string>(data.disabledIds ?? []);
            } else {
                initialDisabledIds.current = new Set();
            }
        } catch {
            initialDisabledIds.current = new Set();
        }
    }

    /** Detect if disabled built-in set has changed since startup. */
    async function checkBuiltinChanges() {
        try {
            const res = await fetch("/api/marketplace/disabled-builtins");
            if (!res.ok) return;
            const data = await res.json();
            const currentDisabled = new Set<string>(data.disabledIds ?? []);

            if (!initialDisabledIds.current) return;
            const initial = initialDisabledIds.current;

            if (currentDisabled.size !== initial.size) {
                setNeedsReload(true);
                return;
            }
            for (const id of currentDisabled) {
                if (!initial.has(id)) { setNeedsReload(true); return; }
            }
        } catch {
            // Non-critical
        }
    }

    /** Load a single manifest into the plugin manager. */
    async function loadManifest(manifest: PluginManifest) {
        if (!manifest.id || loadedIds.current.has(manifest.id)) return;
        if (pluginManager.getPlugin(manifest.id)) {
            loadedIds.current.add(manifest.id);
            return;
        }

        try {
            await pluginManager.loadFromManifest(manifest);
            initLayer(manifest.id);
            loadedIds.current.add(manifest.id);
            console.log(`[MarketplaceSync] Hot-loaded plugin "${manifest.id}"`);
        } catch (err) {
            console.error(`[MarketplaceSync] Failed to load "${manifest.id}":`, err);
        }
    }

    /** Hot-load new marketplace plugins, gating unverified ones. */
    async function syncMarketplacePlugins() {
        try {
            const res = await fetch("/api/marketplace/load");
            if (!res.ok) return;

            const { manifests } = (await res.json()) as { manifests: PluginManifest[] };
            const approved = getApprovedUnverifiedIds();

            for (const manifest of manifests) {
                if (!manifest.id) continue;
                if (loadedIds.current.has(manifest.id)) continue;

                // Unverified + not yet approved → queue for user confirmation
                if (manifest.trust === "unverified" && !approved.has(manifest.id)) {
                    pendingQueue.current.push(manifest);
                    continue;
                }

                await loadManifest(manifest);
            }

            // Show the first pending unverified plugin (one at a time)
            if (!pendingUnverified && pendingQueue.current.length > 0) {
                setPendingUnverified(pendingQueue.current.shift()!);
            }
        } catch (err) {
            console.error("[MarketplaceSync] Sync failed:", err);
        }
    }

    /** Called when user approves an unverified plugin. */
    const approveAndLoad = useCallback(async () => {
        if (pendingUnverified) {
            await loadManifest(pendingUnverified);
        }
        // Show next in queue or clear
        if (pendingQueue.current.length > 0) {
            setPendingUnverified(pendingQueue.current.shift()!);
        } else {
            setPendingUnverified(null);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pendingUnverified, initLayer]);

    /** Called when user denies an unverified plugin. */
    const denyPlugin = useCallback(() => {
        if (pendingQueue.current.length > 0) {
            setPendingUnverified(pendingQueue.current.shift()!);
        } else {
            setPendingUnverified(null);
        }
    }, []);

    const syncPlugins = useCallback(async () => {
        await captureInitialDisabled();
        await syncMarketplacePlugins();
        await checkBuiltinChanges();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initLayer]);

    useEffect(() => {
        syncPlugins();

        const handleFocus = () => { syncPlugins(); };
        window.addEventListener("focus", handleFocus);
        return () => window.removeEventListener("focus", handleFocus);
    }, [syncPlugins]);

    return { syncPlugins, needsReload, pendingUnverified, approveAndLoad, denyPlugin };
}
