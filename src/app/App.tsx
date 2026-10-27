import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SceneManager } from '../scene/SceneManager';
import { GestureController } from '../features/gesture-control/GestureController';
import { GestureEvent } from '../features/gesture-control/GestureStateMachine';
import { photoStorage } from '../storage/PhotoStorage';
import { PasswordGate } from '../features/password-gate/PasswordGate';
import { MinimalOverlay } from '../components/MinimalOverlay';
import { PhotoModal } from '../components/PhotoModal';
import { PhotoLightbox } from '../components/PhotoLightbox';
import { soundscape } from '../utils/audio';
import { QualityLevel, PhotoItem, GestureType, SceneStateMode, FocusedObjectInfo } from '../types';
import './App.css';

export const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pipVideoRef = useRef<HTMLVideoElement>(null);
  const pipCanvasRef = useRef<HTMLCanvasElement>(null);

  // Core Managers
  const sceneManagerRef = useRef<SceneManager | null>(null);
  const gestureControllerRef = useRef<GestureController | null>(null);

  // App States
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [sceneMode, setSceneMode] = useState<SceneStateMode>('TREE_IDLE');
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [focusedObject, setFocusedObject] = useState<FocusedObjectInfo | null>(null);
  const [quality, setQuality] = useState<QualityLevel>('medium');
  const [fps, setFps] = useState<number>(60);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState<boolean>(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);
  const [lightboxIndex, setLightboxIndex] = useState<number>(0);

  const handleOpenLightbox = (index?: number) => {
    let targetIdx = 0;
    if (typeof index === 'number') {
      targetIdx = index;
    } else if (focusedObject?.photo) {
      const found = photos.findIndex((p) => p.id === focusedObject.photo?.id);
      if (found !== -1) targetIdx = found;
    }
    setLightboxIndex(targetIdx);
    setIsLightboxOpen(true);
  };

  // Audio States
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.6);

  // Gesture States
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [currentGesture, setCurrentGesture] = useState<GestureType>('NONE');
  const [gestureMessage, setGestureMessage] = useState<string>('');

  // 1. Initialize Scene & Load Photos from IndexedDB
  useEffect(() => {
    if (!canvasRef.current) return;

    const sm = new SceneManager(canvasRef.current);
    sceneManagerRef.current = sm;

    sm.onFpsUpdate = (currentFps) => {
      setFps(currentFps);
    };

    sm.onModeChange = (mode) => {
      setSceneMode(mode);
    };

    sm.onObjectFocused = (info) => {
      setFocusedObject(info);
    };

    photoStorage.getAllPhotos().then((items) => {
      setPhotos(items);
      sm.init(quality, items);
    });

    return () => {
      sm.dispose();
      sceneManagerRef.current = null;
    };
  }, []);

  // 2. Setup Gesture Controller
  useEffect(() => {
    const gc = new GestureController({
      onGesture: handleGestureEvent,
      onHandMove: (x, y, detected) => {
        sceneManagerRef.current?.updateHand(x, y, detected);
      },
      onStatusChange: (status) => {
        setIsCameraActive(status.isActive);
        setCurrentGesture(status.gesture);
        if (status.message) setGestureMessage(status.message);
      },
    });

    gestureControllerRef.current = gc;

    return () => {
      gc.dispose();
      gestureControllerRef.current = null;
    };
  }, []);

  // Hook debug canvas
  useEffect(() => {
    if (gestureControllerRef.current && pipCanvasRef.current) {
      gestureControllerRef.current.debugCanvas = pipCanvasRef.current;
    }
  }, [isCameraActive]);

  // Handle Gesture Action from State Machine
  const handleGestureEvent = useCallback(
    (event: GestureEvent) => {
      const sm = sceneManagerRef.current;
      if (!sm) return;

      switch (event.type) {
        case 'OPEN_PALM':
          sm.triggerScatter();
          break;

        case 'FIST':
          sm.triggerGather();
          break;

        case 'PINCH':
          if (event.pinchPoint) {
            const hit = sm.concreteTree.raycastItem(
              event.pinchPoint.x,
              event.pinchPoint.y,
              sm.camera
            );
            if (hit) {
              sm.focusItemByIndex(hit.index);
            }
          }
          break;
      }
    },
    []
  );

  // Toggle Camera
  const handleToggleCamera = async () => {
    const gc = gestureControllerRef.current;
    if (!gc) return;

    if (isCameraActive) {
      gc.stopCamera();
    } else {
      if (pipCanvasRef.current) {
        gc.debugCanvas = pipCanvasRef.current;
      }
      await gc.startCamera(pipVideoRef.current || undefined);
    }
  };

  // Handle Password Unlock
  const handleUnlock = () => {
    setIsUnlocked(true);
    soundscape.startOnFirstInteraction();
    setIsAudioPlaying(soundscape.getIsPlaying());
  };

  // Quality switch
  const handleQualityChange = (newQuality: QualityLevel) => {
    setQuality(newQuality);
    sceneManagerRef.current?.setQuality(newQuality);
  };

  // Audio controls
  const handleToggleAudio = () => {
    const playing = soundscape.toggle();
    setIsAudioPlaying(playing);
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    soundscape.setVolume(newVol);
  };

  // Photo actions
  const handleAddPhotosFromFiles = async (files: FileList) => {
    const loadedList: Array<{ name: string; blob: Blob; aspectRatio: number }> = [];
    const fileArray = Array.from(files);

    for (const file of fileArray) {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      await new Promise<void>((resolve) => {
        img.onload = () => {
          const ar = img.naturalWidth / img.naturalHeight || 1.33;
          loadedList.push({
            name: file.name.replace(/\.[^/.]+$/, ''),
            blob: file,
            aspectRatio: ar,
          });
          URL.revokeObjectURL(objectUrl);
          resolve();
        };
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          resolve();
        };
        img.src = objectUrl;
      });
    }

    const savedList: PhotoItem[] = [];
    for (const item of loadedList) {
      const id = `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const saved = await photoStorage.savePhoto({
        id,
        name: item.name,
        blob: item.blob,
        aspectRatio: item.aspectRatio,
        title: item.name,
      });
      savedList.push(saved);
    }

    const updated = [...photos, ...savedList];
    setPhotos(updated);
    sceneManagerRef.current?.setPhotos(updated);
    soundscape.playStarSparkle();
  };

  const handleDeletePhoto = async (id: string) => {
    await photoStorage.deletePhoto(id);
    const updated = photos.filter((p) => p.id !== id);
    setPhotos(updated);
    sceneManagerRef.current?.setPhotos(updated);
    if (focusedObject && focusedObject.photo?.id === id) {
      sceneManagerRef.current?.exitFocus();
    }
  };

  const handleResetPresets = async () => {
    await photoStorage.clearAll();
    const presets = photoStorage.generateDefaultPresets();
    await photoStorage.saveMultiplePhotos(presets);
    setPhotos(presets);
    sceneManagerRef.current?.setPhotos(presets);
    sceneManagerRef.current?.exitFocus();
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!isUnlocked) return;
      const sm = sceneManagerRef.current;
      if (!sm) return;

      if (e.key === 'ArrowRight') {
        sm.nextItem();
      } else if (e.key === 'ArrowLeft') {
        sm.prevItem();
      } else if (e.key === 'Escape') {
        sm.exitFocus();
      } else if (e.key === ' ') {
        e.preventDefault();
        if (sceneMode === 'EXPLODED') {
          sm.triggerGather();
        } else {
          sm.triggerScatter();
        }
      } else if (e.key.toLowerCase() === 'a') {
        sm.triggerAssemble();
      } else if (e.key.toLowerCase() === 'z') {
        sm.toggleShowcase();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isUnlocked, sceneMode]);

  return (
    <div className="app-viewport">
      {/* 3D WebGL Canvas */}
      <canvas
        ref={canvasRef}
        className="webgl-canvas"
        onDoubleClick={() => {
          if (focusedObject?.type === 'PHOTO') {
            handleOpenLightbox();
          }
        }}
      />

      {/* Entry Password Gate */}
      {!isUnlocked && <PasswordGate onUnlock={handleUnlock} />}

      {/* Cinematic Interactive Overlay */}
      {isUnlocked && (
        <MinimalOverlay
          mode={sceneMode}
          fps={fps}
          quality={quality}
          onQualityChange={handleQualityChange}
          photosCount={photos.length}
          focusedObject={focusedObject}
          onNextItem={() => sceneManagerRef.current?.nextItem()}
          onPrevItem={() => sceneManagerRef.current?.prevItem()}
          onExitFocus={() => sceneManagerRef.current?.exitFocus()}
          onTriggerCustomAction={() => sceneManagerRef.current?.triggerCustomItemAction()}
          onTriggerAssemble={() => sceneManagerRef.current?.triggerAssemble()}
          onTriggerScatter={() => sceneManagerRef.current?.triggerScatter()}
          onTriggerGather={() => sceneManagerRef.current?.triggerGather()}
          onToggleShowcase={() => sceneManagerRef.current?.toggleShowcase()}
          onAddPhotos={handleAddPhotosFromFiles}
          onOpenPhotoModal={() => setIsPhotoModalOpen(true)}
          onOpenLightbox={() => handleOpenLightbox()}
          isAudioPlaying={isAudioPlaying}
          onToggleAudio={handleToggleAudio}
          volume={volume}
          onVolumeChange={handleVolumeChange}
          isCameraActive={isCameraActive}
          onToggleCamera={handleToggleCamera}
          currentGesture={currentGesture}
          gestureMessage={gestureMessage}
          videoRef={pipVideoRef}
          canvasRef={pipCanvasRef}
        />
      )}

      {/* Photo Management Modal */}
      <PhotoModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        photos={photos}
        onAddPhotos={async (newItems) => {
          const savedList: PhotoItem[] = [];
          for (const item of newItems) {
            const id = `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
            const saved = await photoStorage.savePhoto({
              id,
              name: item.name,
              blob: item.blob,
              aspectRatio: item.aspectRatio,
              title: item.name,
            });
            savedList.push(saved);
          }
          const updated = [...photos, ...savedList];
          setPhotos(updated);
          sceneManagerRef.current?.setPhotos(updated);
        }}
        onDeletePhoto={handleDeletePhoto}
        onResetPresets={handleResetPresets}
        onSelectPhoto={(idx) => sceneManagerRef.current?.focusPhoto(idx)}
      />

      {/* High-Resolution Photo Zoom Lightbox */}
      <PhotoLightbox
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        photos={photos}
        currentIndex={lightboxIndex}
        onIndexChange={(idx) => {
          setLightboxIndex(idx);
          sceneManagerRef.current?.focusPhoto(idx);
        }}
      />
    </div>
  );
};
