// Сгенерировано tools/voice.py — не править руками. Голоса концовки: длина фразы, с, и когда начинается
// кусок «Если да», «регистрируйся», «Наберём», «сделаем» — по ним появляются строки.
export const VOICES = {
  vivienne: {name: 'fr-FR-VivienneMultilingualNeural', rate: '+41%', len: 4.85, yes: 1.3, reg: 1.93, gather: 3.03, done: 4.36},
  andrew: {name: 'en-US-AndrewMultilingualNeural', rate: '+59%', len: 4.86, yes: 1.24, reg: 1.81, gather: 3.0, done: 4.44},
  remy: {name: 'fr-FR-RemyMultilingualNeural', rate: '+53%', len: 4.87, yes: 1.29, reg: 1.95, gather: 3.03, done: 4.41},
  svetlana: {name: 'ru-RU-SvetlanaNeural', rate: '+45%', len: 4.88, yes: 1.34, reg: 1.83, gather: 3.04, done: 4.31},
};
export type VoiceId = keyof typeof VOICES;
