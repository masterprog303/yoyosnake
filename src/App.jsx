import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as Tone from 'tone';

const GRID_SIZE = 20;
const CELL_SIZE = 20;
const INITIAL_SNAKE = [[10, 10]];
const INITIAL_DIRECTION = { x: 1, y: 0 };
const INITIAL_SPEED = 150;

const FRUIT_TYPES = {
  normal: { emoji: '🍎', points: 10, color: '#ef4444', name: 'Apple' },
  double: { emoji: '🍒', points: 20, color: '#dc2626', name: 'Cherry' },
  slow: { emoji: '🍋', points: 10, color: '#eab308', name: 'Lemon', effect: 'slow' },
  mini: { emoji: '🍏', points: 10, color: '#22c55e', name: 'Mini Apple', effect: 'shrink' },
  hot: { emoji: '🔥', points: 10, color: '#f97316', name: 'Hot Fruit', effect: 'speed' },
  star: { emoji: '⭐', points: 10, color: '#fbbf24', name: 'Star Fruit', effect: 'star' }
};

const ACHIEVEMENTS = [
  { id: 'complete-classic', name: 'Complete Classic Mode', desc: 'Reach 3000 points in Classic', reward: 3, check: (scores) => scores.classic >= 3000 },
  { id: 'complete-speed', name: 'Speed Demon', desc: 'Complete Speed Mode', reward: 3, check: (scores) => scores.speed >= 100 },
  { id: 'hard-2000', name: 'Hard Mode Master', desc: 'Reach 2000 points in Hard Mode', reward: 3, check: (scores) => scores.hard >= 2000 },
  { id: 'endless-5000', name: 'Endless Warrior', desc: 'Reach 5000 points in any Endless mode', reward: 4, check: (scores) => scores['endless-classic'] >= 5000 || scores['endless-speedy'] >= 5000 || scores['endless-hard'] >= 5000 },
  { id: 'uncompromising-complete', name: 'The Uncompromising', desc: 'Complete Uncompromising Mode', reward: 10, check: (scores) => scores.uncompromising >= 10000 },
  { id: 'buy-3-colors', name: 'Colorful Snake', desc: 'Unlock 3 paid colors', reward: 1, check: (_, unlocked) => unlocked.colors.filter(c => COLORS[c] && COLORS[c].cost > 0).length >= 3 },
  { id: 'buy-5-patterns', name: 'Pattern Master', desc: 'Unlock 5 paid patterns', reward: 2, check: (_, unlocked) => unlocked.patterns.filter(p => PATTERNS[p] && PATTERNS[p].cost > 0).length >= 5 },
  { id: 'collector', name: 'The Collector', desc: 'Unlock all colors and patterns', reward: 5, check: (_, unlocked) => unlocked.colors.length === Object.keys(COLORS).length && unlocked.patterns.length === Object.keys(PATTERNS).length }
];

const COLORS = {
  red: { value: '#ef4444', cost: 0, name: 'Red', textColor: 'white' },
  yellow: { value: '#eab308', cost: 0, name: 'Yellow', textColor: 'black' },
  blue: { value: '#3b82f6', cost: 0, name: 'Blue', textColor: 'white' },
  green: { value: '#10b981', cost: 0, name: 'Green', textColor: 'white' },
  white: { value: '#f3f4f6', cost: 2, name: 'White', textColor: 'black' },
  pink: { value: '#ec4899', cost: 2.5, name: 'Pink', textColor: 'white' },
  purple: { value: '#a855f7', cost: 3, name: 'Purple', textColor: 'white' },
  gray: { value: '#6b7280', cost: 3.5, name: 'Gray', textColor: 'white' },
  gradient: { value: 'linear-gradient(135deg, #3b82f6 0%, #a855f7 50%, #f3f4f6 100%)', cost: 15, name: 'Legendary Gradient', textColor: 'white', isGradient: true }
};

const PATTERNS = {
  squares: { symbol: '■', cost: 0, name: 'Squares' },
  rectangles: { symbol: '▬', cost: 0, name: 'Rectangles' },
  triangles: { symbol: '▲', cost: 0, name: 'Triangles' },
  stars: { symbol: '★', cost: 3, name: 'Stars' },
  pentagon: { symbol: '⬟', cost: 4.5, name: 'Pentagon' },
  hexagon: { symbol: '⬡', cost: 5, name: 'Hexagon' },
  heptagon: { symbol: '⬢', cost: 6, name: 'Heptagon' },
  octagon: { symbol: '⯃', cost: 6.3, name: 'Octagon' },
  nonagon: { symbol: '⬣', cost: 7.3, name: 'Nonagon' },
  decagon: { symbol: '⬤', cost: 8, name: 'Decagon' },
  freeze: { symbol: '❄', cost: 12.5, name: 'Freeze' }
};

const THEMES = {
  default: {
    name: 'Default',
    cost: 0,
    bg: '#1f2937',
    border: '#10b981',
    glowSnake: false,
    unlockRequirement: null
  },
  dark: {
    name: 'Dark Mode',
    cost: 0,
    bg: '#0a0a0a',
    border: '#1f1f1f',
    glowSnake: true,
    glowColor: '#4ade80',
    darkMode: true,
    unlockRequirement: 'speed'
  },
  ice: {
    name: 'Ice',
    cost: 6.5,
    bg: '#cffafe',
    border: '#06b6d4',
    glowSnake: true,
    glowColor: '#67e8f9',
    unlockRequirement: null
  },
  desert: {
    name: 'Desert',
    cost: 7.5,
    bg: '#fef3c7',
    border: '#f59e0b',
    glowSnake: true,
    glowColor: '#fbbf24',
    unlockRequirement: null
  },
  space: {
    name: 'Space',
    cost: 9,
    bg: '#1e1b4b',
    border: '#8b5cf6',
    glowSnake: true,
    glowColor: '#c084fc',
    stars: true,
    unlockRequirement: null
  },
  neon: {
    name: 'Neon Grid',
    cost: 16.5,
    bg: '#000000',
    border: '#0ff',
    glowSnake: true,
    glowColor: '#0ff',
    neonGrid: true,
    unlockRequirement: null
  }
};

const SnakeLogo = () => (
  <svg width="120" height="120" viewBox="0 0 120 120" className="mx-auto mb-4">
    <path
      d="M 20 60 Q 30 40, 40 50 Q 50 60, 60 50 Q 70 40, 80 50 Q 90 60, 100 50"
      stroke="#10b981"
      strokeWidth="12"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="100" cy="50" r="8" fill="#10b981" />
    <circle cx="95" cy="45" r="2" fill="white" />
    <circle cx="20" cy="60" r="6" fill="#ef4444" />
  </svg>
);

