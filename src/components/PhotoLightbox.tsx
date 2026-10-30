import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { PhotoItem } from '../types';
import './PhotoLightbox.css';

interface PhotoLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  photos: PhotoItem[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
}

export const PhotoLightbox: React.FC<PhotoLightboxProps> = ({
  isOpen,
  onClose,
  photos,
  currentIndex,
  onIndexChange,
}) => {
  const [scale, setScale] = useState<number>(1.0);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef({ distance: 0, scale: 1 });
  const moved = useRef(false);
  const stageRef = useRef<HTMLDivElement>(null);

  // Reset zoom & pan when photo changes or modal opens
  useEffect(() => {
    setScale(1.0);
    setPosition({ x: 0, y: 0 });
    setIsDragging(false);
    pointers.current.clear();
  }, [currentIndex, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const stage = stageRef.current;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      setScale(value => Math.max(.7, Math.min(3.5, value + (event.deltaY < 0 ? .15 : -.15))));
    };
    stage?.addEventListener('wheel', wheel, { passive: false });
    return () => stage?.removeEventListener('wheel', wheel);
  }, [isOpen]);

  useEffect(() => { if (scale <= 1) setPosition({ x: 0, y: 0 }); }, [scale]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['Escape', 'ArrowRight', 'ArrowLeft', '=', '+', '-', '0'].includes(e.key)) e.preventDefault();
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === '=' || e.key === '+') {
        zoomIn();
      } else if (e.key === '-') {
        zoomOut();
      } else if (e.key === '0') {
        resetZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, photos.length]);

  if (!isOpen || photos.length === 0) return null;

  const currentPhoto = photos[currentIndex % photos.length];

  const handlePrev = () => {
    const prevIdx = (currentIndex - 1 + photos.length) % photos.length;
    onIndexChange(prevIdx);
  };

  const handleNext = () => {
    const nextIdx = (currentIndex + 1) % photos.length;
    onIndexChange(nextIdx);
  };

  const zoomIn = () => {
    setScale((prev) => Math.min(prev + 0.35, 3.5));
  };

  const zoomOut = () => {
    setScale((prev) => {
      const next = Math.max(prev - 0.35, 0.7);
      if (next <= 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const resetZoom = () => {
    setScale(1.0);
    setPosition({ x: 0, y: 0 });
  };

  // Drag to pan when zoomed in
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved.current = false;
    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), scale };
      setIsDragging(false);
      moved.current = true;
      return;
    }
    if (scale <= 1) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initialPosRef.current = { ...position };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      const ratio = Math.hypot(a.x - b.x, a.y - b.y) / Math.max(1, pinch.current.distance);
      setScale(Math.max(.7, Math.min(3.5, pinch.current.scale * ratio)));
      moved.current = true;
      return;
    }
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (Math.hypot(dx, dy) > 4) moved.current = true;
    setPosition({
      x: initialPosRef.current.x + dx,
      y: initialPosRef.current.y + dy,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const wasPinching = pointers.current.size > 1;
    pointers.current.delete(e.pointerId);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (!moved.current && !wasPinching && e.type !== 'pointercancel' && scale === 1) zoomIn();
    setIsDragging(false);
  };

  return (
    <div className="photo-lightbox-overlay" role="dialog" aria-modal="true" aria-label="照片放大查看" onClick={onClose}>
      {/* Top Header Bar */}
      <div className="lightbox-header" onClick={(e) => e.stopPropagation()}>
        <div className="lightbox-meta">
          <Sparkles size={16} className="gold-icon" />
          <span className="lightbox-title">
            {currentPhoto.title || currentPhoto.name || '节日回忆照片'}
          </span>
          <span className="lightbox-counter">
            {currentIndex + 1} / {photos.length}
          </span>
        </div>

        {/* Zoom Controls */}
        <div className="lightbox-tools">
          <button className="tool-btn" onClick={zoomIn} title="放大 (+)">
            <ZoomIn size={18} />
          </button>
          <span className="zoom-indicator">{Math.round(scale * 100)}%</span>
          <button className="tool-btn" onClick={zoomOut} title="缩小 (-)">
            <ZoomOut size={18} />
          </button>
          <button className="tool-btn" onClick={resetZoom} title="还原默认 (0)">
            <RotateCcw size={16} />
          </button>
          <div className="tool-sep" />
          <button className="tool-btn close-btn" onClick={onClose} title="返回玻璃画廊 (ESC)" aria-label="返回玻璃画廊" autoFocus>
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div
        className="lightbox-stage"
        ref={stageRef}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="lightbox-glass-frame">
        <img
          src={currentPhoto.url}
          alt={currentPhoto.title || currentPhoto.name}
          className={`lightbox-img ${isDragging ? 'dragging' : ''}`}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
          }}
          draggable={false}
        />
        </div>
      </div>

      {/* Prev / Next Navigation Arrows */}
      <button
        className="lightbox-nav-arrow prev"
        onClick={(e) => {
          e.stopPropagation();
          handlePrev();
        }}
        title="上一张 (←)"
      >
        <ChevronLeft size={28} />
      </button>

      <button
        className="lightbox-nav-arrow next"
        onClick={(e) => {
          e.stopPropagation();
          handleNext();
        }}
        title="下一张 (→)"
      >
        <ChevronRight size={28} />
      </button>

      {/* Bottom Caption and Thumbnail Strip */}
      <div className="lightbox-footer" onClick={(e) => e.stopPropagation()}>
        {currentPhoto.description && (
          <p className="lightbox-desc">{currentPhoto.description}</p>
        )}

        <div className="lightbox-strip">
          {photos.map((p, idx) => (
            <button
              type="button"
              key={p.id}
              className={`strip-thumb ${idx === currentIndex ? 'active' : ''}`}
              onClick={() => onIndexChange(idx)}
              aria-label={`查看${p.title || p.name}`}
              aria-pressed={idx === currentIndex}
            >
              <img src={p.url} alt={p.name} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
