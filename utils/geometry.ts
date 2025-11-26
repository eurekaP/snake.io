import { Point } from '../types';

export const getDistance = (p1: Point, p2: Point): number => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

export const getAngle = (p1: Point, p2: Point): number => {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x);
};

export const movePoint = (p: Point, angle: number, distance: number): Point => {
  return {
    x: p.x + Math.cos(angle) * distance,
    y: p.y + Math.sin(angle) * distance,
  };
};

export const lerp = (start: number, end: number, t: number): number => {
  return start * (1 - t) + end * t;
};

// Ensure angle difference is minimal (e.g. going from 350 to 10 degrees is +20, not -340)
export const normalizeAngle = (angle: number): number => {
  let a = angle % (2 * Math.PI);
  if (a < 0) a += 2 * Math.PI;
  return a;
};

export const getShortestAngleDiff = (from: number, to: number): number => {
  const diff = (to - from + Math.PI) % (2 * Math.PI) - Math.PI;
  return diff < -Math.PI ? diff + 2 * Math.PI : diff;
};

export const getRandomPos = (max: number): number => {
  return Math.random() * max - max / 2;
};

export const checkCircleCollision = (p1: Point, r1: number, p2: Point, r2: number): boolean => {
  const dist = getDistance(p1, p2);
  return dist < r1 + r2;
};
