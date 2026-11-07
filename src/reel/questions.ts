// Вопросы для роликов: один вопрос — один файл src/reel/q/<id>.json (их же читает tools/voice.py).
// Озвучка вопроса — src/reel/lines/<id>.json (делает tools/voice.py questions).
// Медиа — имена файлов в public/media/ (копии из materials/game1/, в git не идут).
import type {Question} from './Reel';

type Ctx = {keys(): string[]; (key: string): unknown};
declare const require: {context(dir: string, deep: boolean, re: RegExp): Ctx};

const load = <T,>(ctx: Ctx) =>
  Object.fromEntries(ctx.keys().map((k) => [k.replace(/^.*\/(.+)\.json$/, '$1'), ctx(k) as T])) as Record<string, T>;

export type QuestionId = string;
export const QUESTIONS = load<Question>(require.context('./q', false, /\.json$/));
export type Line = {file: string; len: number};
export const LINES = load<Record<string, Record<string, Line>>>(require.context('./lines', false, /\.json$/));
