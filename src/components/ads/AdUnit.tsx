"use client";

import { useEffect, useRef } from "react";

interface AdUnitProps {
    adSlot: string;
    adFormat?: string;
    style?: React.CSSProperties;
    className?: string;
}

export function AdUnit({ adSlot, adFormat = "auto", style, className }: AdUnitProps) {
    const pushed = useRef(false);
    const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

    useEffect(() => {
        if (pushed.current || !clientId) return;
        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
            pushed.current = true;
        } catch (err) {
            console.error("[AdUnit] AdSense push error:", err);
        }
    }, [clientId]);

    if (!clientId) return null;

    return (
        <div className={className} style={style}>
            <ins
                className="adsbygoogle"
                style={{ display: "block" }}
                data-ad-client={clientId}
                data-ad-slot={adSlot}
                data-ad-format={adFormat}
                data-full-width-responsive="true"
            />
        </div>
    );
}
