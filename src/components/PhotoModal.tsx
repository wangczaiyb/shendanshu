import React, { useRef } from 'react';
import { PhotoItem } from '../types';
import { X, Upload, Trash2, RotateCcw, Image as ImageIcon, Sparkles } from 'lucide-react';
import './PhotoModal.css';

interface PhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  photos: PhotoItem[];
  onAddPhotos: (newPhotos: Array<{ name: string; blob: Blob; aspectRatio: number }>) => void;
  onDeletePhoto: (id: string) => void;
  onResetPresets: () => void;
  onSelectPhoto: (index: number) => void;
}

export const PhotoModal: React.FC<PhotoModalProps> = ({
  isOpen,
  onClose,
  photos,
  onAddPhotos,
  onDeletePhoto,
  onResetPresets,
  onSelectPhoto,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    const loadedList: Array<{ name: string; blob: Blob; aspectRatio: number }> = [];

    let completed = 0;
    fileList.forEach((file) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        const ar = img.naturalWidth / img.naturalHeight || 1.33;
        loadedList.push({
          name: file.name.replace(/\.[^/.]+$/, ''),
          blob: file,
          aspectRatio: ar,
        });
        URL.revokeObjectURL(objectUrl);
        completed++;
        if (completed === fileList.length) {
          onAddPhotos(loadedList);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };

      img.onerror = () => {
        completed++;
        URL.revokeObjectURL(objectUrl);
        if (completed === fileList.length && loadedList.length > 0) {
          onAddPhotos(loadedList);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };

      img.src = objectUrl;
    });
  };

  return (
    <div className="photo-modal-overlay" onClick={onClose}>
      <div className="photo-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-title">
            <ImageIcon size={20} className="gold-icon" />
            <h2>光影回忆相册 ({photos.length})</h2>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="关闭">
            <X size={20} />
          </button>
        </div>

        <p className="modal-description">
          照片将化作三维记忆卡片自然悬浮在圣诞树周围。支持手势捏合或点击聚焦放大。
        </p>

        <div className="modal-actions-bar">
          <button
            className="action-btn upload-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={16} />
            <span>添加本地照片</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            accept="image/*"
            style={{ display: 'none' }}
          />

          <button className="action-btn reset-btn" onClick={onResetPresets}>
            <RotateCcw size={16} />
            <span>恢复默认预设</span>
          </button>
        </div>

        {photos.length === 0 ? (
          <div className="empty-state">
            <Sparkles size={40} className="gold-icon" />
            <p>相册空空如也，点击上方按钮添加你的圣诞照片吧！</p>
          </div>
        ) : (
          <div className="photos-grid">
            {photos.map((photo, idx) => (
              <div
                key={photo.id}
                className="photo-card-item photo-card"
                onClick={() => {
                  onSelectPhoto(idx);
                  onClose();
                }}
              >
                <div className="photo-thumb-wrapper">
                  <img src={photo.url} alt={photo.name} className="photo-thumb" />
                  <div className="thumb-hover-overlay">
                    <span>在流光玻璃相册中查看</span>
                  </div>
                </div>

                <div className="photo-info">
                  <div className="photo-name" title={photo.title || photo.name}>
                    {photo.title || photo.name}
                  </div>
                  <button
                    className="delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeletePhoto(photo.id);
                    }}
                    title="删除此照片"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="modal-footer">
          <span>* 照片均保存在浏览器本地 IndexedDB 中，不会上传至任何云端服务器。</span>
        </div>
      </div>
    </div>
  );
};
