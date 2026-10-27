import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
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

  // Reset zoom & pan when photo changes or modal opens
  useEffect(() => {
    setScale(1.0);
    setPosition({ x: 0, y: 0 });
  }, [currentIndex, isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
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

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      zoomIn();
    } else {
      zoomOut();
    }
  };

  // Drag to pan when zoomed in
  const handlePointerDown = (e: React.PointerEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initialPosRef.current = { ...position };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPosition({
      x: initialPosRef.current.x + dx,
      y: initialPosRef.current.y + dy,
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="photo-lightbox-overlay" onClick={onClose}>
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
          <button className="tool-btn close-btn" onClick={onClose} title="关闭大图 (ESC)">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div
        className="lightbox-stage"
        onClick={(e) => e.stopPropagation()}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <img
          src={currentPhoto.url}
          alt={currentPhoto.title || currentPhoto.name}
          className={`lightbox-img ${isDragging ? 'dragging' : ''}`}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
          }}
          onClick={(e) => {
            if (scale === 1) {
              zoomIn();
            }
          }}
          draggable={false}
        />
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
            <div
              key={p.id}
              className={`strip-thumb ${idx === currentIndex ? 'active' : ''}`}
              onClick={() => onIndexChange(idx)}
            >
              <img src={p.url} alt={p.name} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
