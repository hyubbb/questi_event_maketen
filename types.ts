export enum GameMode {
  LOBBY = 'LOBBY',
  PLAYING = 'PLAYING',
  RESULT = 'RESULT',
  DAILY = 'DAILY',
  PRACTICE = 'PRACTICE',
  CALENDAR = 'CALENDAR'
}

export interface CardItem {
  id: number;
  value: number;
  isUsed: boolean;
}

export interface HistoryRecord {
  target: number;
  time: number; // in milliseconds
  date: string;
  nickname: string;
  mode?: GameMode;
}

export interface PuzzleData {
  target: number;
  numbers: number[];
}

export type Operator = '+' | '-' | '*' | '/' | '(' | ')';