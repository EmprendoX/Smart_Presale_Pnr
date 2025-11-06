"use client";

import React, { createContext, useCallback, useContext, useState } from "react";

type Toast = { id: number; title?: string; message: string };

const Ctx = createContext<{ show: (msg: string, title?: string) => void }>({ show: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [list, setList] = useState<Toast[]>([]);
  const show = useCallback((message: string, title?: string) => {
    const id = Date.now();
    setList(prev => [...prev, { id, message, title }]);
    setTimeout(() => setList(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <div className="fixed bottom-4 right-4 space-y-2">
        {list.map(t => (
          <div key={t.id} className="rounded-md bg-neutral-900 text-white px-4 py-3 shadow-lg">
            {t.title && <div className="font-semibold text-sm">{t.title}</div>}
            <div className="text-sm">{t.message}</div>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => {
  const context = useContext(Ctx);
  if (!context) {
    // Fallback si el contexto no está disponible (no debería pasar si ToastProvider está configurado)
    return { show: () => {} };
  }
  return context;
};


