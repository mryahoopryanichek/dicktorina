// Сгенерировано tools/voice.py — не править руками. Голоса концовки: длина фразы, с, и когда начинается
// кусок «Если да», «регистрируйся», «Наберём», «сделаем» — по ним появляются строки.
export const VOICES = {
  vivienne: {name: 'fr-FR-VivienneMultilingualNeural', rate: '+40%', len: 4.85, yes: 1.31, reg: 1.94, gather: 3.04, done: 4.36},
  andrew: {name: 'en-US-AndrewMultilingualNeural', rate: '+61%', len: 4.81, yes: 1.26, reg: 1.81, gather: 3.04, done: 4.39},
  remy: {name: 'fr-FR-RemyMultilingualNeural', rate: '+50%', len: 4.89, yes: 1.31, reg: 1.98, gather: 3.08, done: 4.41},
  svetlana: {name: 'ru-RU-SvetlanaNeural', rate: '+45%', len: 4.87, yes: 1.33, reg: 1.83, gather: 3.07, done: 4.32},
};
export type VoiceId = keyof typeof VOICES;
