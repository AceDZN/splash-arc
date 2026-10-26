// The seven authored levels. Numbers here are the game's single source of truth; tests prove each one.
// Text in {braces} is math and renders in an LTR span.
import type { Field } from '../math/trace';

export interface Volley {
  /** The rival's throw y = a(x − p)² + k, launched from x0 toward +x. */
  a: number;
  p: number;
  k: number;
  x0: number;
  /** How the equation card shows it. */
  form: 'vertex' | 'factored';
  hint: string[];
}

export interface Help {
  /** How much of the dotted flight preview is drawn. */
  preview: 'toVertex' | 'stub' | 'none';
  /** Show the landing marker and the zeros chip. */
  landing: boolean;
  /** Show the axis of symmetry line. */
  axis: boolean;
  /** Metre labels along the ground and height poles. */
  gridLabels: boolean;
}

export interface Level {
  id: number;
  name: string;
  mission: string;
  launcher: { x: number; h: number };
  start: { p: number; k: number };
  pRange: [number, number];
  kRange: [number, number];
  balloons: number;
  field: Field;
  /** Shoot levels: every id must be swiped or soaked in one shot. Catch levels: catch every volley. */
  goal: { kind: 'soak'; ids: string[] } | { kind: 'catch' };
  /** The raft drifts this far (m) between "fire" and the throw. */
  drift?: number;
  volleys?: Volley[];
  bucketRange?: [number, number];
  bucketStart?: number;
  help: Help;
  hint: string[];
  theme: 'day' | 'sunset' | 'night';
  /** Workbook grade-9 chapter-4 module slugs this level practises. */
  modules: string[];
}

const FIELD = { xMax: 16, yMax: 40 };

