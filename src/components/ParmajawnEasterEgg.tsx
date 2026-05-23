import { useState, useEffect } from "react";
import parmajawnSrc from "../assets/parmajawn.png";

export default function ParmajawnEasterEgg() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function show() {
      if (visible) return;
      setVisible(true);
      setTimeout(() => setVisible(false), 2000);
    }

    const handler = () => {
      if (Math.random() < 0.02) show();
    };

    window.addEventListener("parmajawn", handler);
    return () => window.removeEventListener("parmajawn", handler);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center pointer-events-none"
      style={{
        animation: "parmajawnFadeIn 0.2s ease-out",
      }}
    >
      <img
        src={parmajawnSrc}
        alt=""
        className="max-w-[80vw] max-h-[85vh] object-contain rounded-sm shadow-2xl ring-2 ring-wow-gold/60"
        style={{
          animation: "parmajawnScaleIn 0.3s ease-out",
        }}
      />
      <style>{`
        @keyframes parmajawnFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes parmajawnScaleIn {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
