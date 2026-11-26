import {Volume2} from 'lucide-react';
import {motion} from 'motion/react';
import React, {useEffect, useRef, useState} from 'react';
import {soundFx} from '../utils/soundFx';

interface MovingRobotProps {
  compact?: boolean;
  greeting?: string;
  autoSpeakOnMount?: boolean;
  pointToLogin?: boolean;
}

type RobotAction = 'flying' | 'dancing' | 'sitting' | 'playing' | 'spinning' | 'cheering';

const ACTION_ORDER: RobotAction[] = [
  'flying',
  'dancing',
  'sitting',
  'playing',
  'spinning',
  'cheering',
];

const ACTION_META: Record<
  RobotAction,
  {label: string; line: string}
> = {
  flying: {
    label: 'Flying & Exploring',
    line: 'Hey! Welcome explorer! I am LEAVIEN AI. Just log in to your account!',
  },
  dancing: {
    label: 'Dancing',
    line: 'Look at me dance! Learning General Math is way more fun together!',
  },
  sitting: {
    label: 'Sitting & Relaxing',
    line: 'Taking a quick cozy sit on my cosmic ring—ready whenever you are!',
  },
  playing: {
    label: 'Playing with Math Orbs',
    line: 'Wheee! Catching math puzzles and discovering new tricks!',
  },
  spinning: {
    label: 'Twirling in Space',
    line: 'Spinning through Grade 11 functions, logs, and logic—woo-hoo!',
  },
  cheering: {
    label: 'Cheering for You',
    line: 'You got this, explorer! Tap Log In to start your math journey!',
  },
};

