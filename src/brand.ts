// Бренд: формат роликов, шрифт, слово и палитры. У каждого ролика своя палитра —
// градиент от low (низ-лево) к high (верх), ink — цвет текста поверх него.
import {loadFont} from '@remotion/google-fonts/Unbounded';

export const REEL = {width: 1080, height: 1920, fps: 60};

export const WORD = {head: 'D', tail: 'икторина'};

export const FONT = loadFont('normal', {weights: ['800'], subsets: ['latin', 'cyrillic']});

export type Palette = {
  low: string; // низ-лево
  high: string; // верх
  ink: string; // текст: тёмный на светлых парах, белый на тёмных
};

export const PALETTES = {
  emerald: {low: '#0B7A4B', high: '#F6C945', ink: '#0B1A12'}, // изумруд → золото
  sunset: {low: '#FF3D7F', high: '#FFB547', ink: '#1C0A12'}, // малина → апельсин
  night: {low: '#2A1A6E', high: '#35D0DA', ink: '#FFFFFF'}, // фиолет → бирюза
} satisfies Record<string, Palette>;

export type PaletteId = keyof typeof PALETTES;

export const ASH = '#6E5E52'; // цвет, в который темнеет пыль от букв
