export interface Point {
  x: number;
  y: number;
}

export interface Snake {
  id: string;
  name: string;
  body: Point[];
  angle: number;
  length: number; // Target length
  color: string;
  isBoosting: boolean;
  score: number;
  isDead: boolean;
  isBot: boolean;
  skinIndex: number;
}

export interface Food {
  id: string;
  x: number;
  y: number;
  value: number;
  color: string;
  radius: number;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
}

export const WORLD_SIZE = 4000;
export const VIEWPORT_WIDTH = window.innerWidth;
export const VIEWPORT_HEIGHT = window.innerHeight;
export const INITIAL_LENGTH = 10; // Number of segments
export const SEGMENT_DISTANCE = 15; // Distance between segments
export const BASE_SPEED = 5;
export const BOOST_SPEED = 10;
export const TURN_SPEED = 0.12;

export const SNAKE_COLORS = [
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#84cc16', // Lime
];
