import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameMode, CardItem, HistoryRecord } from './types';
import { generatePuzzle, generateDailyPuzzle, evaluateExpression } from './utils/mathEngine';
import * as Storage from './utils/storage';
import NumberCard from './components/NumberCard';
import { 
  Trophy, 
  Play, 
  RotateCcw, 
  Delete, 
  Calendar as CalendarIcon, 
  BrainCircuit, 
  Target,
  ChevronLeft,
  ChevronRight,
  User,
  Medal,
  Share2,
  X,
  ClipboardList,
  Link as LinkIcon
} from 'lucide-react';

// --- Constants ---
const TARGET_OPTIONS = [10, 12, 24, 36, 100];

const App: React.FC = () => {
  // --- Global State ---
  const [nickname, setNicknameState] = useState<string>(Storage.getNickname());
  const [mode, setMode] = useState<GameMode>(GameMode.LOBBY);
  const [lastActiveMode, setLastActiveMode] = useState<GameMode>(GameMode.PLAYING);
  
  // --- Game State ---
  const [targetNumber, setTargetNumber] = useState<number>(10); // Default target
  const [targetIndex, setTargetIndex] = useState<number>(0); // For slider
  const [cards, setCards] = useState<CardItem[]>([]);
  const [expression, setExpression] = useState<string>('');
  const [expressionHistory, setExpressionHistory] = useState<{str: string, usedIds: number[]}[]>([]);
  
  // --- Timer State ---
  const [startTime, setStartTime] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Result State ---
  const [isWin, setIsWin] = useState<boolean>(false);
  const [finalTime, setFinalTime] = useState<number>(0);
  const [isNewRecord, setIsNewRecord] = useState<boolean>(false);

  // --- Animation State ---
  const [shake, setShake] = useState(false);

  // --- Calendar & Daily State ---
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDailyDate, setSelectedDailyDate] = useState<string | null>(null);

  // --- Handlers: Timer ---
  const startTimer = useCallback(() => {
    setStartTime(Date.now());
    setCurrentTime(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrentTime(Date.now() - startTime);
    }, 10);
  }, [startTime]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Timer Effect
  useEffect(() => {
    if (mode === GameMode.PLAYING || mode === GameMode.DAILY || mode === GameMode.PRACTICE) {
      const interval = setInterval(() => {
        setCurrentTime(Date.now() - startTime);
      }, 37);
      return () => clearInterval(interval);
    }
  }, [mode, startTime]);

  // URL Parameter Handling (Optional: For future deeplinking)
  useEffect(() => {
    // This could be expanded to load specific shared puzzles
    const params = new URLSearchParams(window.location.search);
    const modeParam = params.get('mode');
    if (modeParam === 'DAILY') {
      // Auto-open calendar or start daily could go here
    }
  }, []);


  // --- Handlers: Game Logic ---

  const initGame = (selectedMode: GameMode, specificTarget?: number, specificDateStr?: string) => {
    const t = specificTarget || targetNumber;
    let nums: number[];

    if (selectedMode === GameMode.DAILY) {
      // Use provided date or today's date
      const dateStr = specificDateStr || new Date().toISOString().slice(0, 10);
      nums = generateDailyPuzzle(t, dateStr);
    } else {
      nums = generatePuzzle(t);
    }

    const newCards = nums.map((val, idx) => ({
      id: idx,
      value: val,
      isUsed: false
    }));

    setCards(newCards);
    setExpression('');
    setExpressionHistory([]);
    setMode(selectedMode);
    
    setStartTime(Date.now());
    setIsWin(false);
  };

  const initGameWithModeTracking = (selectedMode: GameMode, specificTarget?: number) => {
    setLastActiveMode(selectedMode);
    initGame(selectedMode, specificTarget);
  };

  const handleCardClick = (card: CardItem) => {
    if (card.isUsed) return;
    const newCards = cards.map(c => c.id === card.id ? { ...c, isUsed: true } : c);
    
    // Check if last char was a digit
    const lastChar = expression.trim().slice(-1);
    if (lastChar && /[0-9)]/.test(lastChar)) {
       // Preventing concatenation logic for simplicity
    }

    saveHistory();
    setCards(newCards);
    setExpression(prev => prev + card.value);
  };

  const handleOperatorClick = (op: string) => {
    saveHistory();
    setExpression(prev => prev + op);
  };

  const saveHistory = () => {
    setExpressionHistory(prev => [...prev, {
      str: expression,
      usedIds: cards.filter(c => c.isUsed).map(c => c.id)
    }]);
  };

  const handleUndo = () => {
    if (expressionHistory.length === 0) {
      setExpression('');
      setCards(cards.map(c => ({...c, isUsed: false})));
      return;
    }
    const lastState = expressionHistory[expressionHistory.length - 1];
    setExpression(lastState.str);
    const newCards = cards.map(c => ({
      ...c,
      isUsed: lastState.usedIds.includes(c.id)
    }));
    setCards(newCards);
    setExpressionHistory(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setExpression('');
    setCards(cards.map(c => ({...c, isUsed: false})));
    setExpressionHistory([]);
  };

  const checkResult = () => {
    const allUsed = cards.every(c => c.isUsed);
    if (!allUsed) {
      triggerShake();
      return;
    }
    const result = evaluateExpression(expression);
    if (result !== null && Math.abs(result - targetNumber) < 0.0001) {
      handleWin();
    } else {
      triggerShake();
    }
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleWin = () => {
    stopTimer();
    const timeTaken = Date.now() - startTime;
    setFinalTime(timeTaken);
    setIsWin(true);
    setMode(GameMode.RESULT);

    if (mode === GameMode.PLAYING || mode === GameMode.PRACTICE || mode === GameMode.DAILY) {
      const currentBest = Storage.getBestTime(targetNumber);
      // For Daily mode, we just save every success
      
      const record: HistoryRecord = {
        target: targetNumber,
        time: timeTaken,
        date: new Date().toISOString(), // Full ISO string for storage
        nickname: nickname,
        mode: mode 
      };

      Storage.saveScore(record);

      if (mode !== GameMode.PRACTICE && (!currentBest || timeTaken < currentBest)) {
        setIsNewRecord(true);
      } else {
        setIsNewRecord(false);
      }
    } else {
      setIsNewRecord(false);
    }
  };

  // --- Handlers: Sharing ---
  
  // Share the specific result
  const handleShareResult = async () => {
    const url = window.location.origin; // Just base URL for general game entry
    const dateStr = new Date().toISOString().slice(0, 10);
    const text = `🧩 Make N Challenge!\nTarget: ${targetNumber}\nTime: ${formatTime(finalTime)}s\nMode: ${mode}\nDate: ${dateStr}\n\nPlay here: ${url}`;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Make N Result',
          text: text,
          url: url
        });
      } else {
        await navigator.clipboard.writeText(text);
        alert("Result copied to clipboard!");
      }
    } catch (err) {
      console.error("Error sharing:", err);
      alert("Could not share automatically.");
    }
  };

  // Share the game link itself
  const handleShareGame = async () => {
    const url = window.location.origin;
    const text = `🧠 Challenge your brain with Make N! Can you calculate the target number?\n\nPlay here: ${url}`;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Make N - Math Puzzle',
          text: text,
          url: url
        });
      } else {
        await navigator.clipboard.writeText(text + " " + url);
        alert("Game link copied to clipboard!");
      }
    } catch (err) {
      console.error("Error sharing:", err);
      alert("Link copied to clipboard!");
      await navigator.clipboard.writeText(url);
    }
  };

  // --- Render Helpers ---

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const centis = Math.floor((ms % 1000) / 10);
    return `${seconds.toString().padStart(2, '0')}.${centis.toString().padStart(2, '0')}`;
  };

  // --- Calendar Component ---
  const renderCalendarPage = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDay = firstDayOfMonth.getDay(); // 0 = Sunday
    
    const playedDays = Storage.getDaysPlayedInMonth(year, month);
    
    // Generate grid array
    const grid = [];
    for (let i = 0; i < startDay; i++) grid.push(null);
    for (let i = 1; i <= daysInMonth; i++) grid.push(i);

    const dailyRecords = selectedDailyDate ? Storage.getDailyRecordsByDate(selectedDailyDate) : [];

    return (
      <div className="flex flex-col h-screen max-w-md mx-auto bg-white shadow-xl">
        {/* Header */}
        <div className="p-6 bg-orange-500 text-white rounded-b-3xl shadow-lg z-10 sticky top-0">
          <div className="flex justify-between items-center mb-2">
            <button onClick={() => setMode(GameMode.LOBBY)} className="p-2 bg-white/20 hover:bg-white/30 rounded-lg backdrop-blur-sm">
              <ChevronLeft size={24} />
            </button>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CalendarIcon /> Records
            </h1>
            <div className="w-10"></div> {/* Spacer */}
          </div>
          
          <div className="flex justify-between items-center bg-orange-600 rounded-xl p-2 mt-4">
             <button onClick={() => setCalendarDate(new Date(year, month - 1))} className="p-1 hover:bg-orange-500 rounded text-white">
               <ChevronLeft />
             </button>
             <div className="font-bold">{firstDayOfMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</div>
             <button onClick={() => setCalendarDate(new Date(year, month + 1))} className="p-1 hover:bg-orange-500 rounded text-white">
               <ChevronRight />
             </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          {/* Calendar Grid */}
          <div className="bg-white rounded-2xl p-4 shadow-sm mb-6">
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-gray-400 mb-2">
              <div>S</div><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {grid.map((day, idx) => {
                if (!day) return <div key={idx}></div>;
                
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isPlayed = playedDays.includes(dateStr);
                const isSelected = selectedDailyDate === dateStr;
                const isToday = dateStr === new Date().toISOString().slice(0, 10);

                return (
                  <button 
                    key={idx}
                    onClick={() => {
                      if (isPlayed) setSelectedDailyDate(dateStr);
                    }}
                    disabled={!isPlayed}
                    className={`
                      aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all text-sm
                      ${isSelected ? 'bg-orange-500 text-white shadow-lg ring-2 ring-orange-200' : ''}
                      ${!isSelected && isPlayed ? 'bg-orange-100 text-orange-600 font-bold hover:bg-orange-200 cursor-pointer' : ''}
                      ${!isPlayed ? 'bg-gray-50 text-gray-300 cursor-default' : ''}
                      ${isToday && !isSelected ? 'border-2 border-orange-400' : ''}
                    `}
                  >
                    {day}
                    {isPlayed && !isSelected && <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-1"></div>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Records List Section */}
          <div className="mb-4">
             <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
               <ClipboardList size={18} className="text-orange-500"/>
               {selectedDailyDate ? `${selectedDailyDate} Records` : "Select a date to view records"}
             </h3>
             
             {selectedDailyDate ? (
               <div className="space-y-3 animate-in slide-in-from-bottom-2 duration-300">
                  {dailyRecords.map((record, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                       <div className="flex items-center gap-3">
                         <div className={`
                           w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                           ${idx === 0 ? 'bg-yellow-100 text-yellow-600' : 
                             idx === 1 ? 'bg-gray-100 text-gray-600' : 
                             idx === 2 ? 'bg-orange-50 text-orange-600' : 'bg-slate-50 text-slate-400'}
                         `}>
                           {idx + 1}
                         </div>
                         <div>
                           <div className="font-bold text-gray-800">{record.nickname}</div>
                           <div className="text-xs text-gray-400">Target: {record.target}</div>
                         </div>
                       </div>
                       <div className="text-xl font-mono font-bold text-indigo-600">
                         {formatTime(record.time)}<span className="text-sm text-gray-400 ml-1">s</span>
                       </div>
                    </div>
                  ))}
                  {dailyRecords.length === 0 && (
                    <div className="bg-white p-6 rounded-xl text-center text-gray-400 border border-dashed border-gray-200">
                      No records found for this date.
                    </div>
                  )}
               </div>
             ) : (
               <div className="bg-white p-8 rounded-xl text-center text-gray-400 border border-dashed border-gray-200">
                 Tap a colored date on the calendar above to see who solved the puzzle!
               </div>
             )}
          </div>
        </div>
      </div>
    );
  };

  // --- Views ---

  const renderLobby = () => {
    const bestTime = Storage.getBestTime(TARGET_OPTIONS[targetIndex]);

    return (
      <div className="flex flex-col h-screen max-w-md mx-auto bg-white shadow-xl overflow-hidden relative">
        {/* Header */}
        <div className="p-6 bg-indigo-600 text-white rounded-b-3xl shadow-lg z-10">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <BrainCircuit /> Make N
            </h1>
            <div className="flex gap-2">
              <button 
                onClick={handleShareGame}
                className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center hover:bg-indigo-400 transition-colors"
                title="Share Game Link"
              >
                <LinkIcon size={16} />
              </button>
              <div className="flex items-center gap-2 bg-indigo-700 px-3 py-1 rounded-full text-sm">
                <User size={16} />
                <input 
                  value={nickname}
                  onChange={(e) => {
                    setNicknameState(e.target.value);
                    Storage.setNickname(e.target.value);
                  }}
                  className="bg-transparent border-none outline-none w-20 text-white placeholder-indigo-300"
                  placeholder="Name"
                />
              </div>
            </div>
          </div>
          <p className="opacity-80 text-sm">Brain training puzzle arcade</p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
          
          {/* Target Selector */}
          <div className="w-full mb-8">
            <h2 className="text-gray-500 font-semibold mb-3 flex items-center gap-2">
              <Target size={18} /> TARGET NUMBER
            </h2>
            <div className="flex items-center justify-between bg-gray-100 rounded-2xl p-2">
              <button 
                onClick={() => {
                  setTargetIndex(prev => (prev > 0 ? prev - 1 : TARGET_OPTIONS.length - 1));
                  setTargetNumber(TARGET_OPTIONS[targetIndex > 0 ? targetIndex - 1 : TARGET_OPTIONS.length - 1]);
                }}
                className="p-3 bg-white rounded-xl shadow-sm hover:bg-gray-50 text-indigo-600"
              >
                <ChevronLeft />
              </button>
              <div className="text-center">
                <span className="text-4xl font-bold text-gray-800">{TARGET_OPTIONS[targetIndex]}</span>
                <div className="text-xs text-gray-400 mt-1">Best: {bestTime ? formatTime(bestTime) : '--.--'}s</div>
              </div>
              <button 
                onClick={() => {
                  setTargetIndex(prev => (prev < TARGET_OPTIONS.length - 1 ? prev + 1 : 0));
                  setTargetNumber(TARGET_OPTIONS[targetIndex < TARGET_OPTIONS.length - 1 ? targetIndex + 1 : 0]);
                }}
                className="p-3 bg-white rounded-xl shadow-sm hover:bg-gray-50 text-indigo-600"
              >
                <ChevronRight />
              </button>
            </div>
          </div>

          {/* Buttons */}
          <div className="w-full space-y-4">
            <button 
              onClick={() => initGameWithModeTracking(GameMode.PLAYING, TARGET_OPTIONS[targetIndex])}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-xl shadow-lg shadow-indigo-200 active:scale-95 transition-transform flex items-center justify-center gap-2"
            >
              <Trophy /> RANKED CHALLENGE
            </button>
            
            <div className="flex gap-3">
              <button 
                onClick={() => initGameWithModeTracking(GameMode.DAILY, TARGET_OPTIONS[targetIndex])}
                className="flex-1 py-4 bg-orange-500 text-white rounded-2xl font-bold text-lg shadow-lg shadow-orange-200 active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                <Play /> DAILY
              </button>
              <button 
                onClick={() => setMode(GameMode.CALENDAR)}
                className="w-16 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center shadow-inner hover:bg-orange-200 active:scale-95 transition-transform"
                title="Daily Records"
              >
                <ClipboardList size={24} />
              </button>
            </div>

            <button 
              onClick={() => initGameWithModeTracking(GameMode.PRACTICE, TARGET_OPTIONS[targetIndex])}
              className="w-full py-4 bg-teal-500 text-white rounded-2xl font-bold text-xl shadow-lg shadow-teal-200 active:scale-95 transition-transform flex items-center justify-center gap-2"
            >
              <Play /> PRACTICE
            </button>
          </div>

          {/* Mini Ranking Board Preview */}
          <div className="w-full mt-8 bg-white rounded-2xl border border-gray-100 p-4">
            <h3 className="text-gray-400 font-bold text-sm mb-3">TOP RANKERS (LOCAL)</h3>
            <div className="space-y-2">
               {Storage.getScores()
                .filter(s => s.target === TARGET_OPTIONS[targetIndex] && s.mode !== GameMode.DAILY)
                .slice(0, 3)
                .map((score, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded-lg">
                    <span className="flex items-center gap-2 font-bold text-gray-700">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'} {score.nickname}
                    </span>
                    <span className="font-mono font-medium text-indigo-600">{formatTime(score.time)}s</span>
                  </div>
                ))}
                {Storage.getScores().filter(s => s.target === TARGET_OPTIONS[targetIndex] && s.mode !== GameMode.DAILY).length === 0 && (
                  <div className="text-center text-gray-300 text-sm py-2">No records yet. Be the first!</div>
                )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderGame = () => {
    return (
      <div className="flex flex-col h-screen max-w-md mx-auto bg-gray-50 relative">
        {/* Top Bar */}
        <div className="p-4 flex justify-between items-start">
          <button 
            onClick={() => setMode(GameMode.LOBBY)}
            className="p-2 bg-gray-200 rounded-lg text-gray-600 hover:bg-gray-300"
          >
            <ChevronLeft />
          </button>
          <div className="flex flex-col items-end">
            <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Target</div>
            <div className="text-5xl font-bold text-indigo-600 leading-none">{targetNumber}</div>
          </div>
        </div>

        {/* Timer (Sticky) */}
        <div className="px-4 mb-4">
          <div className="bg-white rounded-full py-2 px-6 shadow-sm border border-gray-100 flex justify-center items-center gap-2">
            <div className={`w-3 h-3 rounded-full animate-pulse ${mode === GameMode.PRACTICE ? 'bg-teal-400' : 'bg-red-500'}`}></div>
            <span className="font-mono text-2xl font-bold text-gray-700">
              {formatTime(mode === GameMode.PLAYING || mode === GameMode.PRACTICE || mode === GameMode.DAILY ? (Date.now() - startTime) : currentTime)}
              <span className="text-sm ml-1">s</span>
            </span>
          </div>
        </div>

        {/* Main Game Area */}
        <div className="flex-1 flex flex-col p-4">
          
          {/* Expression Display */}
          <div className={`
            flex-1 min-h-[120px] bg-white rounded-2xl shadow-inner border-2 
            flex items-center justify-center p-4 mb-6 relative overflow-hidden
            ${shake ? 'border-red-400 translate-x-1 transition-transform' : 'border-gray-200'}
          `}>
             <span className="text-4xl font-medium text-gray-800 break-all text-center">
               {expression || <span className="text-gray-300">Make {targetNumber}</span>}
             </span>
             {expression && (
                <button 
                  onClick={handleUndo}
                  className="absolute bottom-2 right-2 p-2 text-gray-400 hover:text-gray-600 active:scale-95"
                >
                  <Delete size={24} />
                </button>
             )}
          </div>

          {/* Cards Area */}
          <div className="flex justify-center gap-3 sm:gap-4 mb-8">
            {cards.map((card) => (
              <NumberCard 
                key={card.id} 
                card={card} 
                onClick={handleCardClick} 
              />
            ))}
          </div>

          {/* Operators Pad */}
          <div className="grid grid-cols-4 gap-3 bg-white p-4 rounded-3xl shadow-lg border border-gray-100">
            {['+', '-', '*', '/'].map((op) => (
              <button
                key={op}
                onClick={() => handleOperatorClick(op)}
                className="aspect-square rounded-2xl bg-indigo-50 text-indigo-600 text-2xl font-bold hover:bg-indigo-100 active:bg-indigo-200 transition-colors btn-press"
              >
                {op === '*' ? '×' : op === '/' ? '÷' : op}
              </button>
            ))}
            <button
              onClick={() => handleOperatorClick('(')}
              className="aspect-square rounded-2xl bg-gray-100 text-gray-600 text-xl font-bold hover:bg-gray-200 btn-press"
            >
              (
            </button>
            <button
              onClick={() => handleOperatorClick(')')}
              className="aspect-square rounded-2xl bg-gray-100 text-gray-600 text-xl font-bold hover:bg-gray-200 btn-press"
            >
              )
            </button>
             <button
              onClick={handleClear}
              className="aspect-square rounded-2xl bg-red-50 text-red-500 font-bold hover:bg-red-100 btn-press flex items-center justify-center"
            >
              <RotateCcw size={20} />
            </button>
             <button
              onClick={checkResult}
              className="aspect-square rounded-2xl bg-green-500 text-white text-xl font-bold shadow-lg shadow-green-200 active:scale-95 transition-transform flex items-center justify-center"
            >
              =
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderResult = () => {
    return (
      <div className="flex flex-col h-screen max-w-md mx-auto bg-indigo-600 text-white relative items-center justify-center p-6">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10 pointer-events-none">
          <div className="absolute top-10 left-10 text-9xl">N</div>
          <div className="absolute bottom-20 right-10 text-9xl">N</div>
        </div>

        <div className="z-10 text-center animate-bounce mb-8">
           {isNewRecord && <div className="text-yellow-300 font-bold text-lg mb-2 flex items-center justify-center gap-2"><Medal /> NEW RECORD!</div>}
           <h1 className="text-6xl font-black tracking-tighter drop-shadow-lg">CLEAR!</h1>
        </div>

        <div className="bg-white text-gray-800 p-8 rounded-3xl shadow-2xl w-full max-w-sm text-center mb-6 transform rotate-1">
          <div className="flex justify-between items-center mb-2">
            <div className="text-gray-400 text-sm font-bold uppercase">Target {targetNumber}</div>
            <div className="text-gray-400 text-xs font-mono">{new Date().toLocaleDateString()}</div>
          </div>
          <div className="text-5xl font-mono font-bold text-indigo-600 mb-6">
            {formatTime(finalTime)}s
          </div>
          
          <div className="flex gap-2 justify-center">
            {cards.map((c, i) => (
              <div key={i} className="w-8 h-10 bg-gray-100 rounded flex items-center justify-center font-bold text-gray-600">
                {c.value}
              </div>
            ))}
          </div>
          <div className="mt-4 p-2 bg-indigo-50 rounded-lg text-indigo-800 font-medium">
            {expression} = {targetNumber}
          </div>
        </div>

        {/* Share Button */}
        <button 
           onClick={handleShareResult}
           className="z-10 mb-6 bg-white/20 hover:bg-white/30 text-white border border-white/40 px-6 py-2 rounded-full flex items-center gap-2 transition-all active:scale-95"
        >
          <Share2 size={18} /> Share Result
        </button>

        <div className="flex flex-col w-full gap-4 max-w-sm z-10">
          <button 
            onClick={() => initGameWithModeTracking(lastActiveMode, targetNumber)}
            className="w-full py-4 bg-white text-indigo-600 rounded-2xl font-bold text-xl shadow-lg active:scale-95 transition-transform"
          >
            TRY AGAIN
          </button>
          <button 
            onClick={() => setMode(GameMode.LOBBY)}
            className="w-full py-4 bg-indigo-800 text-indigo-200 rounded-2xl font-bold text-xl active:scale-95 transition-transform"
          >
            BACK TO LOBBY
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {mode === GameMode.LOBBY && renderLobby()}
      {(mode === GameMode.PLAYING || mode === GameMode.PRACTICE || mode === GameMode.DAILY) && renderGame()}
      {mode === GameMode.RESULT && renderResult()}
      {mode === GameMode.CALENDAR && renderCalendarPage()}
    </>
  );
};

export default App;