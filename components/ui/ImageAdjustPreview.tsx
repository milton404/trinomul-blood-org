"use client";

import { useState, useRef, useCallback } from "react";
import { ZoomIn, ZoomOut, RotateCw } from "lucide-react";

interface ImageAdjustLabels {
  clickToUpload?: string;
  dragHint?: string;
  removePhoto?: string;
  changePhoto?: string;
  zoomOut?: string;
  zoomIn?: string;
  rotate90?: string;
  moveUp?: string;
  moveLeft?: string;
  moveRight?: string;
  moveDown?: string;
  resetPosition?: string;
}

interface ImageAdjustPreviewProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  labels?: ImageAdjustLabels;
  initialUrl?: string | null;
  shape?: "circle" | "square";
}

const defaultLabels: ImageAdjustLabels = {
  clickToUpload: "Click to upload photo",
  dragHint: "Drag image to reposition",
  removePhoto: "Remove photo",
  changePhoto: "Change photo",
  zoomOut: "Zoom out",
  zoomIn: "Zoom in",
  rotate90: "Rotate 90",
  moveUp: "Move up",
  moveLeft: "Move left",
  moveRight: "Move right",
  moveDown: "Move down",
  resetPosition: "Reset position",
};

export default function ImageAdjustPreview({ file, onFileChange, labels, initialUrl, shape = "square" }: ImageAdjustPreviewProps) {
  const L = { ...defaultLabels, ...labels };
  const [preview, setPreview] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setPreview(url);
    setZoom(1);
    setRotation(0);
    setTranslateX(0);
    setTranslateY(0);
    onFileChange(f);
  }, [onFileChange]);

  const handleRemove = () => {
    setPreview(null);
    setZoom(1);
    setRotation(0);
    setTranslateX(0);
    setTranslateY(0);
    onFileChange(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, tx: translateX, ty: translateY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setTranslateX(dragStart.current.tx + dx);
    setTranslateY(dragStart.current.ty + dy);
  };

  const handleMouseUp = () => setDragging(false);

  const zoomDisplay = Math.round(zoom * 100) / 100;
  const nudgeUp = () => setTranslateY((y) => y - 5);
  const nudgeDown = () => setTranslateY((y) => y + 5);
  const nudgeLeft = () => setTranslateX((x) => x - 5);
  const nudgeRight = () => setTranslateX((x) => x + 5);

  const shapeClass = shape === "circle" ? "rounded-full" : "rounded-2xl";

  return (
    <div className="space-y-3">
      {!preview ? (
        initialUrl ? (
          <div className="space-y-3">
            <div className={`relative w-48 h-48 mx-auto overflow-hidden bg-slate-200 border-2 border-slate-200 ${shapeClass}`}>
              <img src={initialUrl} alt="" className="w-full h-full object-cover" />
            </div>
            <button type="button" onClick={() => inputRef.current?.click()} className="block mx-auto text-sm text-red-600 hover:text-red-700 font-medium transition-colors">{L.changePhoto}</button>
          </div>
        ) : (
        <button type="button" onClick={() => inputRef.current?.click()} className="w-full h-48 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-red-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
          </svg>
          <span className="text-sm font-medium">{L.clickToUpload}</span>
        </button>
        )
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-slate-400 text-center">{L.dragHint}</p>
          <div className={`relative w-48 h-48 mx-auto overflow-hidden bg-slate-200 border-2 ${shapeClass} ${dragging ? "border-red-400" : "border-slate-200"}`} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
            <img src={preview} alt="" className={`absolute inset-0 w-full h-full object-cover select-none ${dragging ? "cursor-grabbing" : "cursor-grab"}`} draggable={false} style={{ transform: `scale(${zoom}) rotate(${rotation}deg) translate(${translateX}px, ${translateY}px)` }} />
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center justify-center gap-3">
              <button type="button" onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors" title={L.zoomOut}><ZoomOut className="w-4 h-4" /></button>
              <span className="text-xs text-slate-500 w-10 text-center tabular-nums">{zoomDisplay}x</span>
              <button type="button" onClick={() => setZoom((z) => Math.min(2, z + 0.1))} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors" title={L.zoomIn}><ZoomIn className="w-4 h-4" /></button>
              <button type="button" onClick={() => setRotation((r) => (r + 90) % 360)} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors" title={L.rotate90}><RotateCw className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <div />
              <button type="button" onClick={nudgeUp} className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors flex items-center justify-center" title={L.moveUp}><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg></button>
              <div />
              <button type="button" onClick={nudgeLeft} className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors flex items-center justify-center" title={L.moveLeft}><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg></button>
              <button type="button" onClick={() => { setTranslateX(0); setTranslateY(0); }} className="p-1.5 rounded-lg bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-500 transition-colors flex items-center justify-center" title={L.resetPosition}><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="2" /></svg></button>
              <button type="button" onClick={nudgeRight} className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors flex items-center justify-center" title={L.moveRight}><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg></button>
              <div />
              <button type="button" onClick={nudgeDown} className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors flex items-center justify-center" title={L.moveDown}><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg></button>
              <div />
            </div>
          </div>
          <button type="button" onClick={handleRemove} className="block mx-auto text-xs text-slate-400 hover:text-red-500 transition-colors">{L.removePhoto}</button>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleSelect} className="hidden" />
    </div>
  );
}