export const LEVELS: Level[] = [
  {
    id: 1,
    name: 'מעל החומה',
    mission: 'העיפו את הבלון מעל חומת הקרטון ופגעו בארגז ב־{x = 8}, ועברו מתחת לצמרת העץ שמתחילה בגובה {6} מ׳.',
    launcher: { x: 0, h: 0 },
    start: { p: 4, k: 2 },
    pRange: [1, 7],
    kRange: [0.5, 8],
    balloons: 5,
    field: {
      ...FIELD,
      obstacles: [
        { kind: 'post', id: 'wall', x: 2, yLow: 0, yHigh: 3, look: 'wall' },
        { kind: 'ceiling', id: 'canopy', x1: 3, x2: 5, y: 6, look: 'canopy' },
        { kind: 'target', id: 'crate', x1: 7.6, x2: 8.4, y1: 0, y2: 0.8, look: 'crate' },
      ],
    },
    goal: { kind: 'soak', ids: ['crate'] },
    help: { preview: 'toVertex', landing: true, axis: true, gridLabels: true },
    hint: [
      'הבלון נוחת בנקודת האפס השנייה. היא סימטרית ל־{0} סביב הציר, אז כדי לנחות ב־{8} צריך {p = 4}.',
      'הגובה מעל החומה: {y(2) = a·2·(2 − 8)}, ועם {a = −k/16} יוצא {y(2) = 0.75k}. צריך {0.75k > 3}, כלומר {k > 4}, וגם {k < 6} כדי לעבור מתחת לצמרת.',
    ],
    theme: 'day',
    modules: ['parabola-y-equals-x2', 'parabola-symmetry-and-vertex', 'vertical-shifts'],
  },
  {
    id: 2,
    name: 'פיניאטה',
    mission: 'פוצצו את הפיניאטה שתלויה ב־{(5, 7)} והנחיתו את הבלון בבריכה ב־{x = 10}, באותה זריקה.',
    launcher: { x: 0, h: 0 },
    start: { p: 3, k: 4 },
    pRange: [1, 8],
    kRange: [0.5, 9],
    balloons: 4,
    field: {
      ...FIELD,
      obstacles: [
        { kind: 'ring', id: 'pinata', x: 5, y: 7, r: 0.35, look: 'pinata' },
        { kind: 'target', id: 'pool', x1: 9.5, x2: 10.5, y1: 0, y2: 0.5, look: 'pool' },
      ],
    },
    goal: { kind: 'soak', ids: ['pinata', 'pool'] },
    help: { preview: 'stub', landing: true, axis: true, gridLabels: true },
    hint: [
      'הקשת יוצאת מ־{0} ונוחתת ב־{10}: אלה נקודות האפס. איפה ציר הסימטרייה?',
      'הציר באמצע: {x = (0 + 10) / 2 = 5}. הוא עובר בפיניאטה, אז היא הקדקוד: {(5, 7)}.',
    ],
    theme: 'day',
    modules: ['parabola-symmetry-and-vertex', 'vertex-form'],
  },
  {
    id: 3,
    name: 'מגדל המציל',
    mission: 'אתם על מגדל המציל בגובה {3} מ׳. פגעו בגלגל ההצלה ב־{x = 6} ואל תיגעו בדגלונים בגובה {4.6} מ׳.',
    launcher: { x: 0, h: 3 },
    start: { p: 3, k: 4 },
    pRange: [0.5, 7],
    kRange: [0.5, 7],
    balloons: 4,
    field: {
      ...FIELD,
      obstacles: [
        { kind: 'ceiling', id: 'bunting', x1: 0.5, x2: 4.5, y: 4.6, look: 'bunting' },
        { kind: 'target', id: 'lifering', x1: 5.5, x2: 6.5, y1: 0, y2: 0.4, look: 'ring' },
      ],
    },
    goal: { kind: 'soak', ids: ['lifering'] },
    help: { preview: 'stub', landing: false, axis: true, gridLabels: true },
    hint: [
      'המשגר בגובה {3}, אז הנחיתה כבר לא ב־{2p}. כאן {a = (3 − k) / p²}.',
      'נסו קדקוד {(2, 4)}: {a = (3 − 4) / 4 = −0.25}. פתרו {−0.25(x − 2)² + 4 = 0} ← {(x − 2)² = 16} ← {x − 2 = ±4} ← {x = 6} (הפתרון {x = −2} מאחורי המגדל).',
    ],
    theme: 'day',
    modules: ['vertex-form', 'stretch-reflect-parabola'],
  },
  {
    id: 4,
    name: 'אש חוזרת',
    mission: 'הצריף היריב זורק בחזרה! קראו את המשוואה, מצאו איפה הבלון נוחת ושימו שם את הדלי. כל פספוס מביא זריקה חדשה.',
    launcher: { x: 0, h: 0 },
    start: { p: 4, k: 5 },
    pRange: [1, 7],
    kRange: [0.5, 10],
    balloons: 6,
    field: { ...FIELD, obstacles: [] },
    goal: { kind: 'catch' },
    volleys: [
      {
        a: -0.5, p: 4, k: 8, x0: 0, form: 'vertex',
        hint: ['הבלון נוחת ב־{y = 0}.', '{−0.5(x − 4)² + 8 = 0} ← {(x − 4)² = 16} ← {x = 4 ± 4}. הזורק ב־{0}, אז הדלי ב־{8}.'],
      },
      {
        a: -0.5, p: 6, k: 8, x0: 2, form: 'factored',
        hint: ['מכפלה מתאפסת כשאחד הגורמים מתאפס: מאפסים כל גורם.', '{x − 2 = 0} או {x − 10 = 0}. הזורק עומד ב־{2}, אז הדלי ב־{10}.'],
      },
      {
        a: -0.5, p: 3, k: 8, x0: -1, form: 'factored',
        hint: ['שימו לב לסימן: {(x + 1)} מתאפס כש־{x = −1}, לא {1}.', '{x + 1 = 0} ← {x = −1} (שם הזורק), {x − 7 = 0} ← {x = 7}. הדלי ב־{7}.'],
      },
      {
        a: -0.25, p: 5, k: 9, x0: -1, form: 'vertex',
        hint: ['נקודות האפס סימטריות סביב ציר הסימטרייה {x = 5}.', 'הזורק ב־{−1}, שזה {6} מ׳ משמאל לציר. הנחיתה {6} מ׳ מימין: {x = 11}.'],
      },
    ],
    bucketRange: [3, 13],
    bucketStart: 5,
    help: { preview: 'none', landing: false, axis: false, gridLabels: true },
    hint: [],
    theme: 'day',
    modules: ['factored-form', 'parabola-symmetry-and-vertex', 'vertex-form'],
  },
  {
    id: 5,
    name: 'רפסודה נסחפת',
    mission: 'הרפסודה נסחפת {2} מ׳ ימינה בין הלחיצה לזריקה. פגעו בדגל ב־{x = 11} ועברו מעל המצוף בגובה {2.5} מ׳ ב־{x = 4}.',
    launcher: { x: 0, h: 0 },
    start: { p: 5.5, k: 4 },
    pRange: [1, 7],
    kRange: [0.5, 8],
    balloons: 4,
    drift: 2,
    field: {
      ...FIELD,
      water: [[-3, 7]],
      obstacles: [
        { kind: 'post', id: 'buoy', x: 4, yLow: 0, yHigh: 2.5, look: 'barrier' },
        { kind: 'target', id: 'flag', x1: 10.6, x2: 11.4, y1: 0, y2: 0.9, look: 'fort' },
      ],
    },
    goal: { kind: 'soak', ids: ['flag'] },
    help: { preview: 'stub', landing: true, axis: true, gridLabels: true },
    hint: [
      'הסחיפה מזיזה את כל הקשת {2} מ׳ ימינה: {(x − p)} הופך ל־{(x − (p + 2))}. גם נקודות האפס זזות ב־{2}.',
      'כדי לנחות ב־{11} אחרי הסחיפה, כוונו עכשיו לנחיתה ב־{9}: {p = 4.5}.',
    ],
    theme: 'sunset',
    modules: ['horizontal-shifts', 'vertex-form'],
  },
  {
    id: 6,
    name: 'פנסים כפולים',
    mission: 'הדליקו את שני הפנסים, ב־{(3, 7.5)} וב־{(5, 7.5)}, בקשת אחת.',
    launcher: { x: 0, h: 0 },
    start: { p: 3, k: 5 },
    pRange: [1, 8],
    kRange: [0.5, 10],
    balloons: 4,
    field: {
      ...FIELD,
      obstacles: [
        { kind: 'ring', id: 'lantern-a', x: 3, y: 7.5, r: 0.2, look: 'lantern' },
        { kind: 'ring', id: 'lantern-b', x: 5, y: 7.5, r: 0.2, look: 'lantern' },
      ],
    },
    goal: { kind: 'soak', ids: ['lantern-a', 'lantern-b'] },
    help: { preview: 'stub', landing: false, axis: true, gridLabels: true },
    hint: [
      'שתי נקודות באותו גובה סימטריות סביב הציר: {x = (3 + 5) / 2 = 4}.',
      'הקשת עוברת ב־{(0, 0)} וב־{(3, 7.5)}: {16a + k = 0} וגם {a + k = 7.5}, אז {a = −0.5} ו־{k = 8}.',
    ],
    theme: 'sunset',
    modules: ['parabola-symmetry-and-vertex', 'vertex-form', 'factored-form'],
  },
  {
    id: 7,
    name: 'פשיטת לילה',
    mission: 'פשיטה על מבצר המדריכים ב־{x = 10}. החומה ב־{x = 8} בגובה {6} מ׳, הענף ב־{x = 3} מתחיל בגובה {11} מ׳. בלי תצוגה מקדימה ובלי רמזים.',
    launcher: { x: 0, h: 0 },
    start: { p: 4, k: 6 },
    pRange: [1, 8],
    kRange: [0.5, 14],
    balloons: 3,
    field: {
      ...FIELD,
      obstacles: [
        { kind: 'post', id: 'branch', x: 3, yLow: 11, yHigh: Infinity, look: 'branch' },
        { kind: 'post', id: 'wall', x: 8, yLow: 0, yHigh: 6, look: 'wall' },
        { kind: 'target', id: 'fort', x1: 9.6, x2: 10.4, y1: 0, y2: 0.8, look: 'fort' },
      ],
    },
    goal: { kind: 'soak', ids: ['fort'] },
    help: { preview: 'none', landing: false, axis: false, gridLabels: false },
    hint: [],
    theme: 'night',
    modules: ['vertex-form', 'factored-form', 'quadratic-positive-negative-intervals'],
  },
];
