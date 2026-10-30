import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  CameraOff,
  Sparkles,
  Image as ImageIcon,
  Volume2,
  VolumeX,
  Maximize,
  Sliders,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  X,
  Minimize2,
  ZoomIn,
  RefreshCw,
  Gift,
  Bell,
  Star,
  Compass,
  Play,
} from 'lucide-react';
import { SceneStateMode, QualityLevel, GestureType, FocusedObjectInfo } from '../types';
import './MinimalOverlay.css';

interface MinimalOverlayProps {
  mode: SceneStateMode;
  fps: number;
  quality: QualityLevel;
  onQualityChange: (q: QualityLevel) => void;
  photosCount: number;
  focusedObject: FocusedObjectInfo | null;
  onNextItem: () => void;
  onPrevItem: () => void;
  onExitFocus: () => void;
  onTriggerCustomAction: () => void;
  onTriggerAssemble: () => void;
  onTriggerScatter: () => void;
  onTriggerGather: () => void;
  onToggleShowcase: () => void;
  onAddPhotos: (files: FileList) => void;
  onOpenPhotoModal: () => void;
  onManagePhotos: () => void;
  onOpenLightbox?: () => void;
  isAudioPlaying: boolean;
  onToggleAudio: () => void;
  volume: number;
  onVolumeChange: (v: number) => void;
  isCameraActive: boolean;
  onToggleCamera: () => void;
  currentGesture: GestureType;
  gestureMessage?: string;
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

export const MinimalOverlay: React.FC<MinimalOverlayProps> = ({
  mode,
  fps,
  quality,
  onQualityChange,
  photosCount,
  focusedObject,
  onNextItem,
  onPrevItem,
  onExitFocus,
  onTriggerCustomAction,
  onTriggerAssemble,
  onTriggerScatter,
  onTriggerGather,
  onToggleShowcase,
  onAddPhotos,
  onOpenPhotoModal,
  onManagePhotos,
  onOpenLightbox,
  isAudioPlaying,
  onToggleAudio,
  volume,
  onVolumeChange,
  isCameraActive,
  onToggleCamera,
  currentGesture,
  gestureMessage,
  videoRef,
  canvasRef,
}) => {
  const [controlsVisible, setControlsVisible] = useState(true);
  const [showWebcamPip, setShowWebcamPip] = useState(true);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Press 'H' to toggle UI controls
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'h') {
        setControlsVisible((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddPhotos(e.target.files);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getModeLabel = () => {
    switch (mode) {
      case 'ASSEMBLING':
        return '✨ 魔法汇聚 · 圣诞小物件正飞入聚拢';
      case 'SHOWCASE_ZOOM':
        return '🔍 特写环视 · 漫步观赏精致 3D 圣诞挂件';
      case 'EXPLODED':
        return '🌌 浪漫星空 · 挥动手掌或拖动屏幕自由探索';
      case 'OBJECT_FOCUS':
        return `✨ 聚焦特写 · ${focusedObject?.name || '圣诞礼物'}`;
      case 'REASSEMBLING':
        return '💫 聚拢归位 · 圣诞挂件正飞回树体';
      case 'TREE_IDLE':
      default:
        return '🎄 圣诞之树 · 点击小物件聚焦，张开手掌散开';
    }
  };

  const getItemIcon = (type?: string) => {
    switch (type) {
      case 'BELL':
        return <Bell size={18} className="gold-icon" />;
      case 'GIFT_BOX':
        return <Gift size={18} className="gold-icon" />;
      case 'STAR':
        return <Star size={18} className="gold-icon" />;
      case 'PHOTO':
        return <ImageIcon size={18} className="gold-icon" />;
      default:
        return <Sparkles size={18} className="gold-icon" />;
    }
  };

  return (
    <div className="minimal-overlay-container">
      {/* 1. Centerpiece Grand Title & Add Memories Button */}
      <div
        className={`title-block ${
          controlsVisible && mode !== 'OBJECT_FOCUS' && mode !== 'SHOWCASE_ZOOM'
            ? ''
            : 'ui-hidden'
        }`}
      >
        <h1 className="cinematic-title">Christmas Light Garden</h1>
        <div className="upload-wrapper">
          <label className="upload-btn">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              accept="image/*"
              style={{ display: 'none' }}
            />
            添加专属记忆照片
          </label>
          <div className="hint-text">按 'H' 键或双击隐藏界面 · 支持单指旋转与双指缩放</div>
        </div>
      </div>

      {/* 2. Top Right: Mode State Pill & Camera Switch */}
      <div className="top-right-bar">
        <div className={`mode-badge mode-${mode.toLowerCase()}`}>
          <span className="mode-pulse"></span>
          <span className="mode-text">{getModeLabel()}</span>
        </div>

        <button
          className={`camera-toggle-btn ${isCameraActive ? 'active' : ''}`}
          onClick={onToggleCamera}
          title={isCameraActive ? '关闭隔空手势' : '开启隔空手势'}
        >
          {isCameraActive ? <Camera size={15} /> : <CameraOff size={15} />}
          <span>{isCameraActive ? '手势已开启' : '开启手势'}</span>
        </button>
      </div>

      {/* 3. Top Left: Real-time Mirrored Webcam Feedback Box */}
      {isCameraActive && (
        <div className={`webcam-pip-container ${showWebcamPip ? '' : 'minimized'}`}>
          <div className="webcam-pip-header">
            <span className="webcam-pip-title">Gesture Vision</span>
            <button
              className="pip-minimize-btn"
              onClick={() => setShowWebcamPip(!showWebcamPip)}
              title={showWebcamPip ? '收起窗口' : '展开窗口'}
            >
              {showWebcamPip ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </div>

          {showWebcamPip && (
            <div className="webcam-screen">
              <video ref={videoRef} playsInline muted style={{ display: 'none' }} />
              <canvas ref={canvasRef} width={200} height={150} className="webcam-canvas" />
              <div className="webcam-gesture-tag">
                <span>{gestureMessage || '手部就绪'}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. OBJECT_FOCUS: Inspection HUD Card */}
      {mode === 'OBJECT_FOCUS' && focusedObject && (
        <div className="object-focus-card">
          <div className="focus-header">
            <div className="focus-title-wrap">
              {getItemIcon(focusedObject.type)}
              <span className="focus-object-name">{focusedObject.name}</span>
            </div>
            <button className="focus-close-btn" onClick={onExitFocus} title="退出特写 (ESC)">
              <X size={18} />
            </button>
          </div>

          <p className="focus-description">{focusedObject.description}</p>

          <div className="focus-actions-row">
            <button className="focus-nav-btn" onClick={onPrevItem} title="上一个物件">
              <ChevronLeft size={16} />
              <span>上一个</span>
            </button>

            {focusedObject.type === 'PHOTO' ? (
              <button
                className="focus-action-btn photo-zoom-btn"
                onClick={() => {
                  onTriggerCustomAction();
                  onOpenLightbox?.();
                }}
                title="全屏放大查看高清大图"
              >
                <Maximize size={15} />
                <span>进入流光玻璃相册</span>
              </button>
            ) : (
              <button
                className="focus-action-btn"
                onClick={onTriggerCustomAction}
                title={focusedObject.actionHint}
              >
                <Sparkles size={15} />
                <span>{focusedObject.actionHint || '互动体验'}</span>
              </button>
            )}

            <button className="focus-nav-btn" onClick={onNextItem} title="下一个物件">
              <span>下一个</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* 5. Minimal Bottom Touch Dock */}
      <div className={`bottom-dock ${controlsVisible ? '' : 'ui-hidden'}`}>
        {/* Assemble Button */}
        <button
          className={`dock-btn ${mode === 'ASSEMBLING' ? 'active' : ''}`}
          onClick={onTriggerAssemble}
          title="飞入汇聚圣诞树"
        >
          <RefreshCw size={16} className={mode === 'ASSEMBLING' ? 'spin-icon' : ''} />
          <span>汇聚</span>
        </button>

        {/* Scatter / Explode button */}
        <button
          className={`dock-btn ${mode === 'EXPLODED' ? 'active' : ''}`}
          onClick={onTriggerScatter}
          title="散开为3D星空"
        >
          <Sparkles size={16} className="gold-icon" />
          <span>散开</span>
        </button>

        {/* Showcase Zoom Tour Button */}
        <button
          className={`dock-btn ${mode === 'SHOWCASE_ZOOM' ? 'active' : ''}`}
          onClick={onToggleShowcase}
          title="近景漫步特写"
        >
          <ZoomIn size={16} />
          <span>漫步特写</span>
        </button>

        {/* Gather / Tree button */}
        <button
          className={`dock-btn ${
            mode === 'TREE_IDLE' || mode === 'REASSEMBLING' ? 'active' : ''
          }`}
          onClick={onTriggerGather}
          title="聚拢归位"
        >
          <Minimize2 size={16} />
          <span>聚拢</span>
        </button>

        <div className="dock-sep" />

        {/* Photos modal button */}
        <button className="dock-btn" onClick={onOpenPhotoModal} title="打开液态玻璃回忆相册">
          <div className="icon-with-badge">
            <ImageIcon size={16} />
            {photosCount > 0 && <span className="dock-badge">{photosCount}</span>}
          </div>
          <span>流光相册</span>
        </button>

        <button className="dock-btn" onClick={onManagePhotos} title="添加、删除和管理照片">
          <ImageIcon size={16} />
          <span>管理照片</span>
        </button>

        {/* Quality switcher */}
        <div className="quality-wrapper">
          <button
            className="dock-btn"
            onClick={() => {
              setShowQualityMenu(!showQualityMenu);
              setShowVolumeSlider(false);
            }}
            title="画质切换"
          >
            <Sliders size={16} />
            <span>{quality === 'high' ? '极高' : quality === 'medium' ? '平衡' : '流畅'}</span>
          </button>

          {showQualityMenu && (
            <div className="quality-pop">
              <button
                className={quality === 'low' ? 'sel' : ''}
                onClick={() => {
                  onQualityChange('low');
                  setShowQualityMenu(false);
                }}
              >
                流畅模式 (420 物件)
              </button>
              <button
                className={quality === 'medium' ? 'sel' : ''}
                onClick={() => {
                  onQualityChange('medium');
                  setShowQualityMenu(false);
                }}
              >
                平衡模式 (780 物件)
              </button>
              <button
                className={quality === 'high' ? 'sel' : ''}
                onClick={() => {
                  onQualityChange('high');
                  setShowQualityMenu(false);
                }}
              >
                极高画质 (1250 物件)
              </button>
            </div>
          )}
        </div>

        {/* Sound toggle & Volume popover */}
        <div className="sound-wrapper">
          <button
            className={`dock-btn ${isAudioPlaying ? 'active' : ''}`}
            onClick={onToggleAudio}
            onContextMenu={(e) => {
              e.preventDefault();
              setShowVolumeSlider(!showVolumeSlider);
            }}
            title="Jingle Bells · 点击开关音乐，右键调音量"
          >
            {isAudioPlaying ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span>{isAudioPlaying ? '铃儿响叮当' : '静音'}</span>
          </button>

          {showVolumeSlider && (
            <div className="volume-pop">
              <span className="volume-label">音量 {Math.round(volume * 100)}%</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                className="volume-slider"
              />
            </div>
          )}
        </div>

        {/* Fullscreen */}
        <button
          className="dock-btn"
          onClick={() => {
            if (!document.fullscreenElement) {
              document.documentElement.requestFullscreen().catch(() => {});
            } else {
              document.exitFullscreen().catch(() => {});
            }
          }}
          title="全屏沉浸"
        >
          <Maximize size={16} />
          <span>全屏</span>
        </button>
      </div>
    </div>
  );
};