export const MovingRobot: React.FC<MovingRobotProps> = ({
  compact = false,
  greeting,
  autoSpeakOnMount = false,
  pointToLogin = false,
}) => {
  const [actionIdx, setActionIdx] = useState(0);
  const [isTalking, setIsTalking] = useState(false);
  const [clickBurst, setClickBurst] = useState(0);
  const hasSpokenRef = useRef(false);

  const action = ACTION_ORDER[actionIdx];
  const meta = ACTION_META[action];
  const activeLine = actionIdx === 0 && greeting ? greeting : meta.line;

  useEffect(() => {
    if (!autoSpeakOnMount) return;
    hasSpokenRef.current = false;

    const triggerSpeak = () => {
      if (hasSpokenRef.current) return;
      soundFx.exploreDiscovery();
      soundFx.speak(greeting ?? ACTION_META.flying.line, {
        onStart: () => {
          hasSpokenRef.current = true;
          setIsTalking(true);
        },
        onEnd: () => setIsTalking(false),
      });
    };

    const timer = window.setTimeout(triggerSpeak, 220);

    const handleFirstGesture = () => {
      if (!hasSpokenRef.current) {
        triggerSpeak();
      }
      window.removeEventListener('pointerdown', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };

    window.addEventListener('pointerdown', handleFirstGesture, {passive: true});
    window.addEventListener('keydown', handleFirstGesture, {passive: true});

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pointerdown', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
      soundFx.stopSpeaking();
    };
  }, [autoSpeakOnMount, greeting]);

  const handleTapRobot = () => {
    const nextIdx = (actionIdx + 1) % ACTION_ORDER.length;
    const nextAction = ACTION_ORDER[nextIdx];
    const nextLine = nextIdx === 0 && greeting ? greeting : ACTION_META[nextAction].line;

    setActionIdx(nextIdx);
    setClickBurst((c) => c + 1);
    hasSpokenRef.current = true;
    setIsTalking(true);

    if (nextAction === 'dancing') {
      soundFx.danceBeat();
    } else if (nextAction === 'sitting') {
      soundFx.sitChime();
    } else if (nextAction === 'cheering' || nextAction === 'spinning') {
      soundFx.celebrate();
    } else {
      soundFx.exploreDiscovery();
    }

    soundFx.speak(nextLine, {
      onStart: () => setIsTalking(true),
      onEnd: () => setIsTalking(false),
    });
  };

  // Dynamic body motion choreography per action
  const bodyAnimate = (() => {
    switch (action) {
      case 'dancing':
        return {
          x: [-10, 10, -10, 10, -10],
          y: [0, -10, 0, -12, 0],
          rotate: [-10, 10, -10, 10, -10],
          scaleY: [1, 0.94, 1.04, 0.94, 1],
        };
      case 'sitting':
        return {
          x: 0,
          y: [16, 12, 16],
          rotate: [-2, 2, -2],
          scaleY: 1,
        };
      case 'playing':
        return {
          x: [-12, 12, -8, 10, -12],
          y: [0, -16, -2, -18, 0],
          rotate: [-12, 12, -6, 8, -12],
          scaleX: [1, 0.93, 1, 0.93, 1],
        };
      case 'spinning':
        return {
          x: 0,
          y: [0, -22, 0],
          rotate: [0, 360],
          scale: [1, 1.08, 1],
        };
      case 'cheering':
        return {
          x: 0,
          y: [0, -20, -4, -18, 0],
          rotate: [-5, 5, -5],
          scale: [1, 1.06, 1],
        };
      case 'flying':
      default:
        return compact
          ? {y: [0, -8, 0], rotate: [-3, 3, -3]}
          : {
              x: [-14, 14, -10, 12, -14],
              y: [0, -15, -4, -17, 0],
              rotate: [-9, 10, -7, 9, -9],
              scaleX: [1, 0.92, 1, 0.93, 1],
            };
    }
  })();

  const bodyTransition = (() => {
    switch (action) {
      case 'dancing':
        return {duration: 1.35, repeat: Infinity, ease: 'easeInOut' as const};
      case 'sitting':
        return {duration: 2.6, repeat: Infinity, ease: 'easeInOut' as const};
      case 'playing':
        return {duration: 1.9, repeat: Infinity, ease: 'easeInOut' as const};
      case 'spinning':
        return {duration: 1.15, repeat: Infinity, ease: 'easeInOut' as const};
      case 'cheering':
        return {duration: 1.2, repeat: Infinity, ease: 'easeInOut' as const};
      case 'flying':
      default:
        return compact
          ? {duration: 2.6, repeat: Infinity, ease: 'easeInOut' as const}
          : {duration: 4.2, repeat: Infinity, ease: 'easeInOut' as const};
    }
  })();

  return (
    <div className="relative flex flex-col items-center justify-center select-none">
      {/* Speech Bubble + Mode Label when not compact */}
      {!compact && (
        <motion.button
          key={`bubble-${clickBurst}`}
          type="button"
          onClick={handleTapRobot}
          initial={{opacity: 0, y: -4, scale: 0.97}}
          animate={{opacity: 1, y: 0, scale: 1}}
          whileHover={{scale: 1.02}}
          whileTap={{scale: 0.98}}
          className="relative mb-2 max-w-sm rounded-2xl border border-cyan-300/45 bg-[#0d1c54]/95 px-4 py-2.5 text-center shadow-lg shadow-cyan-500/20 cursor-pointer"
        >
          <div className="flex items-center justify-center gap-2 text-xs font-semibold leading-snug text-white">
            <Volume2
              className={`h-3.5 w-3.5 shrink-0 ${
                isTalking ? 'text-pink-300 animate-pulse' : 'text-cyan-300'
              }`}
              aria-hidden="true"
            />
            <span>“{activeLine}”</span>
          </div>
          <div className="mt-1 text-[11px] font-medium text-cyan-300/90">
            {meta.label} · Click me to see another move!
          </div>
          <span
            aria-hidden="true"
            className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-cyan-300/45 bg-[#0d1c54]"
          />
        </motion.button>
      )}

      {/* Glowing Cosmic Aura */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute rounded-full bg-gradient-to-tr from-pink-500/25 via-cyan-400/20 to-blue-500/30 blur-2xl ${
          compact ? 'h-28 w-28' : 'h-56 w-56'
        }`}
      />

      {/* Action-Specific Floating Elements */}
      {!compact && action === 'dancing' && (
        <>
          <motion.span
            aria-hidden="true"
            animate={{y: [0, -14, 0], rotate: [-10, 12, -10]}}
            transition={{duration: 1.2, repeat: Infinity}}
            className="pointer-events-none absolute top-16 left-2 text-lg font-bold text-pink-300"
          >
            ♪
          </motion.span>
          <motion.span
            aria-hidden="true"
            animate={{y: [0, -16, 0], rotate: [10, -12, 10]}}
            transition={{duration: 1.4, repeat: Infinity, delay: 0.3}}
            className="pointer-events-none absolute top-14 right-3 text-lg font-bold text-cyan-300"
          >
            ♫
          </motion.span>
        </>
      )}

      {!compact && action === 'playing' && (
        <>
          <motion.span
            aria-hidden="true"
            animate={{y: [0, -24, 0], x: [-6, 8, -6]}}
            transition={{duration: 1.1, repeat: Infinity}}
            className="pointer-events-none absolute top-14 left-4 flex h-6 w-6 items-center justify-center rounded-full bg-pink-500/80 font-mono text-xs font-bold text-white shadow"
          >
            π
          </motion.span>
          <motion.span
            aria-hidden="true"
            animate={{y: [-16, 4, -16], x: [6, -6, 6]}}
            transition={{duration: 1.1, repeat: Infinity, delay: 0.35}}
            className="pointer-events-none absolute top-14 right-4 flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/80 font-mono text-xs font-bold text-white shadow"
          >
            ∞
          </motion.span>
        </>
      )}

      {!compact && action === 'cheering' && (
        <motion.span
          aria-hidden="true"
          animate={{y: [0, -14, 0], scale: [0.9, 1.25, 0.9]}}
          transition={{duration: 1, repeat: Infinity}}
          className="pointer-events-none absolute top-14 right-6 text-lg text-pink-400"
        >
          ★
        </motion.span>
      )}

      {/* Floating Math Symbols */}
      <motion.span
        aria-hidden="true"
        animate={{y: [0, -8, 0], x: [0, 4, 0], opacity: [0.7, 1, 0.7]}}
        transition={{duration: 2.8, repeat: Infinity, ease: 'easeInOut'}}
        className="pointer-events-none absolute top-20 right-4 font-mono text-base font-bold text-sky-300 drop-shadow-[0_0_8px_rgba(56,189,248,0.65)]"
      >
        √
      </motion.span>
      <motion.span
        aria-hidden="true"
        animate={{y: [0, 7, 0], x: [0, -4, 0], opacity: [0.65, 1, 0.65]}}
        transition={{duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.4}}
        className="pointer-events-none absolute bottom-14 left-2 font-mono text-sm font-bold text-pink-300"
      >
        f(x)
      </motion.span>
      <motion.span
        aria-hidden="true"
        animate={{y: [0, -6, 0], opacity: [0.7, 1, 0.7]}}
        transition={{duration: 2.7, repeat: Infinity, ease: 'easeInOut', delay: 0.8}}
        className="pointer-events-none absolute bottom-14 right-4 font-mono text-base font-bold text-cyan-300"
      >
        +
      </motion.span>

      {/* Interactive Girl LA Robot */}
      <motion.button
        type="button"
        onClick={handleTapRobot}
        aria-label={`LEAVIEN AI robot (${meta.label}) — click to see another move`}
        animate={bodyAnimate}
        transition={bodyTransition}
        whileHover={{scale: 1.06}}
        whileTap={{scale: 0.93}}
        className="relative cursor-pointer focus:outline-none"
      >
        <svg
          viewBox="0 0 210 232"
          className={compact ? 'h-28 w-28 sm:h-32 sm:w-32' : 'h-48 w-48 sm:h-56 sm:w-56'}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Glowing Hover Ring / Seat Cushion */}
          <motion.ellipse
            cx="102"
            cy={action === 'sitting' ? 182 : 205}
            rx={action === 'sitting' ? 66 : 58}
            ry={action === 'sitting' ? 12 : 8}
            stroke="#38bdf8"
            strokeWidth="2.5"
            fill={action === 'sitting' ? '#ec4899' : '#0284c7'}
            fillOpacity={action === 'sitting' ? 0.25 : 0.18}
            animate={{scaleX: [0.9, 1.08, 0.9], opacity: [0.55, 0.95, 0.55]}}
            transition={{duration: 1.8, repeat: Infinity, ease: 'easeInOut'}}
            style={{transformOrigin: '102px 195px'}}
          />

          {/* Flying Rocket Jet Flames (Hidden while sitting) */}
          {action !== 'sitting' && (
            <>
              <motion.g
                animate={{scaleY: [0.85, 1.28, 0.9], opacity: [0.8, 1, 0.8]}}
                transition={{duration: 0.35, repeat: Infinity, ease: 'easeInOut'}}
                style={{transformOrigin: '86px 175px'}}
              >
                <path d="M79 175 L86 197 L93 175 Z" fill="#38bdf8" />
                <path d="M82 175 L86 190 L90 175 Z" fill="#f472b6" />
              </motion.g>
              <motion.g
                animate={{scaleY: [1.18, 0.8, 1.18], opacity: [0.8, 1, 0.8]}}
                transition={{duration: 0.35, repeat: Infinity, ease: 'easeInOut', delay: 0.12}}
                style={{transformOrigin: '118px 175px'}}
              >
                <path d="M111 175 L118 197 L125 175 Z" fill="#38bdf8" />
                <path d="M114 175 L118 189 L122 175 Z" fill="#f472b6" />
              </motion.g>
            </>
          )}

          {/* Twin Space-Bun Pigtails */}
          <motion.g
            animate={{rotate: action === 'dancing' ? [-10, 10, -10] : [-5, 6, -5]}}
            transition={{duration: action === 'dancing' ? 0.7 : 1.7, repeat: Infinity, ease: 'easeInOut'}}
            style={{transformOrigin: '50px 58px'}}
          >
            <circle cx="42" cy="54" r="14" fill="#ec4899" stroke="#f9a8d4" strokeWidth="2.5" />
            <circle cx="40" cy="52" r="5" fill="#fbcfe8" fillOpacity="0.6" />
          </motion.g>
          <motion.g
            animate={{rotate: action === 'dancing' ? [10, -10, 10] : [5, -6, 5]}}
            transition={{duration: action === 'dancing' ? 0.7 : 1.7, repeat: Infinity, ease: 'easeInOut'}}
            style={{transformOrigin: '154px 58px'}}
          >
            <circle cx="162" cy="54" r="14" fill="#ec4899" stroke="#f9a8d4" strokeWidth="2.5" />
            <circle cx="164" cy="52" r="5" fill="#fbcfe8" fillOpacity="0.6" />
          </motion.g>

          {/* Dual Antennae */}
          <motion.g
            animate={{rotate: [-4, 4, -4]}}
            transition={{duration: 2, repeat: Infinity, ease: 'easeInOut'}}
            style={{transformOrigin: '76px 38px'}}
          >
            <line x1="76" y1="38" x2="70" y2="17" stroke="#93c5fd" strokeWidth="3.5" strokeLinecap="round" />
            <circle cx="69" cy="14" r="5.5" fill="#38bdf8" />
          </motion.g>
          <motion.g
            animate={{rotate: [4, -4, 4]}}
            transition={{duration: 2, repeat: Infinity, ease: 'easeInOut'}}
            style={{transformOrigin: '128px 38px'}}
          >
            <line x1="128" y1="38" x2="134" y2="17" stroke="#93c5fd" strokeWidth="3.5" strokeLinecap="round" />
            <circle cx="135" cy="14" r="5.5" fill="#38bdf8" />
          </motion.g>

          {/* Pink Cyber-Bow */}
          <path d="M102 35 L88 26 Q84 34 90 40 Z" fill="#f472b6" stroke="#fbcfe8" strokeWidth="1.5" />
          <path d="M102 35 L116 26 Q120 34 114 40 Z" fill="#f472b6" stroke="#fbcfe8" strokeWidth="1.5" />
          <circle cx="102" cy="34" r="4.5" fill="#fdf2f8" stroke="#ec4899" strokeWidth="2" />

          {/* Head Shell */}
          <rect x="52" y="36" width="100" height="68" rx="30" fill="#f8fafc" stroke="#2563eb" strokeWidth="4" />

          {/* Visor Screen */}
          <rect x="61" y="48" width="82" height="46" rx="18" fill="#071133" />

          {/* Eyes + Eyelashes */}
          <g>
            <path d="M72 60 L67 56 M77 58 L75 53 M82 59 L82 54" stroke="#f9a8d4" strokeWidth="2" strokeLinecap="round" />
            <path d="M122 59 L122 54 M127 58 L129 53 M132 60 L137 56" stroke="#f9a8d4" strokeWidth="2" strokeLinecap="round" />
            {action === 'sitting' ? (
              <>
                <path d="M72 71 Q79 62 86 71" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" />
                <path d="M118 71 Q125 62 132 71" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" />
              </>
            ) : (
              <>
                <motion.path
                  d="M73 63 L85 69 L73 75"
                  stroke="#38bdf8"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  animate={{scaleY: [1, 0.85, 1]}}
                  transition={{duration: 2, repeat: Infinity}}
                  style={{transformOrigin: '79px 69px'}}
                />
                <motion.path
                  d="M131 63 L119 69 L131 75"
                  stroke="#38bdf8"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  animate={{scaleY: [1, 0.85, 1]}}
                  transition={{duration: 2, repeat: Infinity}}
                  style={{transformOrigin: '125px 69px'}}
                />
              </>
            )}
          </g>

          {/* Rosy Cheeks */}
          <ellipse cx="72" cy="79" rx="5.5" ry="3" fill="#f472b6" fillOpacity="0.65" />
          <ellipse cx="132" cy="79" rx="5.5" ry="3" fill="#f472b6" fillOpacity="0.65" />

          {/* Talking / Smiling Mouth */}
          <motion.path
            d="M91 79 Q102 92 113 79 Z"
            fill="#fb7185"
            stroke="#f43f5e"
            strokeWidth="1.5"
            animate={
              isTalking
                ? {scaleY: [0.55, 1.35, 0.65, 1.25, 0.6], scaleX: [1, 0.9, 1.05, 0.95, 1]}
                : {scaleY: [0.92, 1.1, 0.92]}
            }
            transition={
              isTalking
                ? {duration: 0.42, repeat: Infinity, ease: 'easeInOut'}
                : {duration: 2.2, repeat: Infinity, ease: 'easeInOut'}
            }
            style={{transformOrigin: '102px 82px'}}
          />

          {/* Left Arm per Action */}
          <motion.g
            animate={
              action === 'dancing'
                ? {rotate: [-35, 20, -35]}
                : action === 'sitting'
                ? {rotate: [18, 28, 18]}
                : action === 'playing'
                ? {rotate: [-28, 10, -28]}
                : {rotate: [0, -20, 8, -16, 0]}
            }
            transition={{
              duration: action === 'dancing' ? 0.68 : 1.4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{transformOrigin: '66px 120px'}}
          >
            <path d="M66 120 L36 86" stroke="#e2e8f0" strokeWidth="12" strokeLinecap="round" />
            <circle cx="33" cy="81" r="9.5" fill="#f8fafc" stroke="#2563eb" strokeWidth="3" />
          </motion.g>

          {/* Legs: Sitting Forward & Swinging vs Flying/Dancing */}
          {action === 'sitting' ? (
            <>
              <motion.g
                animate={{rotate: [-8, 10, -8]}}
                transition={{duration: 1.4, repeat: Infinity, ease: 'easeInOut'}}
                style={{transformOrigin: '84px 158px'}}
              >
                <path d="M84 156 L66 172" stroke="#f8fafc" strokeWidth="14" strokeLinecap="round" />
                <path d="M84 156 L66 172" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
                <circle cx="62" cy="175" r="7" fill="#ec4899" />
              </motion.g>
              <motion.g
                animate={{rotate: [10, -8, 10]}}
                transition={{duration: 1.4, repeat: Infinity, ease: 'easeInOut'}}
                style={{transformOrigin: '120px 158px'}}
              >
                <path d="M120 156 L138 172" stroke="#f8fafc" strokeWidth="14" strokeLinecap="round" />
                <path d="M120 156 L138 172" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
                <circle cx="142" cy="175" r="7" fill="#ec4899" />
              </motion.g>
            </>
          ) : (
            <>
              <motion.g
                animate={{rotate: action === 'dancing' ? [-14, 14, -14] : [-5, 6, -5]}}
                transition={{duration: action === 'dancing' ? 0.68 : 1.5, repeat: Infinity, ease: 'easeInOut'}}
                style={{transformOrigin: '86px 158px'}}
              >
                <rect x="78" y="156" width="16" height="21" rx="8" fill="#f8fafc" stroke="#2563eb" strokeWidth="3" />
                <rect x="77" y="168" width="18" height="8" rx="4" fill="#ec4899" />
              </motion.g>
              <motion.g
                animate={{rotate: action === 'dancing' ? [14, -14, 14] : [6, -5, 6]}}
                transition={{duration: action === 'dancing' ? 0.68 : 1.5, repeat: Infinity, ease: 'easeInOut'}}
                style={{transformOrigin: '118px 158px'}}
              >
                <rect x="110" y="156" width="16" height="21" rx="8" fill="#f8fafc" stroke="#2563eb" strokeWidth="3" />
                <rect x="109" y="168" width="18" height="8" rx="4" fill="#ec4899" />
              </motion.g>
            </>
          )}

          {/* Torso + Girl Skirt-Armor */}
          <path
            d="M68 112 C68 106 136 106 136 112 L144 156 C144 162 60 162 60 156 Z"
            fill="#f8fafc"
            stroke="#2563eb"
            strokeWidth="3.5"
          />
          <path d="M65 147 Q102 152 139 147" stroke="#ec4899" strokeWidth="4" strokeLinecap="round" />

          {/* Chest Screen with Glowing "LA" */}
          <rect x="76" y="114" width="52" height="31" rx="11" fill="#0f296e" stroke="#38bdf8" strokeWidth="1.5" />
          <motion.text
            x="102"
            y="136"
            textAnchor="middle"
            fill="#38bdf8"
            fontSize="18"
            fontWeight="800"
            fontFamily="sans-serif"
            animate={{opacity: [0.85, 1, 0.85]}}
            transition={{duration: 1.6, repeat: Infinity}}
          >
            LA
          </motion.text>

          {/* Right Arm: Pointing Down on flying/cheering when pointToLogin=true, or Dancing/Sitting/Playing */}
          {pointToLogin && (action === 'flying' || action === 'cheering') ? (
            <motion.g
              animate={{y: [0, 6, 0], rotate: [-2, 3, -2]}}
              transition={{duration: 1.15, repeat: Infinity, ease: 'easeInOut'}}
              style={{transformOrigin: '136px 120px'}}
            >
              <path d="M136 120 L156 164" stroke="#e2e8f0" strokeWidth="12" strokeLinecap="round" />
              <circle cx="158" cy="168" r="8.5" fill="#f8fafc" stroke="#2563eb" strokeWidth="2.8" />
              <path d="M158 175 L158 196" stroke="#f8fafc" strokeWidth="6" strokeLinecap="round" />
              <path d="M158 175 L158 196" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
              <motion.path
                d="M151 203 L158 213 L165 203"
                stroke="#38bdf8"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                animate={{opacity: [0.4, 1, 0.4], y: [0, 5, 0]}}
                transition={{duration: 0.95, repeat: Infinity, ease: 'easeInOut'}}
              />
            </motion.g>
          ) : (
            <motion.g
              animate={
                action === 'dancing'
                  ? {rotate: [35, -20, 35]}
                  : action === 'sitting'
                  ? {rotate: [-16, -26, -16]}
                  : action === 'playing'
                  ? {rotate: [28, -10, 28]}
                  : {rotate: [0, 18, -8, 16, 0]}
              }
              transition={{
                duration: action === 'dancing' ? 0.68 : 1.6,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              style={{transformOrigin: '136px 120px'}}
            >
              <path d="M136 120 L164 90" stroke="#e2e8f0" strokeWidth="12" strokeLinecap="round" />
              <circle cx="167" cy="85" r="9.5" fill="#f8fafc" stroke="#2563eb" strokeWidth="3" />
            </motion.g>
          )}
        </svg>
      </motion.button>
    </div>
  );
};
