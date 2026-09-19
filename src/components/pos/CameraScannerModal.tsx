"use client";

import { useEffect, useRef, useState } from "react";
import { CameraOff, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}
type BarcodeDetectorCtor = new (opts: { formats: string[] }) => BarcodeDetectorLike;

const FORMATS = ["qr_code", "ean_13", "ean_8", "code_128", "upc_a"];

/** Reads a barcode/QR with the device camera using the browser's BarcodeDetector. */
export function CameraScannerModal({
  open,
  onClose,
  onDetected,
}: {
  open: boolean;
  onClose: () => void;
  onDetected: (code: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<"starting" | "scanning" | "unsupported" | "denied">("starting");

  useEffect(() => {
    if (!open) return;
    const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
    if (!Detector || !navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      return;
    }
    setStatus("starting");
    let stream: MediaStream | null = null;
    let stopped = false;
    let timer = 0;
    const detector = new Detector({ formats: FORMATS });

    const tick = async () => {
      if (stopped || !videoRef.current) return;
      try {
        if (videoRef.current.readyState >= 2) {
          const codes = await detector.detect(videoRef.current);
          const value = codes.find((c) => c.rawValue)?.rawValue;
          if (value && !stopped) {
            stopped = true;
            onDetected(value);
            return;
          }
        }
      } catch {
        /* frame not ready */
      }
      timer = window.setTimeout(tick, 220);
    };

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((s) => {
        if (stopped) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          void videoRef.current.play();
        }
        setStatus("scanning");
        void tick();
      })
      .catch(() => setStatus("denied"));

    return () => {
      stopped = true;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [open, onDetected]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Escanear con cámara"
      description="Apunta el código de barras o QR del producto dentro del recuadro."
      size="md"
      footer={<Button variant="secondary" onClick={onClose}>Cerrar</Button>}
    >
      {status === "unsupported" || status === "denied" ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-warning-soft text-warning">
            <CameraOff className="h-6 w-6" />
          </div>
          <p className="font-display font-semibold text-text-primary">
            {status === "unsupported" ? "Tu navegador no puede leer códigos con la cámara" : "No pudimos acceder a la cámara"}
          </p>
          <p className="max-w-sm text-sm text-text-secondary">
            {status === "unsupported"
              ? "Usa Chrome o Edge en Android, o conecta un lector de código de barras USB: funciona escribiendo el código en el buscador."
              : "Revisa el permiso de cámara del navegador para este sitio e inténtalo de nuevo."}
          </p>
        </div>
      ) : (
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-surface-muted">
          <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="relative h-[42%] w-[72%] rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgb(0_0_0/0.35)]">
              <span className="absolute left-3 right-3 top-1/2 h-0.5 -translate-y-1/2 animate-pulse rounded-full bg-primary" />
            </div>
          </div>
          {status === "starting" && (
            <div className="absolute inset-0 grid place-items-center bg-surface/70 text-sm text-text-secondary">
              <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Iniciando cámara…</span>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
