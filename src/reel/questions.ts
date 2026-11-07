// Вопросы для роликов — один список в корне репо: questions.json (его же читает tools/voice.py).
// status: «готов» — ролик проверен, «черновик» — подготовлен помощником, не проверен.
// Озвучка вопроса — src/reel/lines/<id>.json (делает tools/voice.py questions, по одному вопросу).
// Медиа — имена файлов в public/media/ (копии из materials/game1/, в git не идут).
import data from '../../questions.json';
import type {Question} from './Reel';

type Ctx = {keys(): string[]; (key: string): unknown};
declare const require: {context(dir: string, deep: boolean, re: RegExp): Ctx};

const load = <T,>(ctx: Ctx) =>
  Object.fromEntries(ctx.keys().map((k) => [k.replace(/^.*\/(.+)\.json$/, '$1'), ctx(k) as T])) as Record<string, T>;

export type QuestionId = string;
export const QUESTIONS = data as unknown as Record<QuestionId, Question & {status?: string}>;
export type Line = {file: string; len: number; text?: string};
export const LINES = load<Record<string, Record<string, Line>>>(require.context('./lines', false, /\.json$/));
