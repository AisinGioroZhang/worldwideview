import { useEffect } from "react";
import type { Viewer as CesiumViewer } from "cesium";
import {
    BoundingSphere,
    Cartesian3,
    EasingFunction,
    HeadingPitchRange,
    Math as CesiumMath,
    Matrix4,
} from "cesium";
import { dataBus } from "@/core/data/DataBus";
import { showSearchPin } from "./searchPinAnimation";

export function useCameraActions(viewer: CesiumViewer | null, isReady: boolean) {
    useEffect(() => {
        if (!viewer || !isReady) return;

        const unsubFace = dataBus.on("cameraFaceTowards", ({ lat, lon, alt }) => {
            if (!viewer || viewer.isDestroyed()) return;
            console.log("[GlobeView] Native faceTowards", lat, lon, alt);
            const target = Cartesian3.fromDegrees(lon, lat, alt);
            const offset = Cartesian3.subtract(
                viewer.camera.positionWC,
                target,
                new Cartesian3()
            );
            // lookAt sets the view relative to the target's ENU frame
            viewer.camera.lookAt(target, offset);
            // Immediately release the transform to allow free camera movement again
            // while preserving the orientation
            viewer.camera.lookAtTransform(Matrix4.IDENTITY);
        });

        const unsubGoTo = dataBus.on("cameraGoTo", ({ lat, lon, alt, distance, maxPitch, heading }) => {
            // Add a slight delay to avoid any immediate state-change cancellations from React
            setTimeout(() => {
                if (!viewer || viewer.isDestroyed()) return;
                const targetPosition = Cartesian3.fromDegrees(lon, lat, alt || 0);
                const viewDistance = distance !== undefined ? distance : Math.max(10000, (alt || 0) * 2 + 20000);
                const pitch = CesiumMath.toRadians(maxPitch !== undefined ? maxPitch : -30);
                const headingRad = CesiumMath.toRadians(heading !== undefined ? heading : 0);
                const offset = new HeadingPitchRange(headingRad, pitch, viewDistance);

                viewer.camera.flyToBoundingSphere(new BoundingSphere(targetPosition, 1), {
                    offset,
                    duration: 2.0,
                    easingFunction: EasingFunction.QUINTIC_IN_OUT,
                    complete: () => {
                        showSearchPin(viewer, lat, lon);
                    },
                });
            }, 50);
        });

        return () => {
            unsubFace();
            unsubGoTo();
        };
    }, [viewer, isReady]);
}

