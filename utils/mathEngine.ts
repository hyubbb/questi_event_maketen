// A solver to ensure the generated numbers can actually reach the target
// Using a recursive backtracking approach to find if a solution exists

// Basic operations
const OPS = [
  (a: number, b: number) => a + b,
  (a: number, b: number) => a - b,
  (a: number, b: number) => b - a,
  (a: number, b: number) => a * b,
  (a: number, b: number) => (b !== 0 ? a / b : null),
  (a: number, b: number) => (a !== 0 ? b / a : null),
];

// Check if a set of numbers can reach the target
function canSolve(numbers: number[], target: number): boolean {
  if (numbers.length === 1) {
    return Math.abs(numbers[0] - target) < 0.000001;
  }

  // Try all pairs
  for (let i = 0; i < numbers.length; i++) {
    for (let j = i + 1; j < numbers.length; j++) {
      const a = numbers[i];
      const b = numbers[j];
      const remaining = numbers.filter((_, idx) => idx !== i && idx !== j);

      for (const op of OPS) {
        const res = op(a, b);
        if (res !== null) {
          remaining.push(res);
          if (canSolve(remaining, target)) return true;
          remaining.pop();
        }
      }
    }
  }
  return false;
}

export const generatePuzzle = (target: number): number[] => {
  let attempts = 0;
  // Safety break after 2000 attempts, though usually takes < 50
  while (attempts < 2000) {
    const nums = Array.from({ length: 4 }, () => Math.floor(Math.random() * 9) + 1);
    if (canSolve([...nums], target)) {
      return nums;
    }
    attempts++;
  }
  // Fallback to a known solvable set for 10 if generator fails (rare)
  return [1, 2, 3, 4];
};

// Seeded random for Daily Challenge
export const generateDailyPuzzle = (target: number, dateStr: string): number[] => {
  // Simple hash function for the seed
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
    hash |= 0;
  }
  
  const seededRandom = () => {
    const x = Math.sin(hash++) * 10000;
    return x - Math.floor(x);
  };

  let attempts = 0;
  while (attempts < 2000) {
    const nums = Array.from({ length: 4 }, () => Math.floor(seededRandom() * 9) + 1);
    if (canSolve([...nums], target)) {
      return nums;
    }
    attempts++;
  }
  return [5, 5, 5, 5]; // Fallback
};

export const evaluateExpression = (expression: string): number | null => {
  try {
    // Sanitize input: allow only numbers and operators
    const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');
    // eslint-disable-next-line no-new-func
    const result = new Function(`return ${sanitized}`)();
    
    if (!isFinite(result) || isNaN(result)) return null;
    return result;
  } catch (e) {
    return null;
  }
};