"use client";

import { useState } from "react";
import { Modal } from "./ui/Modal";

export default function Gallery({ images }: { images: string[] }) {
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  
  if (!images?.length) return null;
  
  return (
    <div>
      <div 
        className="aspect-video w-full rounded-lg bg-neutral-100 mb-3 cursor-pointer"
        style={{ backgroundImage: `url(${images[active]})`, backgroundSize: "cover" }}
        onClick={() => setOpen(true)} 
      />
      <div className="grid grid-cols-5 gap-2">
        {images.map((src, idx) => (
          <div 
            key={src} 
            className={`aspect-[4/3] rounded-md bg-neutral-100 bg-cover cursor-pointer ${idx === active ? "ring-2 ring-brand" : ""}`}
            style={{ backgroundImage: `url(${src})` }}
            onClick={() => setActive(idx)} 
          />
        ))}
      </div>
      <Modal open={open} title="Galería" onClose={() => setOpen(false)}>
        <img src={images[active]} alt="" className="w-full h-auto rounded-md" />
      </Modal>
    </div>
  );
}

