import { HistoryRecord, GameMode } from '../types';

const STORAGE_KEY = 'maken_scores_v1';
const USER_KEY = 'maken_user_v1';

export const getScores = (): HistoryRecord[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveScore = (record: HistoryRecord) => {
  const scores = getScores();
  scores.push(record);
  // Sort by target group, then time ascending
  scores.sort((a, b) => {
    if (a.target !== b.target) return a.target - b.target;
    return a.time - b.time;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
};

export const getBestTime = (target: number): number | null => {
  const scores = getScores().filter(s => s.target === target && s.mode !== GameMode.PRACTICE);
  if (scores.length === 0) return null;
  // Since it's already sorted, the first one that matches is the best
  return scores[0].time;
};

export const getNickname = (): string => {
  return localStorage.getItem(USER_KEY) || 'Guest';
};

export const setNickname = (name: string) => {
  localStorage.setItem(USER_KEY, name);
};

// --- New Functions for Calendar & Daily ---

export const getDailyRecordsByDate = (dateStr: string): HistoryRecord[] => {
  // Returns all DAILY mode records for a specific YYYY-MM-DD
  const scores = getScores();
  return scores
    .filter(s => s.mode === GameMode.DAILY && s.date.startsWith(dateStr))
    .sort((a, b) => a.time - b.time);
};

export const getDaysPlayedInMonth = (year: number, month: number): string[] => {
  // Returns array of "YYYY-MM-DD" strings that have at least one DAILY record
  const scores = getScores();
  const playedDates = new Set<string>();
  
  // Note: month is 0-indexed (0 = Jan)
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  
  scores.forEach(s => {
    if (s.mode === GameMode.DAILY && s.date.startsWith(prefix)) {
      playedDates.add(s.date.split('T')[0]);
    }
  });
  
  return Array.from(playedDates);
};