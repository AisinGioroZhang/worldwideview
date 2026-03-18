"use client";

import { useState } from "react";
import type { PluginManifest } from "@/core/plugins/PluginManifest";
import { approveUnverifiedPlugin } from "@/lib/marketplace/trustedPlugins";
import styles from "./UnverifiedPluginDialog.module.css";

interface Props {
  manifest: PluginManifest;
  onAllow: () => void;
  onDeny: () => void;
}

export default function UnverifiedPluginDialog({ manifest, onAllow, onDeny }: Props) {
  const [loading, setLoading] = useState(false);

  function handleAllow() {
    setLoading(true);
    approveUnverifiedPlugin(manifest.id);
    onAllow();
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        <div className={styles.icon}>⚠️</div>
        <h3 className={styles.title}>Unverified Plugin</h3>
        <p className={styles.message}>
          <strong>{manifest.name ?? manifest.id}</strong> has not been verified
          by WorldWideView. Only install plugins from sources you trust.
        </p>
        <p className={styles.risk}>
          Unverified plugins run in your browser and could access your session
          data. Proceed at your own risk.
        </p>
        <div className={styles.actions}>
          <button className={styles.denyBtn} onClick={onDeny}>Cancel</button>
          <button
            className={styles.allowBtn}
            onClick={handleAllow}
            disabled={loading}
          >
            {loading ? "Loading…" : "Install Anyway"}
          </button>
        </div>
      </div>
    </div>
  );
}
