
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
};

export type ChallengeProgress = {
    current: number;
    total: number;
};
