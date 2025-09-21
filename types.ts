
import { US_STATES } from './constants';

export type StateName = typeof US_STATES[number];

export enum GameStatus {
  Welcome,
  Drawing,
  Judging,
  Results,
}

export type Score = {
  score: number;
  critique: string;
  // optional debug metrics returned from the judge for diagnostics
  precision?: number;
  recall?: number;
  ratio?: number; // userEdgeCount / outlineEdgeCount
  // angle removed from public Score
};

export type ChallengeProgress = {
    current: number;
    total: number;
};
