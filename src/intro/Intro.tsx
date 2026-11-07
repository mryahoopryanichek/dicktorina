// Заставка: «Dикторина» → «икторина» рассыпается пылью → к D выезжает линия → всё уезжает вправо, в хвосте 8.
// Всё рисуется на одном canvas: буквы и пыль в одних координатах, кадр зависит только от времени.
import {useLayoutEffect, useRef, useState} from 'react';
import {
  AbsoluteFill,
  Easing,
  continueRender,
  delayRender,
  interpolate,
  random,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {ASH, FONT, PALETTES, WORD, fontCss, textWidth, type PaletteId} from '../brand';
import {Background} from '../Background';

// Моменты заставки, в секундах. Отдельная заставка укладывается в 2,5 с.
const T = {
  inEnd: 0.25, // слово проявилось
  snap: 0.3, // щелчок: «икторина» начинает рассыпаться
  stagger: 0.4, // за сколько волна пыли проходит слово слева направо
  jitter: 0.2, // разброс начала у соседних пылинок; к 1 с букв уже нет
  darken: 0.15, // за сколько до своего начала пылинка темнеет — буква «пеплится» перед волной
  line: [0.8, 1.05] as [number, number], // линия выезжает слева к D, D стоит на месте
  away: [1.05, 2.4] as [number, number], // всё уезжает вправо, последней — 8
  ramp: 0.4, // в концовке: за сколько линия разгоняется до своей скорости
};
export const INTRO_SECONDS = 2.5;
export const LINE_IN_END = T.line[1]; // линия доехала до D — дальше в концовке всё едет
const LINE_EQ = 8; // сколько «=» в линии отдельной заставки
const WORD_WIDTH = 0.84; // доля ширины кадра под слово

// Размер и место слова «Dикторина»: по ширине кадра, по центру или от левого края
export function logoMetrics(width: number, left?: number) {
  const word = WORD.head + WORD.tail;
  const size = Math.floor((100 * width * WORD_WIDTH) / textWidth(word, 100));
  const full = textWidth(word, size);
  return {size, full, x0: left ?? (width - full) / 2};
}

type Dust = {x: number; y: number; a: number; start: number; life: number; vx: number; vy: number; wob: number};
type Layout = {
  font: string;
  x0: number;
  xI: number;
  cy: number;
  cx: number; // середина слова — от неё слово проявляется
  line: string; // «8====…»
  lineScale: number; // в концовке: поджать линию, чтобы 8=====D было ровно шириной слова
  lineW: number;
  dust: Dust[];
};

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const ASH_RGB = rgb(ASH);

function buildLayout(width: number, cy: number, left: number | undefined, fit: boolean): Layout {
  const {size, full, x0} = logoMetrics(width, left);
  const wTail = textWidth(WORD.tail, size);
  const xI = x0 + full - wTail;

  // В концовке 8=====D к концу фразы доезжает до места слова: от 8 до D — ровно ширина «Dикторина»
  const wD = textWidth(WORD.head, size);
  const w8 = textWidth('8', size);
  const wEq = textWidth('=', size);
  const eq = fit ? Math.max(LINE_EQ, Math.round((full - wD - w8) / wEq)) : LINE_EQ;
  const line = '8' + '='.repeat(eq);
  const natural = textWidth(line, size);
  const lineScale = fit ? (full - wD) / natural : 1;

  // Каждый пиксель «икторина» становится пылинкой: на месте она рисует ровно этот пиксель.
  // Буквы рисуются с той же дробной долей x, что и в кадре, а пылинки стоят на целых пикселях — без мути.
  const pad = Math.ceil(size * 0.1);
  const bw = Math.ceil(wTail) + 2 * pad + 1;
  const bh = 2 * Math.ceil(size * 0.8);
  const leftPx = Math.floor(xI) - pad;
  const off = document.createElement('canvas');
  off.width = bw;
  off.height = bh;
  const o = off.getContext('2d')!;
  o.font = fontCss(size);
  o.textBaseline = 'middle';
  o.fillStyle = '#fff';
  o.fillText(WORD.tail, xI - leftPx, bh / 2);
  const px = o.getImageData(0, 0, bw, bh).data;
  const dust: Dust[] = [];
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const a = px[(y * bw + x) * 4 + 3];
      if (a < 8) continue;
      const k = `${x}:${y}`;
      // Больше половины пылинок осыпается быстро, остальные долго уносит ветром — пыль редкая, а не пятно
      const longLived = random('k' + k) < 0.4;
      dust.push({
        x: leftPx + x,
        y: cy - bh / 2 + y,
        a: a / 255,
        start: T.snap + (x / bw) * T.stagger + random('s' + k) * T.jitter,
        life: longLived ? 0.45 + random('l' + k) * 0.45 : 0.12 + random('l' + k) * 0.15,
        vx: 60 + random('x' + k) * 220,
        vy: -(20 + random('y' + k) * 150) + (random('v' + k) - 0.5) * 60,
        wob: random('w' + k) * Math.PI * 2,
      });
    }
  }
  return {font: fontCss(size), x0, xI, cy, cx: x0 + full / 2, line, lineScale, lineW: natural * lineScale, dust};
}

const mix = (ink: number[], m: number) =>
  `rgb(${ink.map((c, i) => Math.round(c + (ASH_RGB[i] - c) * m)).join(',')})`;

