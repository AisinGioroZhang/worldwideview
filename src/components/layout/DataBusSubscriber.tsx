"use client";

import { useEffect } from "react";
import { useStore } from "@/core/state/store";
import { dataBus } from "@/core/data/DataBus";
import { pluginManager } from "@/core/plugins/PluginManager";

/**
 * Subscribes to DataBus events and syncs state.
 * Renders nothing — purely a side-effect component.
 */
export function DataBusSubscriber() {
    const setPollingInterval = useStore((s) => s.setPollingInterval);
    const setEntities = useStore((s) => s.setEntities);
    const setEntityCount = useStore((s) => s.setEntityCount);
    const cacheMaxAge = useStore((s) => s.dataConfig.cacheMaxAge);

    useEffect(() => {
        pluginManager.setCacheMaxAge(cacheMaxAge);
    }, [cacheMaxAge]);

    useEffect(() => {
        const unsubReg = dataBus.on("pluginRegistered", ({ pluginId, defaultInterval }) => {
            const currentIntervals = useStore.getState().dataConfig.pollingIntervals;
            if (!currentIntervals[pluginId]) {
                setPollingInterval(pluginId, defaultInterval);
            }
        });

        const unsubData = dataBus.on("dataUpdated", ({ pluginId, entities }) => {
            setEntities(pluginId, entities);
            setEntityCount(pluginId, entities.length);
        });

        return () => {
            unsubReg();
            unsubData();
        };
    }, [setPollingInterval, setEntities, setEntityCount]);

    return null;
}
