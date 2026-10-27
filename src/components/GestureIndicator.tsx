import React, { useState, useEffect, useRef } from 'react';
import { Camera, CameraOff, Hand, Eye, EyeOff, HelpCircle, Sparkles } from 'lucide-react';
import { GestureType } from '../types';
import './GestureIndicator.css';

interface GestureIndicatorProps {
  isReady: boolean;
  isActive: boolean;
  currentGesture: GestureType;
  statusMessage?: string;
  errorMessage?: string;
  onToggleCamera: () => void;
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

export const GestureIndicator: React.FC<GestureIndicatorProps> = ({
  isReady,
  isActive,
  currentGesture,
  statusMessage,
  errorMessage,
  onToggleCamera,
  videoRef,
  canvasRef,
}) => {
  const [showPip, setShowPip] = useState<boolean>(true);
  const [showHelp, setShowHelp] = useState<boolean>(false);

  // Friendly gesture names & badges
  const getGestureBadge = () => {
    switch (currentGesture) {
      case 'OPEN_PALM':
        return { label: '🖐️ 张开手掌 · 粒子散开', className: 'badge-palm' };
      case 'FIST':
        return { label: '✊ 握拳 · 聚拢圣诞树', className: 'badge-fist' };
      case 'PINCH':
        return { label: '🤏 捏合 · 选中聚焦', className: 'badge-pinch' };
      case 'HAND_DETECTED':
        return { label: '✋ 手部就绪', className: 'badge-detected' };
      default:
        return {
          label: isActive ? '等待检测手部...' : '隔空手势已暂停',
          className: isActive ? 'badge-waiting' : 'badge-idle',
        };
    }
  };

  const badge = getGestureBadge();

  return (
    <div className="gesture-indicator-container">
      {/* Top Status Capsule */}
      <div className="status-capsule">
        <button
          className={`camera-toggle-btn ${isActive ? 'active' : ''}`}
          onClick={onToggleCamera}
          title={isActive ? '关闭隔空手势' : '开启隔空手势识别'}
        >
          {isActive ? <Camera size={16} /> : <CameraOff size={16} />}
          <span>{isActive ? '手势已开启' : '开启隔空手势'}</span>
        </button>

        {isActive && (
          <div className={`gesture-pill ${badge.className}`}>
            <span className="pulse-dot"></span>
            <span className="gesture-label">{badge.label}</span>
          </div>
        )}

        <button
          className="help-btn"
          onClick={() => setShowHelp(!showHelp)}
          title="手势指南"
        >
          <HelpCircle size={16} />
        </button>

        {isActive && (
          <button
            className="pip-toggle-btn"
            onClick={() => setShowPip(!showPip)}
            title={showPip ? '隐藏手势预览画中画' : '显示手势预览画中画'}
          >
            {showPip ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>

      {/* Error Notice */}
      {errorMessage && (
        <div className="error-banner">
          <span>⚠️ {errorMessage}</span>
        </div>
      )}

      {/* Gesture Help Popover */}
      {showHelp && (
        <div className="gesture-help-popover">
          <div className="help-title">
            <Sparkles size={14} className="gold-icon" />
            <span>隔空手势交互秘笈</span>
          </div>
          <ul className="help-list">
            <li>
              <strong>🖐️ 张开手掌</strong>
              <span>散开成为绚烂 3D 星空（移动手掌控制视角）</span>
            </li>
            <li>
              <strong>✊ 握拳聚拢</strong>
              <span>让分散的圣诞元素平滑归位为完整圣诞树</span>
            </li>
            <li>
              <strong>🤏 拇食捏合</strong>
              <span>对准物件或照片捏合，将其带到眼前聚焦</span>
            </li>
          </ul>
          <div className="help-note">
            * 如未开启摄像头或光线较暗，仍可随时通过屏幕触控或鼠标操作完成全部互动。
          </div>
        </div>
      )}

      {/* Mini PIP Camera & Skeleton Preview */}
      {isActive && showPip && (
        <div className="pip-window">
          <video
            ref={videoRef}
            playsInline
            muted
            className="pip-video"
          />
          <canvas
            ref={canvasRef}
            width={240}
            height={180}
            className="pip-canvas"
          />
          <div className="pip-overlay-label">
            <span>实时骨架追踪</span>
          </div>
        </div>
      )}
    </div>
  );
};
