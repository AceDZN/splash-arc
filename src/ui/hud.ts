// DOM HUD in Hebrew (RTL). Math always sits in LTR <bdi> spans so RTL never flips a minus sign or parentheses.
import { fmt, formatFactoredForm, formatVertexForm, landingX, zeros } from '../math/arc';
import type { Game } from '../game/game';
import { LEVELS } from '../game/levels';
import { volleyLanding } from '../game/shot';

export interface HudActions {
  fire(): void;
  nudge(param: 'p' | 'k', dir: 1 | -1): void;
  nudgeBucket(dir: 1 | -1): void;
  toggleFine(): void;
  hint(): void;
  pause(): void;
  resume(): void;
  restart(): void;
  next(): void;
  goLevel(i: number): void;
  toggleMute(): void;
  toggleMotion(): void;
  start(): void;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** "text {math} text" → HTML with math in LTR isolates. */
export function richText(s: string): string {
  return esc(s).replace(/\{([^}]*)\}/g, (_, m) => `<bdi dir="ltr" class="m">${m}</bdi>`);
}

export class Hud {
  root: HTMLElement;
  private el: Record<string, HTMLElement> = {};
  private selected: 'p' | 'k' = 'k';
  private toastTimer = 0;
  private last = '';
  muted = false;
  reducedMotion = false;

  constructor(root: HTMLElement, private game: Game, private actions: HudActions) {
    this.root = root;
    root.innerHTML = `
      <header class="top">
        <section class="lvl" aria-live="polite">
          <div class="lvl-chip"><span class="lvl-num"></span><span class="lvl-name"></span></div>
          <p class="mission"></p>
          <div class="balloons" aria-label="בלונים"></div>
        </section>
        <section class="eq-card" aria-live="polite">
          <div class="eq-title"></div>
          <div class="eq" dir="ltr"></div>
          <div class="chips"></div>
        </section>
        <section class="sys">
          <button class="icon-btn" data-a="pause" aria-label="השהיה">❚❚</button>
          <button class="icon-btn" data-a="mute" aria-label="השתקה">🔊</button>
          <div class="wet"><span class="wet-ico" aria-hidden="true">💦</span><span class="wet-txt"></span></div>
        </section>
      </header>
      <div class="toast" role="status" aria-live="assertive"></div>
      <div class="bubble" role="note"><div class="bubble-who">המדריכה נועה</div><div class="bubble-txt"></div></div>
      <footer class="bottom">
        <button class="fire" data-a="fire"><span class="fire-ico" aria-hidden="true">🎈</span><span class="fire-txt">שגר!</span></button>
        <div class="nudge">
          <div class="nudge-row">
            <button class="nbtn" data-a="minus" aria-label="הקטנה">−</button>
            <div class="nlabel" dir="ltr"></div>
            <button class="nbtn" data-a="plus" aria-label="הגדלה">+</button>
          </div>
          <button class="fine" data-a="fine" aria-pressed="false">צעד עדין <bdi dir="ltr">0.1</bdi></button>
        </div>
        <button class="hint-btn" data-a="hint"><span aria-hidden="true">💡</span> רמז</button>
      </footer>
      <div class="overlay" hidden></div>
    `;
    for (const k of ['lvl-num', 'lvl-name', 'mission', 'balloons', 'eq-title', 'eq', 'chips', 'wet-txt', 'toast', 'bubble', 'bubble-txt', 'fire', 'fire-txt', 'nudge', 'nlabel', 'fine', 'hint-btn', 'overlay']) {
      this.el[k] = root.querySelector(`.${k}`)!;
    }
    root.addEventListener('click', (e) => this.onClick(e));
  }

