import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowUpRight, ChevronLeft, ChevronRight, Images, Move, Sparkles } from 'lucide-react';
import { LiquidGlassGallery } from '../scene/LiquidGlassGallery';
import { PhotoItem } from '../types';
import { PhotoLightbox } from './PhotoLightbox';
import './LiquidGlassAlbum.css';

interface Props {
  isOpen: boolean;
  photos: PhotoItem[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  onManagePhotos: () => void;
}

export const LiquidGlassAlbum: React.FC<Props> = ({ isOpen, photos, currentIndex, onIndexChange, onClose, onManagePhotos }) => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const gallery = useRef<LiquidGlassGallery | null>(null);
  const select = useRef<(index: number) => void>(() => {});
  const [detail, setDetail] = useState(false);
  const [fallback, setFallback] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const viewRef = useRef<HTMLButtonElement>(null);
  const index = photos.length ? ((currentIndex % photos.length) + photos.length) % photos.length : 0;
  select.current = (next) => { onIndexChange(next); setDetail(true); };

  useEffect(() => {
    if (!isOpen) { setDetail(false); return; }
    const previousFocus = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    setFallback(false);
    if (canvas.current && photos.length) {
      try { gallery.current = new LiquidGlassGallery(canvas.current, photos, index, next => select.current(next)); }
      catch { setFallback(true); }
    }
    return () => { gallery.current?.dispose(); gallery.current = null; previousFocus?.focus(); };
  }, [isOpen, photos]);

  useEffect(() => { gallery.current?.focus(index); }, [index]);
  useEffect(() => { gallery.current?.setPaused(detail); }, [detail, isOpen]);

  useEffect(() => {
    if (!isOpen || detail) return;
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (photos.length && event.key === 'ArrowLeft') onIndexChange((index - 1 + photos.length) % photos.length);
      if (photos.length && event.key === 'ArrowRight') onIndexChange((index + 1) % photos.length);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [isOpen, detail, index, photos.length, onClose, onIndexChange]);

  if (!isOpen) return null;
  const current = photos[index];
  return (
    <section className={`glass-album ${detail ? 'is-viewing' : ''}`} role="dialog" aria-modal="true" aria-label="液态玻璃回忆相册" onKeyDown={event => {
      if (event.key !== 'Tab') return;
      const root = detail ? event.currentTarget.querySelector('.photo-lightbox-overlay') : event.currentTarget;
      const buttons = Array.from(root?.querySelectorAll<HTMLElement>('button:not(:disabled), [tabindex="0"]') || []);
      if (!buttons.length) return;
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }}>
      {current && <img className="glass-album-backdrop" src={current.url} alt="" aria-hidden="true" />}
      <div className="glass-album-haze" />
      <canvas ref={canvas} className="glass-album-canvas" aria-label="可拖动的液态玻璃照片画廊" />
      <header className="glass-album-header">
        <button className="glass-pill" onClick={onClose} ref={closeRef}><ArrowLeft size={16} /><span>回到圣诞树</span></button>
        <div className="glass-album-brand"><Sparkles size={14} /><span>THE MEMORY COLLECTION / 2026</span></div>
        <button className="glass-pill" onClick={onManagePhotos}><Images size={16} /><span>管理照片</span></button>
      </header>
      <div className="glass-album-heading"><span>EVERY MOMENT, HELD IN LIGHT</span><h1>流光里的回忆</h1><p>轻轻拖动，让珍藏的瞬间在光中流转。</p></div>
      {(!photos.length || fallback) && <div className="glass-fallback">
        {!photos.length ? <div className="glass-empty"><Images size={38} /><p>把第一张回忆，放进光里。</p><button className="glass-pill" onClick={onManagePhotos}>添加照片 <ArrowUpRight size={16} /></button></div> : photos.map((photo, i) => <button className="glass-fallback-card" key={photo.id} onClick={() => select.current(i)}><img src={photo.url} alt={photo.title || photo.name} /><span>{photo.title || photo.name}</span></button>)}
      </div>}
      {current && <footer className="glass-album-footer">
        <div className="glass-album-hint"><Move size={14} /><span>拖动探索 · 点击照片放大</span></div>
        <div className="glass-memory-caption">
          <button className="glass-arrow" onClick={() => onIndexChange((index - 1 + photos.length) % photos.length)} aria-label="上一张回忆"><ChevronLeft size={19} /></button>
          <div className="glass-caption-text"><span>MEMORY {String(index + 1).padStart(2, '0')} / {String(photos.length).padStart(2, '0')}</span><h2>{current.title || current.name}</h2></div>
          <button className="glass-view" ref={viewRef} onClick={() => setDetail(true)}>放大欣赏 <ArrowUpRight size={17} /></button>
          <button className="glass-arrow" onClick={() => onIndexChange((index + 1) % photos.length)} aria-label="下一张回忆"><ChevronRight size={19} /></button>
        </div>
      </footer>}
      <PhotoLightbox isOpen={detail} photos={photos} currentIndex={index} onIndexChange={onIndexChange} onClose={() => { setDetail(false); viewRef.current?.focus(); }} />
    </section>
  );
};