function drawDust(ctx: CanvasRenderingContext2D, dust: Dust[], t: number, ink: number[]) {
  for (const p of dust) {
    let x = p.x;
    let y = p.y;
    let a = p.a;
    let size = 1;
    let col: string;
    if (t < p.start) {
      // Перед волной буква темнеет к пеплу
      col = mix(ink, 0.55 * Math.max(0, 1 - (p.start - t) / T.darken));
    } else {
      const dt = t - p.start;
      const k = dt / p.life;
      if (k >= 1) continue;
      x += p.vx * dt + 120 * dt * dt + Math.sin(dt * 5 + p.wob) * 18 * dt;
      y += p.vy * dt - 30 * dt * dt + Math.cos(dt * 4 + p.wob) * 14 * dt;
      a *= Math.pow(1 - k, 1.5);
      size = 1 + 1.5 * Math.min(1, k * 2);
      col = mix(ink, 0.55 + 0.45 * Math.min(1, k * 2));
    }
    ctx.globalAlpha = a;
    ctx.fillStyle = col;
    ctx.fillRect(x, y, size, size);
  }
}

// Отдельная заставка: всё уезжает за away. Концовка: после линии всё ровно едет вправо, пока идёт голос,
// к концу drift 8 встаёт на место D, потом за exit секунд всё улетает за правый край.
type Motion = {away: [number, number]} | {drift: [number, number]; exit: number};

function shiftAt(t: number, M: Motion, L: Layout, width: number) {
  if ('away' in M) {
    const k = interpolate(t, M.away, [0, 1], {...clamp, easing: Easing.in(Easing.quad)});
    return k * (width + 60 - L.x0 + L.lineW);
  }
  const span = M.drift[1] - M.drift[0];
  const r = Math.min(T.ramp, span / 2);
  const v = L.lineW / (span - r / 2); // скорость, при которой 8 доедет до места D ровно к концу
  const tau = t - M.drift[0];
  if (tau <= 0) return 0;
  if (tau < r) return (v * tau * tau) / (2 * r);
  if (tau < span) return v * (tau - r / 2);
  const e = tau - span;
  const dist = width + 60 - L.x0; // 8 от места D за правый край
  const a = (2 * (dist - v * M.exit)) / (M.exit * M.exit);
  return L.lineW + v * e + (a * e * e) / 2;
}

function draw(ctx: CanvasRenderingContext2D, L: Layout, t: number, width: number, ink: string, M: Motion) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.font = L.font;
  ctx.textBaseline = 'middle';

  // Появление слова
  const appear = interpolate(t, [0, T.inEnd], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const cx = L.cx;
  const s = 0.88 + 0.12 * appear;
  ctx.save();
  ctx.globalAlpha = appear;
  ctx.translate(cx, L.cy);
  ctx.scale(s, s);
  ctx.translate(-cx, -L.cy);

  // D стоит на месте, линия доезжает до неё, потом всё едет вправо
  const shift = shiftAt(t, M, L, width);
  const xD = L.x0 + shift;

  if (t >= T.line[0]) {
    const lineRight = interpolate(t, T.line, [-40, L.x0], {...clamp, easing: Easing.out(Easing.cubic)});
    ctx.save();
    ctx.translate(lineRight + shift, L.cy);
    ctx.scale(L.lineScale, 1);
    ctx.textAlign = 'right';
    ctx.fillStyle = ink;
    ctx.fillText(L.line, 0, 0);
    ctx.restore();
  }
  ctx.textAlign = 'left';
  ctx.fillStyle = ink;
  ctx.fillText(WORD.head, xD, L.cy);

  if (t < T.snap) {
    ctx.fillText(WORD.tail, L.xI, L.cy);
  } else {
    drawDust(ctx, L.dust, t, rgb(ink));
  }
  ctx.restore();
}

export type IntroLayerProps = {
  ink: string;
  y?: number; // середина слова, доля высоты кадра
  left?: number; // левый край слова, px; без него — по центру
  drift?: [number, number]; // концовка: 8=====D едет вправо в эти секунды, к концу 8 — на месте D
  exit?: number; // и потом за столько секунд улетает
};

// Заставка без фона: рисуется поверх любого кадра
export const IntroLayer = ({ink, y = 0.5, left, drift, exit = 0.5}: IntroLayerProps) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const cy = Math.round(height * y);
  const fit = Boolean(drift);
  const ref = useRef<HTMLCanvasElement>(null);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [handle] = useState(() => delayRender('Шрифт и пиксели заставки'));
  const released = useRef(false);

  useLayoutEffect(() => {
    let alive = true;
    FONT.waitUntilDone().then(() => {
      if (alive) setLayout(buildLayout(width, cy, left, fit));
    });
    return () => {
      alive = false;
    };
  }, [width, cy, left, fit]);

  const d0 = drift?.[0];
  const d1 = drift?.[1];
  useLayoutEffect(() => {
    const c = ref.current;
    if (!c || !layout) return;
    const motion: Motion = d0 !== undefined && d1 !== undefined ? {drift: [d0, d1], exit} : {away: T.away};
    draw(c.getContext('2d')!, layout, frame / fps, width, ink, motion);
    if (!released.current) {
      released.current = true;
      continueRender(handle);
    }
  }, [layout, frame, fps, width, ink, handle, d0, d1, exit]);

  return <canvas ref={ref} width={width} height={height} style={{position: 'absolute', inset: 0}} />;
};

export type IntroProps = {palette: PaletteId};

// Заставка отдельным роликом: фон + слово посередине кадра
export const Intro = ({palette}: IntroProps) => (
  <AbsoluteFill>
    <Background palette={PALETTES[palette]} />
    <IntroLayer ink={PALETTES[palette].ink} />
  </AbsoluteFill>
);
