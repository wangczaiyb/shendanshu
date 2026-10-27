import React, { useState } from 'react';
import {
  Sparkles,
  Maximize,
  Volume2,
  VolumeX,
  Image as ImageIcon,
  Sliders,
  ChevronLeft,
  ChevronRight,
  X,
  Minimize2,
} from 'lucide-react';
import { QualityLevel, PhotoItem } from '../types';
import './HUD.css';

interface HUDProps {
  fps: number;
  quality: QualityLevel;
  onQualityChange: (quality: QualityLevel) => void;
  photosCount: number;
  focusedIndex: number;
  focusedPhoto?: PhotoItem;
  onOpenPhotoModal: () => void;
  onTriggerDisperse: () => void;
  onTriggerGather: () => void;
  onNextPhoto: () => void;
  onPrevPhoto: () => void;
  onExitFocus: () => void;
  isAudioPlaying: boolean;
  onToggleAudio: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  fps,
  quality,
  onQualityChange,
  photosCount,
  focusedIndex,
  focusedPhoto,
  onOpenPhotoModal,
  onTriggerDisperse,
  onTriggerGather,
  onNextPhoto,
  onPrevPhoto,
  onExitFocus,
  isAudioPlaying,
  onToggleAudio,
}) => {
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div className="hud-overlay">
      {/* Top Left Brand Info */}
      <div className="hud-top-left">
        <div className="brand-title-group">
          <h1 className="brand-title">Christmas Light Garden</h1>
          <p className="brand-subtitle">光粒子圣诞树 · 浪漫三维交互</p>
        </div>
        <div className="fps-counter" title="实时渲染帧率">
          <span className="fps-value">{fps}</span>
          <span className="fps-label">FPS</span>
        </div>
      </div>

      {/* Top Center: Focused Photo Bar */}
      {focusedIndex !== -1 && (
        <div className="focused-photo-bar">
          <button className="nav-btn" onClick={onPrevPhoto} title="上一张">
            <ChevronLeft size={18} />
          </button>

          <div className="focused-info">
            <span className="photo-title">
              {focusedPhoto?.title || focusedPhoto?.name || `照片 #${focusedIndex + 1}`}
            </span>
            <span className="photo-pager">
              {focusedIndex + 1} / {photosCount}
            </span>
          </div>

          <button className="nav-btn" onClick={onNextPhoto} title="下一张">
            <ChevronRight size={18} />
          </button>

          <button className="exit-focus-btn" onClick={onExitFocus} title="退出聚焦 (ESC)">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Bottom Floating Control Dock */}
      <div className="hud-bottom-dock">
        {/* Photo Gallery Button */}
        <button
          className="dock-btn photo-btn"
          onClick={onOpenPhotoModal}
          title="管理我的圣诞照片相册"
        >
          <div className="btn-icon-wrapper">
            <ImageIcon size={18} />
            {photosCount > 0 && <span className="photo-badge">{photosCount}</span>}
          </div>
          <span className="btn-label">照片相册</span>
        </button>

        <div className="dock-separator" />

        {/* Disperse Particle Button */}
        <button
          className="dock-btn disperse-btn"
          onClick={onTriggerDisperse}
          title="触发粒子扩散星尘爆发"
        >
          <Sparkles size={18} className="gold-icon" />
          <span className="btn-label">星尘爆发</span>
        </button>

        {/* Gather Particle Button */}
        <button
          className="dock-btn gather-btn"
          onClick={onTriggerGather}
          title="触发光粒子向心聚拢"
        >
          <Minimize2 size={18} />
          <span className="btn-label">聚拢归位</span>
        </button>

        <div className="dock-separator" />

        {/* Quality Selector */}
        <div className="quality-dropdown-wrapper">
          <button
            className="dock-btn quality-btn"
            onClick={() => setShowQualityMenu(!showQualityMenu)}
            title="渲染画质设置"
          >
            <Sliders size={18} />
            <span className="btn-label">
              {quality === 'high' ? '高画质' : quality === 'medium' ? '平衡' : '流畅'}
            </span>
          </button>

          {showQualityMenu && (
            <div className="quality-menu">
              <button
                className={`menu-item ${quality === 'low' ? 'selected' : ''}`}
                onClick={() => {
                  onQualityChange('low');
                  setShowQualityMenu(false);
                }}
              >
                流畅 (Low · 3万粒子)
              </button>
              <button
                className={`menu-item ${quality === 'medium' ? 'selected' : ''}`}
                onClick={() => {
                  onQualityChange('medium');
                  setShowQualityMenu(false);
                }}
              >
                平衡 (Medium · 7.5万粒子)
              </button>
              <button
                className={`menu-item ${quality === 'high' ? 'selected' : ''}`}
                onClick={() => {
                  onQualityChange('high');
                  setShowQualityMenu(false);
                }}
              >
                极高 (High · 13.5万粒子)
              </button>
            </div>
          )}
        </div>

        {/* Holiday Chime Audio */}
        <button
          className={`dock-btn audio-btn ${isAudioPlaying ? 'active' : ''}`}
          onClick={onToggleAudio}
          title={isAudioPlaying ? '静音' : '播放圣诞环境颂歌'}
        >
          {isAudioPlaying ? <Volume2 size={18} /> : <VolumeX size={18} />}
          <span className="btn-label">{isAudioPlaying ? '音乐中' : '静音'}</span>
        </button>

        {/* Fullscreen Toggle */}
        <button
          className="dock-btn fullscreen-btn"
          onClick={toggleFullscreen}
          title="切换全屏沉浸模式"
        >
          <Maximize size={18} />
          <span className="btn-label">全屏</span>
        </button>
      </div>
    </div>
  );
};
