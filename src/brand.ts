// Бренд: цвета, шрифт и формат роликов. Цвета временные — до утверждения брендинга.
import {loadFont} from '@remotion/google-fonts/Unbounded';

export const REEL = {width: 1080, height: 1920, fps: 60};

export const COLORS = {
  bg: '#0F0E13', // фон
  text: '#F4EFE6', // основной текст: «икторина»
  accent: '#FF4D8D', // D, линия и 8
  ash: '#6E5E52', // цвет, в который превращается пыль
};

export const WORD = {head: 'D', tail: 'икторина'};

export const FONT = loadFont('normal', {weights: ['800'], subsets: ['latin', 'cyrillic']});
