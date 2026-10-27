export type SceneStateMode =
  | 'ASSEMBLING'
  | 'TREE_IDLE'
  | 'SHOWCASE_ZOOM'
  | 'EXPLODED'
  | 'OBJECT_FOCUS'
  | 'REASSEMBLING';

export type ChristmasItemType =
  | 'BELL'
  | 'GIFT_BOX'
  | 'CANDY_CANE'
  | 'BALL'
  | 'STAR'
  | 'SNOWFLAKE'
  | 'BOW'
  | 'STOCKING'
  | 'PINECONE'
  | 'GINGERBREAD'
  | 'LIGHT'
  | 'PHOTO';

export type QualityLevel = 'low' | 'medium' | 'high';

export interface QualityConfig {
  name: QualityLevel;
  label: string;
  itemCount: number; // Count of concrete 3D items forming the tree
  dustCount: number; // Subtle ambient stardust
  bloomEnabled?: boolean;
  bloomThreshold: number;
  bloomRadius: number;
  bloomStrength: number;
  pixelRatioCap: number;
  gestureFps: number;
}

export const QUALITY_PRESETS: Record<QualityLevel, QualityConfig> = {
  low: {
    name: 'low',
    label: '流畅 (Low)',
    itemCount: 420,
    dustCount: 800,
    bloomEnabled: true,
    bloomThreshold: 0.72,
    bloomRadius: 0.35,
    bloomStrength: 0.45,
    pixelRatioCap: 1.0,
    gestureFps: 15,
  },
  medium: {
    name: 'medium',
    label: '平衡 (Medium)',
    itemCount: 780,
    dustCount: 1600,
    bloomEnabled: true,
    bloomThreshold: 0.7,
    bloomRadius: 0.4,
    bloomStrength: 0.55,
    pixelRatioCap: 1.5,
    gestureFps: 24,
  },
  high: {
    name: 'high',
    label: '极高画质 (High)',
    itemCount: 1250,
    dustCount: 2600,
    bloomEnabled: true,
    bloomThreshold: 0.65,
    bloomRadius: 0.5,
    bloomStrength: 0.75,
    pixelRatioCap: 2.0,
    gestureFps: 30,
  },
};

export interface PhotoItem {
  id: string;
  name: string;
  url: string;
  aspectRatio: number;
  blob?: Blob;
  createdAt: number;
  title?: string;
  description?: string;
  isPreset?: boolean;
}

export type GestureType =
  | 'NONE'
  | 'HAND_DETECTED'
  | 'OPEN_PALM'
  | 'FIST'
  | 'PINCH';

export interface GestureState {
  type: GestureType;
  confidence: number;
  handPresent: boolean;
  handCenter: { x: number; y: number; z: number };
  pinchPoint?: { x: number; y: number };
  timestamp: number;
  debugMessage?: string;
}

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export interface FocusedObjectInfo {
  id: string;
  type: ChristmasItemType;
  name: string;
  description: string;
  actionHint: string;
  photo?: PhotoItem;
}
