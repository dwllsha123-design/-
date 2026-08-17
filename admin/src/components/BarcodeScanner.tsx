import { useEffect, useRef, useState } from 'react';

type Props = {
  onDetected: (code: string) => void;
  active?: boolean;
};

export function BarcodeScanner({ onDetected, active = true }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const callbackRef = useRef(onDetected);
  callbackRef.current = onDetected;
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!active) return;
    const video = videoRef.current;
    if (!video) return;
    let stream: MediaStream | null = null;
    let timer: number | null = null;
    let stopped = false;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (!video || stopped) return;
        video.srcObject = stream;
        await video.play();
        setReady(true);

        const Detector = (window as unknown as { BarcodeDetector?: new (opts: { formats: string[] }) => {
          detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
        } }).BarcodeDetector;

        if (!Detector) {
          setError('الكاميرا جاهزة — إن لم يُقرأ الكود تلقائياً أدخليه يدوياً أسفل الشاشة.');
          return;
        }

        const detector = new Detector({
          formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'qr_code', 'codabar'],
        });

        const tick = async () => {
          if (stopped || !video) return;
          try {
            if (video.readyState >= 2) {
              const codes = await detector.detect(video);
              const value = codes[0]?.rawValue?.trim();
              if (value) {
                callbackRef.current(value);
                return;
              }
            }
          } catch {
            /* keep scanning */
          }
          timer = window.setTimeout(tick, 350);
        };
        void tick();
      } catch {
        setError('تعذر فتح الكاميرا. اسمحي بالوصول أو أدخلي الباركود يدوياً.');
      }
    }

    void start();
    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [active]);

  return (
    <div className="scanner-box">
      <video ref={videoRef} playsInline muted className="scanner-video" />
      {ready ? <div className="scanner-frame" aria-hidden /> : null}
      {error ? <div className="muted" style={{ marginTop: 8 }}>{error}</div> : null}
    </div>
  );
}
