// Бренд: формат роликов, шрифт, слово и палитры. У каждого ролика своя палитра —
// градиент от low (низ-лево) через светлую mid к high (верх), ink — цвет текста поверх него.
import {useLayoutEffect, useState} from 'react';
import {continueRender, delayRender} from 'remotion';
import {loadFont} from '@remotion/google-fonts/Unbounded';

export const REEL = {width: 1080, height: 1920, fps: 60};

export const WORD = {head: 'D', tail: 'икторина'};

export const FONT = loadFont('normal', {weights: ['800'], subsets: ['latin', 'cyrillic']});
export const fontCss = (size: number) => `800 ${size}px "${FONT.fontFamily}"`;

let measurer: CanvasRenderingContext2D | null = null;
// Ширина текста шрифтом бренда, px. Верна только после загрузки шрифта (useFontReady)
export const textWidth = (text: string, size: number) => {
  measurer ??= document.createElement('canvas').getContext('2d')!;
  measurer.font = fontCss(size);
  return measurer.measureText(text).width;
};

// Держит кадр, пока не загрузится шрифт: до этого мерить текст нельзя
export const useFontReady = () => {
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender('Шрифт бренда'));
  useLayoutEffect(() => {
    FONT.waitUntilDone().then(() => {
      setReady(true);
      continueRender(handle);
    });
  }, [handle]);
  return ready;
};

export type Palette = {
  name: string; // по-русски, для листа палитр
  low: string; // низ-лево
  mid: string; // середина: светлее смеси low и high, чтобы середина не уходила в грязь
  high: string; // верх, тут стоит заставка
  ink: string; // текст: тёмный на светлых парах, белый на тёмных
};

// Пары — из семейств оттенка в кадрах игры (бирюза, красный, голубой, жёлтый, оранжевый,
// малина, синий, фиолет, лайм, изумруд, пурпур) плюс золото.
export const PALETTES = {
  emerald: {name: 'изумруд → золото', low: '#0B7A4B', mid: '#B5DB6A', high: '#F6C945', ink: '#0B1A12'},
  sunset: {name: 'малина → апельсин', low: '#FF3D7F', mid: '#FF7A63', high: '#FFB547', ink: '#1C0A12'},
  night: {name: 'фиолет → бирюза', low: '#2A1A6E', mid: '#3A86C8', high: '#35D0DA', ink: '#FFFFFF'},
  lagoon: {name: 'бирюза → мята', low: '#0A7F86', mid: '#3CCFB8', high: '#C5FBE6', ink: '#04282B'},
  ruby: {name: 'красный → жёлтый', low: '#B80F24', mid: '#EE4A2C', high: '#FFC23D', ink: '#2A0505'},
  sky: {name: 'синий → голубой', low: '#2643E9', mid: '#4AA8F7', high: '#B5EEFF', ink: '#071B40'},
  candy: {name: 'малина → голубой', low: '#E8317A', mid: '#C27BE0', high: '#86DCFF', ink: '#1E0B33'},
  grape: {name: 'фиолет → розовый', low: '#3E17A8', mid: '#8B32D6', high: '#F255A8', ink: '#FFFFFF'},
  spring: {name: 'лайм → голубой', low: '#5DB81C', mid: '#C9F08A', high: '#8FE3FF', ink: '#0F2A12'},
  synth: {name: 'синий → розовый → апельсин', low: '#2330D8', mid: '#E0589C', high: '#FFA145', ink: '#1A0830'},
  gold: {name: 'бронза → золото', low: '#6E4208', mid: '#C99128', high: '#FFE07A', ink: '#1F1300'},
  orchid: {name: 'пурпур → лимон', low: '#8E2BA8', mid: '#F06A8A', high: '#FFE45C', ink: '#2A0A26'},
} satisfies Record<string, Palette>;

export type PaletteId = keyof typeof PALETTES;
export const PALETTE_IDS = Object.keys(PALETTES) as PaletteId[];

export const ASH = '#6E5E52'; // цвет, в который темнеет пыль от букв

const luma = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

// Плашка-акцент («5000»): заливка цветом текста, надпись — контрастным цветом палитры
export const chipColors = (p: Palette) => ({
  fill: p.ink,
  label: luma(p.ink) > 0.5 ? p.low : p.high,
});
