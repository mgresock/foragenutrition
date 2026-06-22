"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { DecodeHintType, BarcodeFormat } from "@zxing/library";

// Full-screen camera barcode scanner. Reads product barcodes (EAN/UPC) and
// calls onDetect with the digits. Cleans up the camera stream on unmount.
export function BarcodeScanner({ onDetect, onClose }: { onDetect: (code: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const doneRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
    ]);
    const reader = new BrowserMultiFormatReader(hints);
    let cancelled = false;

    (async () => {
      try {
        const controls = await reader.decodeFromVideoDevice(undefined, videoRef.current!, (result) => {
          if (result && !doneRef.current) {
            doneRef.current = true;
            const code = result.getText().replace(/[^0-9]/g, "");
            controlsRef.current?.stop();
            onDetect(code);
          }
        });
        if (cancelled) controls.stop();
        else controlsRef.current = controls;
      } catch (err) {
        const name = (err as Error)?.name ?? "";
        setError(
          name === "NotAllowedError"
            ? "Camera permission denied. Allow camera access to scan barcodes."
            : "Couldn't start the camera. Try entering the item by name instead."
        );
      }
    })();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
    };
  }, [onDetect]);

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      <div className="flex items-center justify-between px-5 py-4" style={{ paddingTop: "calc(env(safe-area-inset-top,0px) + 12px)" }}>
        <span className="font-display font-bold text-text-primary text-sm uppercase tracking-wider">Scan Barcode</span>
        <button onClick={onClose} aria-label="Close scanner" className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center text-text-secondary hover:text-text-primary text-sm">✕</button>
      </div>

      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
        {!error && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[78%] max-w-sm aspect-[1.6] rounded-2xl border-2 border-lime/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" />
            <p className="absolute bottom-[18%] text-text-secondary text-xs font-mono">Center the barcode in the frame</p>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center bg-black/80">
            <p className="text-text-secondary text-sm leading-relaxed">{error}</p>
            <button onClick={onClose} className="px-5 py-2.5 bg-card border border-border rounded-xl text-text-primary text-sm">Close</button>
          </div>
        )}
      </div>
    </div>
  );
}
