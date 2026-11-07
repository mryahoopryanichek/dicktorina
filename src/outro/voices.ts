// Сгенерировано tools/voice.py — не править руками. Голоса концовки: длина фразы, с, и когда начинается
// кусок «Если да», «регистрируйся», «Наберём», «сделаем» — по ним появляются строки.
export const VOICES = {
  vivienne: {name: 'fr-FR-VivienneMultilingualNeural', rate: '+36%', len: 4.85, yes: 1.35, reg: 1.99, gather: 3.11, done: 4.35},
  andrew: {name: 'en-US-AndrewMultilingualNeural', rate: '+55%', len: 4.71, yes: 1.28, reg: 1.87, gather: 3.04, done: 4.27},
  remy: {name: 'fr-FR-RemyMultilingualNeural', rate: '+46%', len: 4.88, yes: 1.34, reg: 2.02, gather: 3.14, done: 4.38},
  svetlana: {name: 'ru-RU-SvetlanaNeural', rate: '+38%', len: 4.88, yes: 1.39, reg: 1.9, gather: 3.17, done: 4.29},
};
export type VoiceId = keyof typeof VOICES;
