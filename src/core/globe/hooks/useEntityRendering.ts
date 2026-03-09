import { useEffect } from "react";
import { Cartesian3 } from "cesium";
import type { Viewer as CesiumViewer } from "cesium";
import type { GeoEntity, CesiumEntityOptions } from "@/core/plugins/PluginTypes";
import { renderEntitiesChunked, AnimatableItem } from "../EntityRenderer";
import { createUpdateLoop } from "../AnimationLoop";

/** Sort entities by distance to camera (closest first) for progressive loading. */
function sortByDistanceToCamera(
    entities: Array<{ entity: GeoEntity; options: CesiumEntityOptions }>,
    viewer: CesiumViewer
): Array<{ entity: GeoEntity; options: CesiumEntityOptions }> {
    const camPos = viewer.camera.positionWC;
    const scratch = new Cartesian3();
    return [...entities].sort((a, b) => {
        const posA = Cartesian3.fromDegrees(a.entity.longitude, a.entity.latitude, a.entity.altitude || 0, undefined, scratch);
        const distA = Cartesian3.distanceSquared(camPos, posA);
        const posB = Cartesian3.fromDegrees(b.entity.longitude, b.entity.latitude, b.entity.altitude || 0, undefined, scratch);
        const distB = Cartesian3.distanceSquared(camPos, posB);
        return distA - distB;
    });
}

export function useEntityRendering(
    viewer: CesiumViewer | null,
    isReady: boolean,
    visibleEntities: Array<{ entity: GeoEntity; options: CesiumEntityOptions }>,
    animatablesMapRef: React.MutableRefObject<Map<string, AnimatableItem>>,
    hoveredEntityIdRef: React.MutableRefObject<string | null>,
    sceneSettings: {
        showFps: boolean;
        resolutionScale: number;
        msaaSamples: number;
        enableFxaa: boolean;
        maxScreenSpaceError: number;
    }
) {
    useEffect(() => {
        if (!viewer || !isReady || viewer.isDestroyed()) return;

        // Sync scene settings
        viewer.scene.debugShowFramesPerSecond = sceneSettings.showFps;
        viewer.resolutionScale = sceneSettings.resolutionScale;
        viewer.scene.msaaSamples = sceneSettings.msaaSamples;
        viewer.scene.postProcessStages.fxaa.enabled = sceneSettings.enableFxaa;
        const primitives = viewer.scene.primitives as any;
        for (let i = 0; i < primitives.length; i++) {
            const p = primitives.get(i);
            if (p?.maximumScreenSpaceError !== undefined) {
                p.maximumScreenSpaceError = sceneSettings.maxScreenSpaceError;
            }
        }

        // Sort entities closest-first so they progressively load from camera outward
        const sorted = sortByDistanceToCamera(visibleEntities, viewer);

        // Attach animation loop immediately with a live getter so it sees entities
        // as they are added during chunked loading (horizon culling runs from frame 1)
        const updatePositions = createUpdateLoop(
            viewer,
            () => Array.from(animatablesMapRef.current.values()),
            hoveredEntityIdRef
        );
        viewer.scene.preUpdate.addEventListener(updatePositions);

        // Chunked rendering fills the map progressively; animation loop picks up new items each frame
        renderEntitiesChunked(viewer, sorted, animatablesMapRef.current);

        return () => {
            if (!viewer.isDestroyed()) {
                viewer.scene.preUpdate.removeEventListener(updatePositions);
                // Synchronously flush all labels to prevent stale labels persisting
                const labels = (viewer as any)?._wwvLabels;
                if (labels) {
                    for (const item of animatablesMapRef.current.values()) {
                        if (item.labelPrimitive && !item.labelPrimitive.isDestroyed?.()) {
                            labels.remove(item.labelPrimitive);
                            item.labelPrimitive = undefined;
                        }
                    }
                }
            }
        };
    }, [
        viewer,
        isReady,
        visibleEntities,
        sceneSettings.showFps,
        sceneSettings.resolutionScale,
        sceneSettings.msaaSamples,
        sceneSettings.enableFxaa,
        sceneSettings.maxScreenSpaceError,
        animatablesMapRef,
        hoveredEntityIdRef
    ]);
}
