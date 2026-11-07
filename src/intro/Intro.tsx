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
import {ASH, FONT, PALETTES, WORD, type PaletteId} from '../brand';
import {Background} from '../Background';

// Моменты заставки, в секундах. Заставка стоит в конце ролика и укладывается в 2,5 с.
const T = {
  inEnd: 0.25, // слово проявилось
  snap: 0.3, // щелчок: «икторина» начинает рассыпаться
  stagger: 0.4, // за сколько волна пыли проходит слово слева направо
  jitter: 0.2, // разброс начала у соседних пылинок; к 1 с букв уже нет
  darken: 0.15, // за сколько до своего начала пылинка темнеет — буква «пеплится» перед волной
  line: [0.8, 1.05], // линия выезжает слева к D, D стоит на месте
  away: [1.05, 2.4], // всё уезжает вправо, последней — 8
};
export const INTRO_SECONDS = 2.5;
const LINE_EQ = 8; // сколько «=» в линии
const WORD_WIDTH = 0.84; // доля ширины кадра под слово

type Dust = {x: number; y: number; a: number; start: number; life: number; vx: number; vy: number; wob: number};
type Layout = {font: string; x0: number; xI: number; cy: number; lineW: number; dust: Dust[]};

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const ASH_RGB = rgb(ASH);

function buildLayout(width: number, height: number): Layout {
  const ctx = document.createElement('canvas').getContext('2d')!;
  const font = (s: number) => `800 ${s}px "${FONT.fontFamily}"`;
  const word = WORD.head + WORD.tail;
  ctx.font = font(100);
  const size = Math.floor((100 * width * WORD_WIDTH) / ctx.measureText(word).width);
  ctx.font = font(size);
  const full = ctx.measureText(word).width;
  const wTail = ctx.measureText(WORD.tail).width;
  const x0 = (width - full) / 2;
  const xI = x0 + full - wTail;
  const cy = Math.round(height / 2);

  // Каждый пиксель «икторина» становится пылинкой: на месте она рисует ровно этот пиксель.
  // Буквы рисуются с той же дробной долей x, что и в кадре, а пылинки стоят на целых пикселях — без мути.
  const pad = Math.ceil(size * 0.1);
  const bw = Math.ceil(wTail) + 2 * pad + 1;
  const bh = 2 * Math.ceil(size * 0.8);
  const left = Math.floor(xI) - pad;
  const off = document.createElement('canvas');
  off.width = bw;
  off.height = bh;
  const o = off.getContext('2d')!;
  o.font = font(size);
  o.textBaseline = 'middle';
  o.fillStyle = '#fff';
  o.fillText(WORD.tail, xI - left, bh / 2);
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
        x: left + x,
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
  return {
    font: font(size),
    x0,
    xI,
    cy,
    lineW: ctx.measureText('8' + '='.repeat(LINE_EQ)).width,
    dust,
  };
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

function draw(ctx: CanvasRenderingContext2D, L: Layout, t: number, width: number, ink: string) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.font = L.font;
  ctx.textBaseline = 'middle';

  // Появление слова
  const appear = interpolate(t, [0, T.inEnd], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const cx = width / 2;
  const s = 0.88 + 0.12 * appear;
  ctx.save();
  ctx.globalAlpha = appear;
  ctx.translate(cx, L.cy);
  ctx.scale(s, s);
  ctx.translate(-cx, -L.cy);

  // D стоит на месте; линия доезжает до неё, потом всё вместе уезжает вправо, пока 8 не скроется
  const away = interpolate(t, T.away, [0, 1], {...clamp, easing: Easing.in(Easing.quad)});
  const shift = away * (width - (L.x0 - L.lineW) + 60);
  const xD = L.x0 + shift;

  if (t >= T.line[0]) {
    const lineRight = interpolate(t, T.line, [-40, L.x0], {...clamp, easing: Easing.out(Easing.cubic)});
    ctx.textAlign = 'right';
    ctx.fillStyle = ink;
    ctx.fillText('8' + '='.repeat(LINE_EQ), lineRight + shift, L.cy);
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

export type IntroProps = {palette: PaletteId};

export const Intro = ({palette}: IntroProps) => {
  const ink = PALETTES[palette].ink;
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [handle] = useState(() => delayRender('Шрифт и пиксели заставки'));
  const released = useRef(false);

  useLayoutEffect(() => {
    let alive = true;
    FONT.waitUntilDone().then(() => {
      if (alive) setLayout(buildLayout(width, height));
    });
    return () => {
      alive = false;
    };
  }, [width, height]);

  useLayoutEffect(() => {
    const c = ref.current;
    if (!c || !layout) return;
    draw(c.getContext('2d')!, layout, frame / fps, width, ink);
    if (!released.current) {
      released.current = true;
      continueRender(handle);
    }
  }, [layout, frame, fps, width, ink, handle]);

  return (
    <AbsoluteFill>
      <Background palette={PALETTES[palette]} />
      <canvas ref={ref} width={width} height={height} style={{position: 'absolute', inset: 0}} />
    </AbsoluteFill>
  );
};