export default function SnakeGame() {
  const [gameState, setGameState] = useState('menu');
  const [gameMode, setGameMode] = useState('classic');
  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const [food, setFood] = useState([5, 5]);
  const [direction, setDirection] = useState(INITIAL_DIRECTION);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lives, setLives] = useState(0);
  const [showRevive, setShowRevive] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(INITIAL_SPEED);
  const [isSlowdown, setIsSlowdown] = useState(false);
  const [isSpeedBoost, setIsSpeedBoost] = useState(false);
  const [unlockedModes, setUnlockedModes] = useState(['classic']);
  const [highScores, setHighScores] = useState({
    classic: 0,
    speed: 0,
    hard: 0,
    'endless-classic': 0,
    'endless-speedy': 0,
    'endless-hard': 0,
    uncompromising: 0,
    'crazy-fruits': 0
  });
  const [snakeColor, setSnakeColor] = useState('green');
  const [snakePattern, setSnakePattern] = useState('squares');
  const [theme, setTheme] = useState('default');
  const [starPoints, setStarPoints] = useState(0);
  const [unlockedPatterns, setUnlockedPatterns] = useState(['squares', 'rectangles', 'triangles']);
  const [unlockedColors, setUnlockedColors] = useState(['red', 'yellow', 'blue', 'green']);
  const [unlockedThemes, setUnlockedThemes] = useState(['default']);
  const [lastStarCheck, setLastStarCheck] = useState(0);
  const [currentFruitType, setCurrentFruitType] = useState('normal');
  const [fruitEffectActive, setFruitEffectActive] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [showAchievement, setShowAchievement] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showAchievementsMenu, setShowAchievementsMenu] = useState(false);
 
  const synthRef = useRef(null);
  const musicSynthRef = useRef(null);
  const musicLoopRef = useRef(null);
  const menuMusicLoopRef = useRef(null);
  const slowdownTimerRef = useRef(null);
  const speedBoostTimerRef = useRef(null);
  const fruitEffectTimerRef = useRef(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const modesResult = await window.storage.get('unlocked-modes');
        if (modesResult) {
          setUnlockedModes(JSON.parse(modesResult.value));
        }
      } catch (e) {
        console.log('No saved modes yet');
      }

      try {
        const scoresResult = await window.storage.get('high-scores');
        if (scoresResult) {
          setHighScores(JSON.parse(scoresResult.value));
        }
      } catch (e) {
        console.log('No saved scores yet');
      }

      try {
        const customResult = await window.storage.get('snake-customization');
        if (customResult) {
          const custom = JSON.parse(customResult.value);
          setSnakeColor(custom.color || 'green');
          setSnakePattern(custom.pattern || 'squares');
          setTheme(custom.theme || 'default');
        }
      } catch (e) {
        console.log('No saved customization yet');
      }

      try {
        const starResult = await window.storage.get('star-points');
        if (starResult) {
          setStarPoints(parseFloat(starResult.value));
        }
      } catch (e) {
        console.log('No saved star points yet');
      }

      try {
        const patternsResult = await window.storage.get('unlocked-patterns');
        if (patternsResult) {
          setUnlockedPatterns(JSON.parse(patternsResult.value));
        }
      } catch (e) {
        console.log('No saved patterns yet');
      }

      try {
        const colorsResult = await window.storage.get('unlocked-colors');
        if (colorsResult) {
          setUnlockedColors(JSON.parse(colorsResult.value));
        }
      } catch (e) {
        console.log('No saved colors yet');
      }

      try {
        const themesResult = await window.storage.get('unlocked-themes');
        if (themesResult) {
          setUnlockedThemes(JSON.parse(themesResult.value));
        }
      } catch (e) {
        console.log('No saved themes yet');
      }

      try {
        const achievementsResult = await window.storage.get('achievements');
        if (achievementsResult) {
          setAchievements(JSON.parse(achievementsResult.value));
        }
      } catch (e) {
        console.log('No saved achievements yet');
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    synthRef.current = new Tone.Synth().toDestination();
    musicSynthRef.current = new Tone.Synth({
      oscillator: { type: 'square' },
      envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 0.1 }
    }).toDestination();
    musicSynthRef.current.volume.value = -12;
   
    return () => {
      if (synthRef.current) {
        synthRef.current.dispose();
      }
      if (musicSynthRef.current) {
        musicSynthRef.current.dispose();
      }
      if (musicLoopRef.current) {
        musicLoopRef.current.stop();
        musicLoopRef.current.dispose();
      }
      if (menuMusicLoopRef.current) {
        menuMusicLoopRef.current.stop();
        menuMusicLoopRef.current.dispose();
      }
      if (slowdownTimerRef.current) {
        clearTimeout(slowdownTimerRef.current);
      }
      if (speedBoostTimerRef.current) {
        clearTimeout(speedBoostTimerRef.current);
      }
      if (fruitEffectTimerRef.current) {
        clearTimeout(fruitEffectTimerRef.current);
      }
    };
  }, []);

  const playEatSound = () => {
    if (synthRef.current) {
      synthRef.current.triggerAttackRelease("C5", "0.1");
    }
  };

  const playLifeSound = () => {
    if (synthRef.current) {
      synthRef.current.triggerAttackRelease("C5", "0.08", Tone.now());
      synthRef.current.triggerAttackRelease("E5", "0.08", Tone.now() + 0.08);
      synthRef.current.triggerAttackRelease("G5", "0.08", Tone.now() + 0.16);
      synthRef.current.triggerAttackRelease("C6", "0.12", Tone.now() + 0.24);
      synthRef.current.triggerAttackRelease("E6", "0.15", Tone.now() + 0.36);
    }
  };

  const playGameOverSound = () => {
    if (synthRef.current) {
      synthRef.current.triggerAttackRelease("C4", "0.2", Tone.now());
      synthRef.current.triggerAttackRelease("G3", "0.2", Tone.now() + 0.15);
      synthRef.current.triggerAttackRelease("E3", "0.4", Tone.now() + 0.3);
    }
  };

  const playUnlockSound = () => {
    if (synthRef.current) {
      synthRef.current.triggerAttackRelease("C5", "0.1");
      setTimeout(() => synthRef.current.triggerAttackRelease("E5", "0.1"), 100);
      setTimeout(() => synthRef.current.triggerAttackRelease("G5", "0.2"), 200);
    }
  };

  const playStarEarnedSound = () => {
    if (synthRef.current) {
      synthRef.current.triggerAttackRelease("E5", "0.08", Tone.now());
      synthRef.current.triggerAttackRelease("G5", "0.08", Tone.now() + 0.08);
      synthRef.current.triggerAttackRelease("C6", "0.12", Tone.now() + 0.16);
      synthRef.current.triggerAttackRelease("E6", "0.15", Tone.now() + 0.28);
      synthRef.current.triggerAttackRelease("G6", "0.2", Tone.now() + 0.43);
    }
  };

  const playAchievementSound = () => {
    if (synthRef.current) {
      synthRef.current.triggerAttackRelease("C5", "0.1", Tone.now());
      synthRef.current.triggerAttackRelease("E5", "0.1", Tone.now() + 0.1);
      synthRef.current.triggerAttackRelease("G5", "0.1", Tone.now() + 0.2);
      synthRef.current.triggerAttackRelease("C6", "0.15", Tone.now() + 0.3);
      synthRef.current.triggerAttackRelease("E6", "0.2", Tone.now() + 0.45);
    }
  };

  const startMusic = (mode) => {
    if (musicLoopRef.current) {
      musicLoopRef.current.stop();
      musicLoopRef.current.dispose();
    }

    const melodies = {
      classic: ['C4', 'E4', 'G4', 'E4', 'C4', 'G3', 'C4', 'E4'],
      speed: ['E4', 'G4', 'A4', 'G4', 'E4', 'D4', 'E4', 'G4', 'A4', 'B4'],
      hard: ['A3', 'C4', 'E4', 'F4', 'E4', 'D4', 'C4', 'A3', 'G3', 'A3'],
      'endless-classic': ['C4', 'D4', 'E4', 'G4', 'E4', 'D4', 'C4', 'G3'],
      'endless-speedy': ['E4', 'F#4', 'G4', 'A4', 'B4', 'A4', 'G4', 'F#4'],
      'endless-hard': ['A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'E4', 'D4'],
      uncompromising: ['D4', 'F4', 'A4', 'C5', 'A4', 'F4', 'D4', 'C4', 'D4', 'F4'],
      'crazy-fruits': ['E4', 'G4', 'B4', 'D5', 'B4', 'G4', 'E4', 'D4']
    };

    const tempos = {
      classic: '4n',
      speed: '8n',
      hard: '8n',
      'endless-classic': '4n',
      'endless-speedy': '8n',
      'endless-hard': '8n',
      uncompromising: '16n',
      'crazy-fruits': '8n'
    };

    const melody = melodies[mode] || melodies.classic;
    const tempo = tempos[mode] || '4n';
    let index = 0;

    musicLoopRef.current = new Tone.Loop((time) => {
      if (musicSynthRef.current) {
        musicSynthRef.current.triggerAttackRelease(melody[index % melody.length], tempo, time);
      }
      index++;
    }, tempo);

    Tone.Transport.start();
    musicLoopRef.current.start(0);
  };

  const stopMusic = () => {
    if (musicLoopRef.current) {
      musicLoopRef.current.stop();
    }
    Tone.Transport.stop();
  };

  const startMenuMusic = () => {
    if (menuMusicLoopRef.current) {
      menuMusicLoopRef.current.stop();
      menuMusicLoopRef.current.dispose();
    }

    const melody = ['C4', 'E4', 'G4', 'C5', 'G4', 'E4', 'C4', 'G3'];
    let index = 0;

    menuMusicLoopRef.current = new Tone.Loop((time) => {
      if (musicSynthRef.current) {
        musicSynthRef.current.triggerAttackRelease(melody[index % melody.length], '8n', time);
      }
      index++;
    }, '8n');

    Tone.Transport.start();
    menuMusicLoopRef.current.start(0);
  };

  const stopMenuMusic = () => {
    if (menuMusicLoopRef.current) {
      menuMusicLoopRef.current.stop();
    }
    Tone.Transport.stop();
  };

  const generateFood = useCallback(() => {
    let newFood;
    do {
      newFood = [
        Math.floor(Math.random() * GRID_SIZE),
        Math.floor(Math.random() * GRID_SIZE)
      ];
    } while (snake.some(segment => segment[0] === newFood[0] && segment[1] === newFood[1]));
   
    // Determine fruit type for crazy-fruits mode
    if (gameMode === 'crazy-fruits') {
      const rand = Math.random();
      if (rand < 0.50) setCurrentFruitType('normal');
      else if (rand < 0.65) setCurrentFruitType('double');
      else if (rand < 0.75) setCurrentFruitType('slow');
      else if (rand < 0.85) setCurrentFruitType('mini');
      else if (rand < 0.95) setCurrentFruitType('hot');
      else setCurrentFruitType('star');
    } else {
      setCurrentFruitType('normal');
    }
   
    return newFood;
  }, [snake, gameMode]);

  const getInitialSpeed = (mode) => {
    if (mode === 'speed') return INITIAL_SPEED / 1.30;
    if (mode === 'endless-speedy') return INITIAL_SPEED / 1.50;
    if (mode === 'hard' || mode === 'endless-hard') return INITIAL_SPEED / 1.45;
    if (mode === 'uncompromising') return INITIAL_SPEED / 1.75;
    if (mode === 'crazy-fruits') return INITIAL_SPEED / 1.40;
    return INITIAL_SPEED;
  };

  const resetGame = () => {
    const initialSpeed = getInitialSpeed(gameMode);
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    setFood([5, 5]);
    setScore(0);
    setLives(0);
    setGameOver(false);
    setShowRevive(false);
    setIsPlaying(true);
    setCurrentSpeed(initialSpeed);
    setIsSlowdown(false);
    setIsSpeedBoost(false);
    setLastStarCheck(0);
    setCurrentFruitType('normal');
    setFruitEffectActive(null);
    if (slowdownTimerRef.current) {
      clearTimeout(slowdownTimerRef.current);
    }
    if (speedBoostTimerRef.current) {
      clearTimeout(speedBoostTimerRef.current);
    }
    if (fruitEffectTimerRef.current) {
      clearTimeout(fruitEffectTimerRef.current);
    }
    startMusic(gameMode);
  };

  const startGame = (mode) => {
    setGameMode(mode);
    const initialSpeed = getInitialSpeed(mode);
    setCurrentSpeed(initialSpeed);
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    setFood([5, 5]);
    setScore(0);
    setLives(0);
    setGameOver(false);
    setShowRevive(false);
    setIsPlaying(true);
    setIsSlowdown(false);
    setIsSpeedBoost(false);
    setLastStarCheck(0);
    setCurrentFruitType('normal');
    setFruitEffectActive(null);
    setGameState('playing');
    startMusic(mode);
  };

  const quitToMenu = () => {
    setGameState('menu');
    setGameOver(false);
    setIsPlaying(false);
    setIsPaused(false);
    stopMusic();
    startMenuMusic();
  };

  const unlockMode = async (mode) => {
    if (!unlockedModes.includes(mode)) {
      const newModes = [...unlockedModes, mode];
      setUnlockedModes(newModes);
      playUnlockSound();
      try {
        await window.storage.set('unlocked-modes', JSON.stringify(newModes));
      } catch (e) {
        console.error('Failed to save unlocked modes');
      }
    }
  };

  const checkAchievements = async () => {
    const unlocked = { colors: unlockedColors, patterns: unlockedPatterns };
   
    for (const achievement of ACHIEVEMENTS) {
      if (!achievements.includes(achievement.id) && achievement.check(highScores, unlocked)) {
        const newAchievements = [...achievements, achievement.id];
        setAchievements(newAchievements);
       
        const newStarPoints = starPoints + achievement.reward;
        setStarPoints(newStarPoints);
       
        setShowAchievement(achievement);
        playAchievementSound();
       
        setTimeout(() => setShowAchievement(null), 4000);
       
        try {
          await window.storage.set('achievements', JSON.stringify(newAchievements));
          await window.storage.set('star-points', newStarPoints.toString());
        } catch (e) {
          console.error('Failed to save achievements');
        }
       
        break; // Only show one achievement at a time
      }
    }
  };

  const togglePause = () => {
    if (!gameOver && !showRevive) {
      setIsPaused(p => !p);
    }
  };

  const updateHighScore = async (mode, newScore) => {
    if (newScore > highScores[mode]) {
      const newHighScores = { ...highScores, [mode]: newScore };
      setHighScores(newHighScores);
      try {
        await window.storage.set('high-scores', JSON.stringify(newHighScores));
      } catch (e) {
        console.error('Failed to save high scores');
      }
     
      // Check achievements after updating high score
      setTimeout(checkAchievements, 500);
    }
  };

  const handleDirectionChange = (newDir) => {
    if (!isPlaying && gameState === 'playing') {
      setIsPlaying(true);
    }
   
    if (newDir.x !== 0 && direction.x === 0) {
      setDirection(newDir);
    } else if (newDir.y !== 0 && direction.y === 0) {
      setDirection(newDir);
    }
  };

  const handleSpacePress = () => {
    if (showRevive && lives > 0) {
      setLives(l => l - 1);
      setShowRevive(false);
      setSnake(INITIAL_SNAKE);
      setDirection(INITIAL_DIRECTION);
    } else if (gameOver) {
      resetGame();
    }
  };

  const moveSnake = useCallback(() => {
    if (gameOver || !isPlaying || showRevive || isPaused) return;

    const newSnake = [...snake];
    const head = newSnake[0];
    const newHead = [head[0] + direction.x, head[1] + direction.y];

    if (newHead[0] < 0 || newHead[0] >= GRID_SIZE || newHead[1] < 0 || newHead[1] >= GRID_SIZE) {
      if (lives > 0) {
        setShowRevive(true);
        return;
      }
      playGameOverSound();
      setGameOver(true);
      setIsPlaying(false);
      updateHighScore(gameMode, score);
      stopMusic();
      return;
    }

    if (newSnake.some(segment => segment[0] === newHead[0] && segment[1] === newHead[1])) {
      if (lives > 0) {
        setShowRevive(true);
        return;
      }
      playGameOverSound();
      setGameOver(true);
      setIsPlaying(false);
      updateHighScore(gameMode, score);
      stopMusic();
      return;
    }

    newSnake.unshift(newHead);

    if (newHead[0] === food[0] && newHead[1] === food[1]) {
      const fruitType = FRUIT_TYPES[currentFruitType];
      const newScore = score + fruitType.points;
      setScore(newScore);
      playEatSound();
     
      // Apply fruit effects for crazy-fruits mode
      if (gameMode === 'crazy-fruits' && fruitType.effect) {
        if (fruitType.effect === 'slow') {
          const savedSpeed = currentSpeed;
          setCurrentSpeed(INITIAL_SPEED * 1.5); // Slower
          setFruitEffectActive('slow');
         
          if (fruitEffectTimerRef.current) {
            clearTimeout(fruitEffectTimerRef.current);
          }
         
          fruitEffectTimerRef.current = setTimeout(() => {
            setCurrentSpeed(savedSpeed);
            setFruitEffectActive(null);
          }, 3000);
        } else if (fruitType.effect === 'shrink') {
          if (newSnake.length > 3) {
            newSnake.pop();
            newSnake.pop();
          }
        } else if (fruitType.effect === 'speed') {
          const savedSpeed = currentSpeed;
          setCurrentSpeed(currentSpeed * 0.67); // 1.5x speed
          setFruitEffectActive('speed');
         
          if (fruitEffectTimerRef.current) {
            clearTimeout(fruitEffectTimerRef.current);
          }
         
          fruitEffectTimerRef.current = setTimeout(() => {
            setCurrentSpeed(savedSpeed);
            setFruitEffectActive(null);
          }, 3000);
        } else if (fruitType.effect === 'star') {
          setStarPoints(prev => {
            const newTotal = prev + 1;
            window.storage.set('star-points', newTotal.toString()).catch(e => console.error('Failed to save star points'));
            return newTotal;
          });
          playStarEarnedSound();
        }
      }
     
      // Check for star points every 250 points
      if (Math.floor(newScore / 250) > Math.floor(lastStarCheck / 250)) {
        const earnedStars = Math.floor(newScore / 250) - Math.floor(lastStarCheck / 250);
        setStarPoints(prev => {
          const newTotal = prev + earnedStars;
          window.storage.set('star-points', newTotal.toString()).catch(e => console.error('Failed to save star points'));
          return newTotal;
        });
        setLastStarCheck(newScore);
        playStarEarnedSound();
      }
     
      let lifeThreshold = 150;
      if (gameMode === 'hard' || gameMode === 'endless-hard') {
        lifeThreshold = 200;
      } else if (gameMode === 'endless-classic') {
        lifeThreshold = 200;
      } else if (gameMode === 'uncompromising') {
        lifeThreshold = 350;
      }
     
      if (Math.floor(newScore / lifeThreshold) > Math.floor(score / lifeThreshold)) {
        setLives(l => l + 1);
        playLifeSound();
      }

      if (gameMode === 'classic' && newScore >= 3000) {
        unlockMode('speed');
        // Auto-unlock Dark Mode theme when Speed Mode is unlocked
        if (!unlockedThemes.includes('dark')) {
          const newThemes = [...unlockedThemes, 'dark'];
          setUnlockedThemes(newThemes);
          window.storage.set('unlocked-themes', JSON.stringify(newThemes)).catch(e => {
            console.error('Failed to save themes');
          });
        }
      }

      if (gameMode === 'speed' && newScore >= 100) {
        unlockMode('hard');
      }

      if (gameMode === 'hard' && newScore >= 7500) {
        unlockMode('endless-classic');
        unlockMode('endless-speedy');
        unlockMode('endless-hard');
      }

      if (gameMode === 'endless-hard' && newScore >= 10000) {
        unlockMode('uncompromising');
      }

      if (gameMode === 'uncompromising' && newScore >= 10000) {
        unlockMode('crazy-fruits');
      }

      if (gameMode === 'speed' || gameMode === 'endless-speedy') {
        const speedUpIncrement = 50;
        const speedUpPercent = gameMode === 'endless-speedy' ? 0.90 : 0.95;
       
        if (Math.floor(newScore / speedUpIncrement) > Math.floor(score / speedUpIncrement)) {
          setCurrentSpeed(prevSpeed => prevSpeed * speedUpPercent);
        }

        if (Math.floor(newScore / 200) > Math.floor(score / 200)) {
          const savedSpeed = currentSpeed * speedUpPercent;
          setCurrentSpeed(INITIAL_SPEED);
          setIsSlowdown(true);
         
          if (slowdownTimerRef.current) {
            clearTimeout(slowdownTimerRef.current);
          }
         
          slowdownTimerRef.current = setTimeout(() => {
            setCurrentSpeed(savedSpeed);
            setIsSlowdown(false);
          }, 7000);
        }
      }

      if (gameMode === 'hard' || gameMode === 'endless-hard') {
        const boostInterval = gameMode === 'hard' ? 800 : 700;
       
        if (Math.floor(newScore / boostInterval) > Math.floor(score / boostInterval)) {
          const savedSpeed = currentSpeed;
          setCurrentSpeed(INITIAL_SPEED / 2); // 200% speed
          setIsSpeedBoost(true);
         
          if (speedBoostTimerRef.current) {
            clearTimeout(speedBoostTimerRef.current);
          }
         
          speedBoostTimerRef.current = setTimeout(() => {
            setCurrentSpeed(savedSpeed);
            setIsSpeedBoost(false);
          }, 6000);
        }
      }

      if (gameMode === 'uncompromising') {
        if (Math.floor(newScore / 250) > Math.floor(score / 250)) {
          const savedSpeed = currentSpeed;
          setCurrentSpeed(INITIAL_SPEED / 2.5); // 250% speed
          setIsSpeedBoost(true);
         
          if (speedBoostTimerRef.current) {
            clearTimeout(speedBoostTimerRef.current);
          }
         
          speedBoostTimerRef.current = setTimeout(() => {
            setCurrentSpeed(savedSpeed);
            setIsSpeedBoost(false);
          }, 6000);
        }

        // Check for completion at 10,000 points
        if (newScore >= 10000 && score < 10000) {
          setGameOver(true);
          setIsPlaying(false);
          updateHighScore(gameMode, newScore);
          stopMusic();
          // Show victory message
          setTimeout(() => {
            alert('🎉 UNCOMPROMISING MODE COMPLETED! YOU ARE A LEGEND! 🎉');
          }, 100);
          return;
        }
      }
     
      setFood(generateFood());
    } else {
      newSnake.pop();
    }

    setSnake(newSnake);
  }, [snake, direction, food, gameOver, isPlaying, generateFood, score, lives, gameMode, currentSpeed, showRevive, isPaused]);

  useEffect(() => {
    if (gameState !== 'playing') return;

    const handleKeyPress = (e) => {
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        e.preventDefault();
        setIsPaused(p => !p);
        return;
      }

      if (e.key === ' ') {
        e.preventDefault();
        handleSpacePress();
        return;
      }

      if (!isPlaying && e.key.startsWith('Arrow')) {
        setIsPlaying(true);
      }

      switch (e.key) {
        case 'ArrowUp':
          if (direction.y === 0) setDirection({ x: 0, y: -1 });
          break;
        case 'ArrowDown':
          if (direction.y === 0) setDirection({ x: 0, y: 1 });
          break;
        case 'ArrowLeft':
          if (direction.x === 0) setDirection({ x: -1, y: 0 });
          break;
        case 'ArrowRight':
          if (direction.x === 0) setDirection({ x: 1, y: 0 });
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [direction, isPlaying, gameOver, showRevive, lives, gameState]);

  useEffect(() => {
    if (gameState !== 'playing') return;
    const interval = setInterval(moveSnake, currentSpeed);
    return () => clearInterval(interval);
  }, [moveSnake, gameState, currentSpeed]);

  if (gameState === 'customize') {
    const saveCustomization = async () => {
      try {
        await window.storage.set('snake-customization', JSON.stringify({
          color: snakeColor,
          pattern: snakePattern
        }));
      } catch (e) {
        console.error('Failed to save customization');
      }
     
      // Check achievements after customization
      setTimeout(checkAchievements, 500);
     
      setGameState('menu');
    };

    const unlockPattern = async (patternName) => {
      const pattern = PATTERNS[patternName];
      if (starPoints >= pattern.cost && !unlockedPatterns.includes(patternName)) {
        const newStarPoints = starPoints - pattern.cost;
        setStarPoints(newStarPoints);
        const newUnlocked = [...unlockedPatterns, patternName];
        setUnlockedPatterns(newUnlocked);
       
        try {
          await window.storage.set('star-points', newStarPoints.toString());
          await window.storage.set('unlocked-patterns', JSON.stringify(newUnlocked));
          playUnlockSound();
         
          // Check achievements after unlock
          setTimeout(checkAchievements, 500);
        } catch (e) {
          console.error('Failed to save unlock');
        }
      }
    };

    const unlockColor = async (colorName) => {
      const color = COLORS[colorName];
      if (starPoints >= color.cost && !unlockedColors.includes(colorName)) {
        const newStarPoints = starPoints - color.cost;
        setStarPoints(newStarPoints);
        const newUnlocked = [...unlockedColors, colorName];
        setUnlockedColors(newUnlocked);
       
        try {
          await window.storage.set('star-points', newStarPoints.toString());
          await window.storage.set('unlocked-colors', JSON.stringify(newUnlocked));
          playUnlockSound();
         
          // Check achievements after unlock
          setTimeout(checkAchievements, 500);
        } catch (e) {
          console.error('Failed to save unlock');
        }
      }
    };

    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 p-4">
        <div className="max-w-3xl w-full">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <svg className="w-24 h-24 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-purple-400 mb-2">Customize Snake</h1>
            <p className="text-xl text-gray-400">Make it your own!</p>
            <div className="mt-4 inline-block bg-yellow-500 text-gray-900 px-6 py-2 rounded-lg font-bold text-xl">
              ⭐ Star Points: {starPoints}
            </div>
            <p className="text-sm text-gray-400 mt-2">Earn 1 ⭐ every 250 in-game points</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border-2 border-purple-500 mb-6">
            <h2 className="text-2xl font-bold text-purple-400 mb-4">Snake Color</h2>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {Object.entries(COLORS).map(([colorName, colorData]) => {
                const isUnlocked = unlockedColors.includes(colorName);
                const canAfford = starPoints >= colorData.cost;
               
                return (
                  <button
                    key={colorName}
                    onClick={() => {
                      if (isUnlocked) {
                        setSnakeColor(colorName);
                      } else if (canAfford) {
                        unlockColor(colorName);
                      }
                    }}
                    className={`h-20 rounded-lg border-4 transition relative ${
                      snakeColor === colorName ? 'border-white scale-110' :
                      isUnlocked ? 'border-gray-600 hover:border-gray-400' :
                      canAfford ? 'border-yellow-500' :
                      'border-gray-700 opacity-50 cursor-not-allowed'
                    }`}
                    style={{
                      background: colorData.isGradient ? colorData.value : colorData.value
                    }}
                    disabled={!isUnlocked && !canAfford}
                  >
                    <span className={`font-bold text-sm capitalize ${
                      colorData.textColor === 'black' ? 'text-black' : 'text-white'
                    }`}>
                      {colorData.name}
                    </span>
                    {!isUnlocked && (
                      <div className="absolute bottom-1 left-0 right-0 text-center">
                        <span className="text-xs font-bold bg-black bg-opacity-70 px-2 py-1 rounded text-yellow-400">
                          {canAfford ? `⭐${colorData.cost}` : `🔒 ⭐${colorData.cost}`}
                        </span>
                      </div>
                    )}
                    {isUnlocked && colorData.cost > 0 && (
                      <div className="absolute top-1 right-1 text-green-400 text-sm bg-black bg-opacity-50 rounded-full w-6 h-6 flex items-center justify-center">✓</div>
                    )}
                  </button>
                );
              })}
            </div>

            <h2 className="text-2xl font-bold text-purple-400 mb-4">Snake Pattern</h2>
            <div className="grid grid-cols-4 gap-3">
              {Object.entries(PATTERNS).map(([patternName, patternData]) => {
                const isUnlocked = unlockedPatterns.includes(patternName);
                const canAfford = starPoints >= patternData.cost;
               
                return (
                  <button
                    key={patternName}
                    onClick={() => {
                      if (isUnlocked) {
                        setSnakePattern(patternName);
                      } else if (canAfford) {
                        unlockPattern(patternName);
                      }
                    }}
                    className={`h-20 rounded-lg border-4 transition flex flex-col items-center justify-center relative ${
                      snakePattern === patternName ? 'border-white scale-110 bg-gray-700' :
                      isUnlocked ? 'border-gray-600 bg-gray-800 hover:bg-gray-700' :
                      canAfford ? 'border-yellow-500 bg-gray-800 hover:bg-gray-700' :
                      'border-gray-700 bg-gray-900 opacity-50 cursor-not-allowed'
                    }`}
                    disabled={!isUnlocked && !canAfford}
                  >
                    <div className="text-3xl mb-1">{patternData.symbol}</div>
                    <div className="text-xs text-gray-300 capitalize">{patternData.name}</div>
                    {!isUnlocked && (
                      <div className="text-xs text-yellow-400 mt-1 font-bold">
                        {canAfford ? `⭐${patternData.cost}` : `🔒 ⭐${patternData.cost}`}
                      </div>
                    )}
                    {isUnlocked && patternData.cost > 0 && (
                      <div className="absolute top-1 right-1 text-green-400 text-xs">✓</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border-2 border-purple-500 mb-6">
            <h2 className="text-2xl font-bold text-purple-400 mb-4">Game Theme</h2>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(THEMES).map(([themeName, themeData]) => {
                const isUnlocked = unlockedThemes.includes(themeName);
                const canAfford = starPoints >= themeData.cost;
                const meetsRequirement = !themeData.unlockRequirement || unlockedModes.includes(themeData.unlockRequirement);
               
                return (
                  <button
                    key={themeName}
                    onClick={() => {
                      if (isUnlocked) {
                        setTheme(themeName);
                      } else if (canAfford && meetsRequirement) {
                        unlockTheme(themeName);
                      }
                    }}
                    className={`h-24 rounded-lg border-4 transition relative overflow-hidden ${
                      theme === themeName ? 'border-white scale-105' :
                      isUnlocked ? 'border-gray-600 hover:border-gray-400' :
                      canAfford && meetsRequirement ? 'border-yellow-500' :
                      'border-gray-700 opacity-50 cursor-not-allowed'
                    }`}
                    style={{
                      backgroundColor: themeData.bg,
                      position: 'relative'
                    }}
                    disabled={!isUnlocked && (!canAfford || !meetsRequirement)}
                  >
                    {themeData.stars && (
                      <div className="absolute inset-0">
                        <div className="absolute top-2 left-3 text-white text-xs">✦</div>
                        <div className="absolute top-4 right-5 text-white text-xs">✧</div>
                        <div className="absolute bottom-3 left-8 text-white text-xs">✦</div>
                        <div className="absolute bottom-5 right-3 text-white text-xs">✧</div>
                      </div>
                    )}
                    {themeData.neonGrid && (
                      <div
                        className="absolute inset-0"
                        style={{
                          backgroundImage: `
                            linear-gradient(${themeData.border} 1px, transparent 1px),
                            linear-gradient(90deg, ${themeData.border} 1px, transparent 1px)
                          `,
                          backgroundSize: '20px 20px',
                          opacity: 0.2
                        }}
                      />
                    )}
                    <div className="relative z-10 flex flex-col items-center justify-center h-full">
                      <span
                        className="font-bold text-sm capitalize"
                        style={{
                          color: themeName === 'ice' || themeName === 'desert' ? '#000' : '#fff',
                          textShadow: themeData.glowSnake ? `0 0 10px ${themeData.glowColor}` : 'none'
                        }}
                      >
                        {themeData.name}
                      </span>
                      {themeData.glowSnake && (
                        <span
                          className="text-xs mt-1"
                          style={{ color: themeName === 'ice' || themeName === 'desert' ? '#000' : '#fff' }}
                        >
                          ✨ Glow Effect
                        </span>
                      )}
                      {themeData.unlockRequirement && !unlockedModes.includes(themeData.unlockRequirement) && (
                        <span className="text-xs mt-1 text-yellow-400">
                          🔒 Unlock {themeData.unlockRequirement}
                        </span>
                      )}
                    </div>
                    {!isUnlocked && themeData.cost > 0 && meetsRequirement && (
                      <div className="absolute bottom-1 left-0 right-0 text-center z-20">
                        <span className="text-xs font-bold bg-black bg-opacity-70 px-2 py-1 rounded text-yellow-400">
                          {canAfford ? `⭐${themeData.cost}` : `🔒 ⭐${themeData.cost}`}
                        </span>
                      </div>
                    )}
                    {isUnlocked && themeData.cost > 0 && (
                      <div className="absolute top-1 right-1 text-green-400 text-sm bg-black bg-opacity-50 rounded-full w-6 h-6 flex items-center justify-center z-20">✓</div>
                    )}
                    {isUnlocked && themeName === 'dark' && (
                      <div className="absolute top-1 right-1 text-green-400 text-sm bg-black bg-opacity-50 rounded-full w-6 h-6 flex items-center justify-center z-20">✓</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border-2 border-purple-500 mb-6">
            <h2 className="text-xl font-bold text-purple-400 mb-4">Preview</h2>
            <div
              className="rounded-lg p-4 relative overflow-hidden"
              style={{
                backgroundColor: THEMES[theme].bg,
                border: `3px solid ${THEMES[theme].border}`
              }}
            >
              {THEMES[theme].stars && (
                <div className="absolute inset-0">
                  <div className="absolute top-2 left-3 text-white text-xs">✦</div>
                  <div className="absolute top-4 right-5 text-white text-xs">✧</div>
                  <div className="absolute top-6 left-12 text-white text-xs">✦</div>
                  <div className="absolute bottom-3 left-8 text-white text-xs">✦</div>
                  <div className="absolute bottom-5 right-3 text-white text-xs">✧</div>
                  <div className="absolute top-8 right-12 text-white text-xs">✦</div>
                </div>
              )}
              {THEMES[theme].neonGrid && (
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: `
                      linear-gradient(${THEMES[theme].border} 1px, transparent 1px),
                      linear-gradient(90deg, ${THEMES[theme].border} 1px, transparent 1px)
                    `,
                    backgroundSize: '20px 20px',
                    opacity: 0.3
                  }}
                />
              )}
              <div className="flex justify-center items-center space-x-2 relative z-10">
                {[0, 1, 2, 3, 4].map(i => (
                  <div
                    key={i}
                    className="w-12 h-12 rounded flex items-center justify-center text-2xl"
                    style={{
                      background: COLORS[snakeColor].isGradient ? COLORS[snakeColor].value : COLORS[snakeColor].value,
                      color: COLORS[snakeColor].textColor === 'black' ? 'black' : 'white',
                      boxShadow: THEMES[theme].glowSnake ? `0 0 20px ${THEMES[theme].glowColor}, 0 0 40px ${THEMES[theme].glowColor}` : 'none'
                    }}
                  >
                    {PATTERNS[snakePattern].symbol}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-center space-x-4">
            <button
              onClick={saveCustomization}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-lg transition"
            >
              Save & Return
            </button>
            <button
              onClick={() => setGameState('menu')}
              className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-8 rounded-lg transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'menu') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 p-4">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-8 relative">
            <SnakeLogo />
            <h1 className="text-6xl font-bold text-green-400 mb-2">SNAKE</h1>
            <p className="text-xl text-gray-400">Classic Arcade Game</p>
           
            <div className="absolute top-0 right-0 flex gap-2">
              <button
                onClick={() => setShowAchievementsMenu(true)}
                className="bg-yellow-600 hover:bg-yellow-700 p-3 rounded-lg transition group"
                title="Achievements"
              >
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                <p className="text-xs text-white mt-1 opacity-0 group-hover:opacity-100 transition">Achievements</p>
              </button>
             
              <button
                onClick={() => setGameState('customize')}
                className="bg-purple-600 hover:bg-purple-700 p-3 rounded-lg transition group"
                title="Customize Snake"
              >
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
                <p className="text-xs text-white mt-1 opacity-0 group-hover:opacity-100 transition">Customize</p>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="bg-gray-800 rounded-lg p-6 border-2 border-green-500">
              <h2 className="text-2xl font-bold text-green-400 mb-4">Details</h2>
              <div className="text-gray-300 space-y-3">
                <div>
                  <p className="font-semibold text-white">Controls:</p>
                  <p>Arrow Keys - Move snake</p>
                  <p>Space - Use life / Restart</p>
                </div>
                <div>
                  <p className="font-semibold text-white">Scoring:</p>
                  <p>+10 points per food</p>
                  <p>Earn 1 life every 150 points</p>
                </div>
                <div>
                  <p className="font-semibold text-white">Unlocks:</p>
                  <p className="text-sm">Classic 3000pts → Speed Mode</p>
                  <p className="text-sm">Hard 7500pts → Endless Modes</p>
                  <p className="text-sm">Endless Hard 10k → Uncompromising</p>
                  <p className="text-sm">Uncompromising 10k → Crazy Fruits</p>
                </div>
                <div>
                  <p className="font-semibold text-white">High Scores:</p>
                  <p className="text-sm">Classic: {highScores.classic}</p>
                  <p className="text-sm">Speed: {highScores.speed}</p>
                  <p className="text-sm">Hard: {highScores.hard}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border-2 border-green-500">
              <h2 className="text-2xl font-bold text-green-400 mb-4">Game Modes</h2>
              <div className="space-y-3">
                <button
                  onClick={() => startGame('classic')}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition"
                >
                  <div className="flex justify-between items-center">
                    <span>Classic Mode</span>
                    <span className="text-sm">✓</span>
                  </div>
                </button>
               
                <button
                  onClick={() => unlockedModes.includes('speed') && startGame('speed')}
                  className={`w-full font-bold py-3 px-6 rounded-lg transition ${
                    unlockedModes.includes('speed')
                      ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                  disabled={!unlockedModes.includes('speed')}
                >
                  <div className="flex justify-between items-center">
                    <span>Speed Mode</span>
                    {unlockedModes.includes('speed') ? (
                      <span className="text-sm">✓</span>
                    ) : (
                      <span className="text-xs">🔒 3000pts</span>
                    )}
                  </div>
                  {unlockedModes.includes('speed') && (
                    <p className="text-xs mt-1 text-left">130% start • +5% every 50pts • 7s slowdown/200pts</p>
                  )}
                </button>

                <button
                  onClick={() => unlockedModes.includes('hard') && startGame('hard')}
                  className={`w-full font-bold py-3 px-6 rounded-lg transition ${
                    unlockedModes.includes('hard')
                      ? 'bg-orange-600 hover:bg-orange-700 text-white'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                  disabled={!unlockedModes.includes('hard')}
                >
                  <div className="flex justify-between items-center">
                    <span>Hard Mode</span>
                    {unlockedModes.includes('hard') ? (
                      <span className="text-sm">✓</span>
                    ) : (
                      <span className="text-xs">🔒 Complete Speed</span>
                    )}
                  </div>
                  {unlockedModes.includes('hard') && (
                    <p className="text-xs mt-1 text-left">145% start • 200pts/life • 200% boost/800pts (6s)</p>
                  )}
                </button>
               
                <div className="border-t border-gray-700 pt-3 mt-3">
                  <p className="text-green-400 font-semibold mb-2 text-sm">Endless Modes</p>
                 
                  <button
                    onClick={() => unlockedModes.includes('endless-classic') && startGame('endless-classic')}
                    className={`w-full font-bold py-2 px-4 rounded-lg transition mb-2 ${
                      unlockedModes.includes('endless-classic')
                        ? 'bg-green-700 hover:bg-green-800 text-white'
                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    }`}
                    disabled={!unlockedModes.includes('endless-classic')}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Classic Endless</span>
                      {unlockedModes.includes('endless-classic') ? (
                        <span className="text-xs">✓</span>
                      ) : (
                        <span className="text-xs">🔒</span>
                      )}
                    </div>
                    {unlockedModes.includes('endless-classic') && (
                      <p className="text-xs mt-1 text-left">200pts/life</p>
                    )}
                  </button>
                 
                  <button
                    onClick={() => unlockedModes.includes('endless-speedy') && startGame('endless-speedy')}
                    className={`w-full font-bold py-2 px-4 rounded-lg transition mb-2 ${
                      unlockedModes.includes('endless-speedy')
                        ? 'bg-yellow-700 hover:bg-yellow-800 text-white'
                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    }`}
                    disabled={!unlockedModes.includes('endless-speedy')}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Speedy Endless</span>
                      {unlockedModes.includes('endless-speedy') ? (
                        <span className="text-xs">✓</span>
                      ) : (
                        <span className="text-xs">🔒</span>
                      )}
                    </div>
                    {unlockedModes.includes('endless-speedy') && (
                      <p className="text-xs mt-1 text-left">150% start • +10% every 50pts</p>
                    )}
                  </button>
                 
                  <button
                    onClick={() => unlockedModes.includes('endless-hard') && startGame('endless-hard')}
                    className={`w-full font-bold py-2 px-4 rounded-lg transition ${
                      unlockedModes.includes('endless-hard')
                        ? 'bg-orange-700 hover:bg-orange-800 text-white'
                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    }`}
                    disabled={!unlockedModes.includes('endless-hard')}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Hard Endless</span>
                      {unlockedModes.includes('endless-hard') ? (
                        <span className="text-xs">✓</span>
                      ) : (
                        <span className="text-xs">🔒</span>
                      )}
                    </div>
                    {unlockedModes.includes('endless-hard') && (
                      <p className="text-xs mt-1 text-left">145% start • 200% boost/700pts</p>
                    )}
                  </button>
                 
                  {!unlockedModes.includes('endless-classic') && (
                    <p className="text-xs text-gray-500 mt-2">Unlock at Hard Mode 7500pts</p>
                  )}
                </div>

                <div className="border-t border-gray-700 pt-3 mt-3">
                  <p className="text-red-400 font-semibold mb-2 text-sm">Ultimate Challenge</p>
                 
                  <button
                    onClick={() => unlockedModes.includes('uncompromising') && startGame('uncompromising')}
                    className={`w-full font-bold py-3 px-6 rounded-lg transition ${
                      unlockedModes.includes('uncompromising')
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    }`}
                    disabled={!unlockedModes.includes('uncompromising')}
                  >
                    <div className="flex justify-between items-center">
                      <span>Uncompromising Mode</span>
                      {unlockedModes.includes('uncompromising') ? (
                        <span className="text-sm">✓</span>
                      ) : (
                        <span className="text-xs">🔒 Endless Hard 10k</span>
                      )}
                    </div>
                    {unlockedModes.includes('uncompromising') && (
                      <p className="text-xs mt-1 text-left">175% start • 350pts/life • 250% boost/250pts • WIN at 10000pts!</p>
                    )}
                  </button>
                 
                  {!unlockedModes.includes('uncompromising') && (
                    <p className="text-xs text-gray-500 mt-2">Unlock at Endless Hard 10000pts</p>
                  )}
                </div>

                <div className="border-t border-gray-700 pt-3 mt-3">
                  <p className="text-purple-400 font-semibold mb-2 text-sm">🍇 Crazy Fruits Mode</p>
                 
                  <button
                    onClick={() => unlockedModes.includes('crazy-fruits') && startGame('crazy-fruits')}
                    className={`w-full font-bold py-3 px-6 rounded-lg transition ${
                      unlockedModes.includes('crazy-fruits')
                        ? 'bg-purple-600 hover:bg-purple-700 text-white'
                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    }`}
                    disabled={!unlockedModes.includes('crazy-fruits')}
                  >
                    <div className="flex justify-between items-center">
                      <span>Crazy Fruits</span>
                      {unlockedModes.includes('crazy-fruits') ? (
                        <span className="text-sm">✓</span>
                      ) : (
                        <span className="text-xs">🔒 Complete Uncompromising</span>
                      )}
                    </div>
                    {unlockedModes.includes('crazy-fruits') && (
                      <p className="text-xs mt-1 text-left">140% speed • Special fruits with unique effects!</p>
                    )}
                  </button>
                 
                  {!unlockedModes.includes('crazy-fruits') && (
                    <p className="text-xs text-gray-500 mt-2">Unlock at Uncompromising Mode 10000pts</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <p className="text-gray-400 text-sm">Press ESC or close window to quit</p>
          </div>
        </div>
       
        {showAchievementsMenu && (
          <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto border-4 border-yellow-500">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-yellow-400">🏆 Achievements</h2>
                <button
                  onClick={() => setShowAchievementsMenu(false)}
                  className="text-white hover:text-gray-300 text-3xl font-bold"
                >
                  ×
                </button>
              </div>
             
              <div className="space-y-4">
                {ACHIEVEMENTS.map((achievement) => {
                  const isUnlocked = achievements.includes(achievement.id);
                 
                  return (
                    <div
                      key={achievement.id}
                      className={`p-4 rounded-lg border-2 ${
                        isUnlocked
                          ? 'bg-yellow-900 bg-opacity-30 border-yellow-500'
                          : 'bg-gray-700 border-gray-600'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="text-4xl">
                          {isUnlocked ? '🏆' : '🔒'}
                        </div>
                        <div className="flex-1">
                          <h3 className={`text-lg font-bold ${
                            isUnlocked ? 'text-yellow-400' : 'text-gray-400'
                          }`}>
                            {achievement.name}
                          </h3>
                          <p className={`text-sm ${
                            isUnlocked ? 'text-gray-300' : 'text-gray-500'
                          }`}>
                            {achievement.desc}
                          </p>
                          <p className="text-yellow-400 font-bold mt-2">
                            Reward: {achievement.reward} ⭐
                          </p>
                        </div>
                        {isUnlocked && (
                          <div className="text-green-400 text-2xl">✓</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
             
              <div className="mt-6 text-center">
                <button
                  onClick={() => setShowAchievementsMenu(false)}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-8 rounded-lg transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4">
      <div className="mb-4 text-center relative w-full max-w-4xl">
        <button
          onClick={togglePause}
          className="absolute top-0 right-0 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition"
          disabled={gameOver || showRevive}
        >
          {isPaused ? '▶ Resume' : '⏸ Pause'}
        </button>
       
        <h1 className="text-4xl font-bold text-green-400 mb-2">
          {gameMode === 'classic' && 'Classic Mode'}
          {gameMode === 'speed' && 'Speed Mode'}
          {gameMode === 'hard' && 'Hard Mode'}
          {gameMode === 'endless-classic' && 'Classic Endless'}
          {gameMode === 'endless-speedy' && 'Speedy Endless'}
          {gameMode === 'endless-hard' && 'Hard Endless'}
          {gameMode === 'uncompromising' && '💀 UNCOMPROMISING MODE 💀'}
        </h1>
        <p className="text-xl text-white">Score: {score}</p>
        {gameMode === 'crazy-fruits' && (
          <p className="text-sm text-purple-400 mt-1">Next: {FRUIT_TYPES[currentFruitType].emoji} {FRUIT_TYPES[currentFruitType].name}</p>
        )}
        {gameMode === 'uncompromising' && (
          <p className="text-lg text-red-400 mt-1">Goal: 10000 pts to WIN!</p>
        )}
        <p className="text-lg text-yellow-400 mt-1">Lives: {lives} 💛</p>
        {(gameMode === 'speed' || gameMode === 'endless-speedy') && isSlowdown && (
          <p className="text-lg text-blue-400 mt-1">⏱️ SLOWDOWN ACTIVE!</p>
        )}
        {(gameMode === 'hard' || gameMode === 'endless-hard') && isSpeedBoost && (
          <p className="text-lg text-red-400 mt-1">⚡ SPEED BOOST! 200%</p>
        )}
        {gameMode === 'uncompromising' && isSpeedBoost && (
          <p className="text-lg text-red-400 mt-1">⚡ EXTREME BOOST! 250%</p>
        )}
        {gameMode === 'crazy-fruits' && fruitEffectActive === 'slow' && (
          <p className="text-lg text-blue-400 mt-1">🍋 Slowed Down!</p>
        )}
        {gameMode === 'crazy-fruits' && fruitEffectActive === 'speed' && (
          <p className="text-lg text-orange-400 mt-1">🔥 Speed Boost!</p>
        )}
      </div>

      <div className="flex flex-row items-start justify-center gap-0">
        <div
          className="relative rounded-lg overflow-hidden"
          style={{
            width: GRID_SIZE * CELL_SIZE,
            height: GRID_SIZE * CELL_SIZE,
            backgroundColor: THEMES[theme].bg,
            border: `4px solid ${THEMES[theme].border}`
          }}
        >
          {THEMES[theme].stars && (
            <div className="absolute inset-0 pointer-events-none z-0">
              <div className="absolute top-10 left-15 text-white text-xs animate-pulse">✦</div>
              <div className="absolute top-30 right-25 text-white text-xs animate-pulse" style={{animationDelay: '0.5s'}}>✧</div>
              <div className="absolute top-60 left-40 text-white text-xs animate-pulse" style={{animationDelay: '1s'}}>✦</div>
              <div className="absolute bottom-50 left-80 text-white text-xs animate-pulse" style={{animationDelay: '1.5s'}}>✦</div>
              <div className="absolute bottom-100 right-60 text-white text-xs animate-pulse" style={{animationDelay: '2s'}}>✧</div>
              <div className="absolute top-120 right-100 text-white text-xs animate-pulse" style={{animationDelay: '0.7s'}}>✦</div>
              <div className="absolute top-200 left-120 text-white text-xs animate-pulse" style={{animationDelay: '1.3s'}}>✧</div>
              <div className="absolute bottom-150 right-140 text-white text-xs animate-pulse" style={{animationDelay: '1.8s'}}>✦</div>
            </div>
          )}
          {THEMES[theme].neonGrid && (
            <div
              className="absolute inset-0 pointer-events-none z-0"
              style={{
                backgroundImage: `
                  linear-gradient(${THEMES[theme].border} 1px, transparent 1px),
                  linear-gradient(90deg, ${THEMES[theme].border} 1px, transparent 1px)
                `,
                backgroundSize: '20px 20px',
                opacity: 0.2
              }}
            />
          )}
          {snake.map((segment, i) => (
            <div
              key={i}
              className="flex items-center justify-center"
              style={{
                position: 'absolute',
                left: segment[0] * CELL_SIZE,
                top: segment[1] * CELL_SIZE,
                width: CELL_SIZE,
                height: CELL_SIZE,
                background: COLORS[snakeColor].isGradient ? COLORS[snakeColor].value : COLORS[snakeColor].value,
                borderRadius: i === 0 ? '4px' : '2px',
                fontSize: '14px',
                fontWeight: 'bold',
                color: COLORS[snakeColor].textColor === 'black' ? 'black' : 'white',
                boxShadow: THEMES[theme].glowSnake ? `0 0 15px ${THEMES[theme].glowColor}, 0 0 30px ${THEMES[theme].glowColor}` : 'none',
                zIndex: 10
              }}
            >
              {PATTERNS[snakePattern].symbol}
            </div>
          ))}

          <div
            className="rounded-full"
            style={{
              position: 'absolute',
              left: food[0] * CELL_SIZE + 2,
              top: food[1] * CELL_SIZE + 2,
              width: CELL_SIZE - 4,
              height: CELL_SIZE - 4,
              backgroundColor: FRUIT_TYPES[currentFruitType].color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              zIndex: 10,
              boxShadow: THEMES[theme].darkMode ? `0 0 20px ${FRUIT_TYPES[currentFruitType].color}, 0 0 40px ${FRUIT_TYPES[currentFruitType].color}` : 'none'
            }}
          >
            {gameMode === 'crazy-fruits' && FRUIT_TYPES[currentFruitType].emoji}
          </div>

          {isPaused && !gameOver && !showRevive && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-80 z-20">
              <div className="text-center">
                <p className="text-white text-3xl font-bold mb-4">⏸ PAUSED</p>
                <p className="text-gray-300 text-lg">Press P or click Resume to continue</p>
              </div>
            </div>
          )}

          {!isPlaying && !gameOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 z-20">
              <p className="text-white text-xl">Press Arrow Key to Start</p>
            </div>
          )}

          {showRevive && lives > 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-80 z-20">
              <div className="text-center">
                <p className="text-yellow-400 text-3xl font-bold mb-4">💛 Second Chance! 💛</p>
                <p className="text-white text-xl mb-4">Use a life to continue?</p>
                <button
                  onClick={() => {
                    setLives(l => l - 1);
                    setShowRevive(false);
                    setSnake(INITIAL_SNAKE);
                    setDirection(INITIAL_DIRECTION);
                  }}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-6 rounded"
                >
                  Use Life (Press Space)
                </button>
              </div>
            </div>
          )}

          {gameOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-80 z-20">
              <div className="text-center">
                {gameMode === 'uncompromising' && score >= 10000 ? (
                  <>
                    <p className="text-yellow-400 text-4xl font-bold mb-4">🎉 VICTORY! 🎉</p>
                    <p className="text-green-400 text-2xl mb-4">YOU CONQUERED UNCOMPROMISING MODE!</p>
                    <p className="text-white text-xl mb-4">Final Score: {score}</p>
                  </>
                ) : (
                  <>
                    <p className="text-red-400 text-3xl font-bold mb-4">Game Over!</p>
                    <p className="text-white text-xl mb-4">Final Score: {score}</p>
                    {score > highScores[gameMode] && (
                      <p className="text-yellow-400 text-lg mb-4">🏆 NEW HIGH SCORE! 🏆</p>
                    )}
                  </>
                )}
                <div className="space-x-4">
                  <button
                    onClick={resetGame}
                    className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded"
                  >
                    Play Again
                  </button>
                  <button
                    onClick={quitToMenu}
                    className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded"
                  >
                    Main Menu
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-gray-800 rounded-lg p-3 border-2 border-green-500 h-[400px] flex flex-col justify-between">
          <p className="text-center text-gray-400 text-xs mb-2">Controls</p>
          <div className="flex-1 flex flex-col justify-center gap-2">
            <button
              onTouchStart={() => handleDirectionChange({ x: 0, y: -1 })}
              onClick={() => handleDirectionChange({ x: 0, y: -1 })}
              className="bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-bold py-3 rounded text-xl mx-auto"
            >
              ▲
            </button>
            <div className="flex gap-2 justify-center">
              <button
                onTouchStart={() => handleDirectionChange({ x: -1, y: 0 })}
                onClick={() => handleDirectionChange({ x: -1, y: 0 })}
                className="bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-bold py-3 px-6 rounded text-xl"
              >
                ◀
              </button>
              <button
                onTouchStart={handleSpacePress}
                onClick={handleSpacePress}
                className="bg-yellow-600 hover:bg-yellow-700 active:bg-yellow-800 text-white font-bold py-3 px-4 rounded text-sm"
              >
                SPC
              </button>
              <button
                onTouchStart={() => handleDirectionChange({ x: 1, y: 0 })}
                onClick={() => handleDirectionChange({ x: 1, y: 0 })}
                className="bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-bold py-3 px-6 rounded text-xl"
              >
                ▶
              </button>
            </div>
            <button
              onTouchStart={() => handleDirectionChange({ x: 0, y: 1 })}
              onClick={() => handleDirectionChange({ x: 0, y: 1 })}
              className="bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-bold py-3 rounded text-xl mx-auto"
            >
              ▼
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-center">
        <button
          onClick={quitToMenu}
          className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded text-sm"
        >
          Back to Menu
        </button>
      </div>

      {showAchievement && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-gray-900 px-6 py-4 rounded-lg shadow-lg z-50 animate-bounce">
          <p className="text-xl font-bold">🏆 Achievement Unlocked!</p>
          <p className="text-lg">{showAchievement.name}</p>
          <p className="text-sm">{showAchievement.desc}</p>
          <p className="text-lg font-bold mt-2">+{showAchievement.reward} ⭐ Star Points!</p>
        </div>
      )}
    </div>
  );
}
