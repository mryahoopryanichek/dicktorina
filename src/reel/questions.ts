// Вопросы для роликов — src/reel/questions.json (его же читает tools/voice.py для озвучки).
// Медиа — имена файлов в public/media/ (копии из materials/game1/, в git не идут).
import data from './questions.json';
import type {Question} from './Reel';

export type QuestionId = keyof typeof data;
export const QUESTIONS = data as unknown as Record<QuestionId, Question>;
