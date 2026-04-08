import { useEffect, useRef } from "react";
import {
    Viewer as CesiumViewer,
    ImageryLayer,
    SceneMode,
    Cesium3DTileset
} from "cesium";
import { useStore } from "@/core/state/store";
import { createImageryProvider } from "./ImageryProviderFactory";

export function useImageryManager(viewer: CesiumViewer | null) {
    const baseLayerId = useStore((s) => s.mapConfig.baseLayerId);
    const sceneMode = useStore((s) => s.mapConfig.sceneMode);

    const currentImageryLayerRef = useRef<ImageryLayer | null>(null);
    const googleTilesetRef = useRef<Cesium3DTileset | null>(null);

    // 1. Manage Scene Mode (2D / 3D / Columbus)
    useEffect(() => {
        if (!viewer || viewer.isDestroyed()) return;

        let targetMode = SceneMode.SCENE3D;
        if (sceneMode === 1) targetMode = SceneMode.COLUMBUS_VIEW;
        if (sceneMode === 2) targetMode = SceneMode.SCENE2D;

        if (viewer.scene.mode !== targetMode) {
            if (targetMode === SceneMode.SCENE2D) viewer.scene.morphTo2D(1.0);
            else if (targetMode === SceneMode.SCENE3D) viewer.scene.morphTo3D(1.0);
            else if (targetMode === SceneMode.COLUMBUS_VIEW) viewer.scene.morphToColumbusView(1.0);
        }
    }, [viewer, sceneMode]);

    // 2. Manage Imagery Layer and Google 3D Tiles
    useEffect(() => {
        if (!viewer || viewer.isDestroyed()) return;

        async function updateImagery() {
            if (!viewer || viewer.isDestroyed()) return;

            // Handle Google 3D Tiles specifically
            const isGoogle3D = baseLayerId === "google-3d";

            // Toggle Google 3D Tileset visibility if it exists
            // Or find it in primitives
            const primitives = viewer.scene.primitives;
            let foundTileset: Cesium3DTileset | null = null;

            for (let i = 0; i < primitives.length; i++) {
                const p = primitives.get(i);
                if ((p as any)?._wwvGoogle3D) {
                    foundTileset = p;
                    break;
                }
            }

            if (foundTileset) {
                foundTileset.show = isGoogle3D;
            }

            const google3DAvailable = Boolean(foundTileset);
            viewer.scene.globe.show = !(isGoogle3D && google3DAvailable);

            if (isGoogle3D) {
                if (google3DAvailable) {
                    if (currentImageryLayerRef.current) {
                        viewer.imageryLayers.remove(currentImageryLayerRef.current);
                        currentImageryLayerRef.current = null;
                    }
                } else {
                    console.warn("[useImageryManager] Google 3D requested but tileset is unavailable. Keeping globe surface visible.");
                }
            } else {
                try {
                    const provider = await createImageryProvider(baseLayerId);
                    const newLayer = new ImageryLayer(provider);

                    if (currentImageryLayerRef.current) {
                        viewer.imageryLayers.remove(currentImageryLayerRef.current);
                    }

                    // Add as base layer (bottom)
                    viewer.imageryLayers.add(newLayer, 0);
                    currentImageryLayerRef.current = newLayer;
                } catch (err) {
                    console.error("[useImageryManager] Failed to load imagery:", baseLayerId, err);
                }
            }
        }

        updateImagery();
    }, [viewer, baseLayerId]);

    return {
        isGoogle3D: baseLayerId === "google-3d"
    };
}