  private onClick(e: Event): void {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-a]');
    if (!t) return;
    const a = t.dataset.a!;
    const s = this.game.state;
    const catchLevel = s.level.goal.kind === 'catch';
    switch (a) {
      case 'fire': this.actions.fire(); break;
      case 'minus': catchLevel ? this.actions.nudgeBucket(-1) : this.actions.nudge(this.selected, -1); break;
      case 'plus': catchLevel ? this.actions.nudgeBucket(1) : this.actions.nudge(this.selected, 1); break;
      case 'tile-p': this.selected = 'p'; break;
      case 'tile-k': this.selected = 'k'; break;
      case 'tile-a': this.toast('{a} נקבע מעצמו: הקשת חייבת לצאת מהמשגר. הזיזו את הקדקוד וראו איך הוא משתנה.', 3.5); break;
      case 'fine': this.actions.toggleFine(); break;
      case 'hint': this.actions.hint(); break;
      case 'pause': this.actions.pause(); break;
      case 'mute': this.actions.toggleMute(); break;
      case 'resume': this.actions.resume(); break;
      case 'restart': this.actions.restart(); break;
      case 'next': this.actions.next(); break;
      case 'motion': this.actions.toggleMotion(); break;
      case 'start': this.actions.start(); break;
      case 'level': this.actions.goLevel(Number(t.dataset.i)); break;
    }
    this.last = '';
  }

  selectParam(p: 'p' | 'k'): void {
    this.selected = p;
    this.last = '';
  }

  toast(text: string, seconds = 2.4, kind: 'good' | 'bad' | 'info' = 'info'): void {
    const t = this.el.toast;
    t.innerHTML = richText(text);
    t.className = `toast show ${kind}`;
    this.toastTimer = seconds;
  }

  say(text: string | null): void {
    const b = this.el.bubble;
    if (!text) {
      b.classList.remove('show');
      return;
    }
    this.el['bubble-txt'].innerHTML = richText(text);
    b.classList.add('show');
  }

  tick(dt: number): void {
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.el.toast.classList.remove('show');
    }
  }

  /** Re-render only when something visible changed. */
  update(): void {
    const s = this.game.state;
    const lv = s.level;
    const catchLevel = lv.goal.kind === 'catch';
    const key = JSON.stringify([s.levelIndex, s.phase, s.p, s.k, s.fine, s.balloonsLeft, s.volleyIndex, s.bucketX, s.paused, this.selected, this.muted, s.swiped.length]);
    if (key === this.last) return;
    this.last = key;

    this.el['lvl-num'].textContent = `שלב ${lv.id}/${LEVELS.length}`;
    this.el['lvl-name'].textContent = lv.name;
    this.el.mission.innerHTML = richText(lv.mission);

    if (catchLevel) {
      const n = lv.volleys!.length;
      this.el.balloons.innerHTML = Array.from({ length: n }, (_, i) => `<span class="b ${i < s.volleyIndex ? 'caught' : ''}" aria-hidden="true">${i < s.volleyIndex ? '🪣' : '🎈'}</span>`).join('') + `<span class="sr">נתפסו ${s.volleyIndex} מתוך ${n}</span>`;
    } else {
      this.el.balloons.innerHTML = Array.from({ length: lv.balloons }, (_, i) => `<span class="b ${i < s.balloonsLeft ? '' : 'used'}" aria-hidden="true">🎈</span>`).join('') + `<span class="sr">נשארו ${s.balloonsLeft} בלונים</span>`;
    }

    const goalIds = lv.goal.kind === 'soak' ? lv.goal.ids : [];
    this.el['wet-txt'].innerHTML = catchLevel
      ? `נתפסו <bdi dir="ltr">${s.volleyIndex}/${lv.volleys!.length}</bdi>`
      : `רטובים <bdi dir="ltr">${s.phase === 'won' ? goalIds.length : 0}/${goalIds.length}</bdi>`;

    const help = lv.help;
    if (catchLevel) {
      const v = lv.volleys![Math.min(s.volleyIndex, lv.volleys!.length - 1)];
      const eq = v.form === 'factored'
        ? formatFactoredForm(v.a, ...(zeros({ a: v.a, p: v.p, k: v.k, x0: v.x0, h: 0 }) as [number, number]))
        : formatVertexForm(v);
      this.el['eq-title'].textContent = `הזריקה של הצריף היריב · ${s.volleyIndex + 1}/${lv.volleys!.length}`;
      this.el.eq.innerHTML = `<span class="eq-rival">${esc(eq)}</span>`;
      const land = s.phase === 'impact' || s.phase === 'won' ? fmt(volleyLanding(v)) : '?';
      this.el.chips.innerHTML = `<span class="chip">הזורק ב־<bdi dir="ltr">x = ${fmt(v.x0)}</bdi></span><span class="chip c-zero">נקודת נחיתה <bdi dir="ltr">x = ${land}</bdi></span><span class="chip c-bucket">הדלי ב־<bdi dir="ltr">x = ${fmt(s.bucketX)}</bdi></span>`;
    } else {
      const arc = this.game.aim();
      const sel = (p: string) => (this.selected === p ? ' sel' : '');
      const aTxt = arc.a >= 0 ? `<span class="warn-a">${fmt(arc.a)}</span>` : fmt(arc.a);
      this.el['eq-title'].innerHTML = 'הקשת שלכם · ייצוג קדקודי';
      this.el.eq.innerHTML = `y = <button class="tile t-a" data-a="tile-a">${aTxt}</button>(x − <button class="tile t-p${sel('p')}" data-a="tile-p">${fmt(s.p)}</button>)² + <button class="tile t-k${sel('k')}" data-a="tile-k">${fmt(s.k)}</button>`;
      const z = zeros(arc);
      const land = landingX(arc);
      const zeroTxt = help.landing ? (land === null ? 'אין — הקשת לא חוזרת לקרקע' : z.map((x) => fmt(x)).join(', ')) : '?';
      this.el.chips.innerHTML = `<span class="chip c-vertex">קדקוד <bdi dir="ltr">(${fmt(s.p)}, ${fmt(s.k)})</bdi></span>` +
        (help.axis ? `<span class="chip c-axis">ציר סימטרייה <bdi dir="ltr">x = ${fmt(s.p)}</bdi></span>` : '') +
        `<span class="chip c-zero">נקודות אפס <bdi dir="ltr">${zeroTxt}</bdi></span>` +
        (lv.drift ? `<span class="chip c-drift">סחיפה <bdi dir="ltr">+${fmt(lv.drift)}</bdi> מ׳</span>` : '');
    }

    const busy = s.phase !== 'aim' && s.phase !== 'card';
    (this.el.fire as HTMLButtonElement).disabled = busy || s.paused;
    this.el['fire-txt'].textContent = catchLevel ? 'מוכן!' : 'שגר!';
    this.el.nlabel.innerHTML = catchLevel ? `דלי <b>x = ${fmt(s.bucketX)}</b>` : `${this.selected} = <b>${fmt(this.selected === 'p' ? s.p : s.k)}</b>`;
    this.el.fine.setAttribute('aria-pressed', String(s.fine));
    this.el.fine.classList.toggle('on', s.fine);
    this.el.fine.hidden = catchLevel;
    const hints = catchLevel ? lv.volleys![Math.min(s.volleyIndex, lv.volleys!.length - 1)].hint : lv.hint;
    this.el['hint-btn'].hidden = hints.length === 0;
    this.root.classList.toggle('busy', busy);
    (this.root.querySelector('[data-a="mute"]') as HTMLElement).textContent = this.muted ? '🔇' : '🔊';
  }

  showOverlay(html: string | null): void {
    const o = this.el.overlay;
    if (html === null) {
      o.hidden = true;
      o.innerHTML = '';
      return;
    }
    o.innerHTML = `<div class="panel">${html}</div>`;
    o.hidden = false;
  }

  titleScreen(): void {
    this.showOverlay(`
      <div class="logo"><span class="logo-he">קשת המים</span><span class="logo-en" dir="ltr">SPLASH ARC</span></div>
      <p class="tag">מלחמת בלוני מים במחנה הקיץ. אל תמשכו ותנחשו: <b>גררו את הקדקוד</b> של הקשת, והבלון יעוף בדיוק על <bdi dir="ltr" class="m">y = a(x − p)² + k</bdi>.</p>
      <ul class="how">
        <li><span aria-hidden="true">👆</span> גררו את הנקודה הזוהרת (הקדקוד) או לחצו על <bdi dir="ltr" class="m">p</bdi> / <bdi dir="ltr" class="m">k</bdi> במשוואה ושנו עם − / +</li>
        <li><span aria-hidden="true">🎈</span> <b>שגר!</b> (או רווח) — הבלון עף על הפרבולה</li>
        <li><span aria-hidden="true">⌨️</span> מקלדת: חיצים מזיזים את הקדקוד, <bdi dir="ltr">F</bdi> צעד עדין, <bdi dir="ltr">H</bdi> רמז, <bdi dir="ltr">P</bdi> השהיה</li>
      </ul>
      <button class="big" data-a="start">יוצאים לקרב!</button>
      ${this.levelGrid()}
      <p class="small">כיתה ט׳ · פרק 4: הפונקציה הריבועית · לפי Workbook</p>
    `);
  }

  levelGrid(): string {
    const st = this.game.state.stars;
    return `<div class="levels">${LEVELS.map((l, i) => `<button class="lv" data-a="level" data-i="${i}"><span class="lv-n">${l.id}</span><span class="lv-name">${l.name}</span><span class="lv-stars" aria-label="${st[i] ?? 0} כוכבים">${'★'.repeat(st[i] ?? 0)}${'☆'.repeat(3 - (st[i] ?? 0))}</span></button>`).join('')}</div>`;
  }

  pauseScreen(): void {
    this.showOverlay(`
      <h2>הפסקה</h2>
      <div class="row">
        <button class="big" data-a="resume">ממשיכים</button>
        <button data-a="restart">מתחילים את השלב מחדש</button>
      </div>
      <div class="row">
        <button data-a="mute">${this.muted ? 'הפעלת צלילים' : 'השתקה'}</button>
        <button data-a="motion" aria-pressed="${this.reducedMotion}">${this.reducedMotion ? 'תנועה מלאה' : 'פחות תנועה'}</button>
      </div>
      ${this.levelGrid()}
    `);
  }

  winScreen(stars: number, explain: string): void {
    const last = this.game.state.levelIndex === LEVELS.length - 1;
    this.showOverlay(`
      <div class="stars" aria-label="${stars} כוכבים">${'★'.repeat(stars)}<span class="dim">${'★'.repeat(3 - stars)}</span></div>
      <h2>${last ? 'המבצר של המדריכים נרטב לגמרי!' : 'נרטבו!'}</h2>
      <p class="explain">${richText(explain)}</p>
      <div class="row">
        <button class="big" data-a="${last ? 'level' : 'next'}" data-i="0">${last ? 'מהתחלה' : 'לשלב הבא'}</button>
        <button data-a="restart">שוב את השלב</button>
      </div>
    `);
  }

  outScreen(explain: string): void {
    this.showOverlay(`
      <h2>נגמרו הבלונים!</h2>
      <p class="explain">${richText(explain)}</p>
      <div class="row"><button class="big" data-a="restart">ממלאים בלונים ומנסים שוב</button></div>
    `);
  }
}
