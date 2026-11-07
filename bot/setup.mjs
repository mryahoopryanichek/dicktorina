// Настройка бота после `wrangler deploy`: секреты воркера, webhook, описание и меню команд.
// Значения — из ../.env: BOT_TOKEN, WEBHOOK_URL (адрес воркера), GROUP_LINK, ADMIN_IDS; WEBHOOK_SECRET создаётся сам.
import {appendFileSync, readFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {spawnSync} from 'node:child_process';

const ENV = new URL('../.env', import.meta.url);
const env = Object.fromEntries(
  readFileSync(ENV, 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);
for (const k of ['BOT_TOKEN', 'WEBHOOK_URL']) {
  if (!env[k]) throw new Error(`нет ${k} в .env`);
}
if (!env.WEBHOOK_SECRET) {
  env.WEBHOOK_SECRET = randomBytes(24).toString('hex');
  appendFileSync(ENV, `\nWEBHOOK_SECRET=${env.WEBHOOK_SECRET}\n`);
}

// Секреты воркера — через stdin, в консоль не попадают
const secrets = {
  BOT_TOKEN: env.BOT_TOKEN,
  WEBHOOK_SECRET: env.WEBHOOK_SECRET,
  GROUP_LINK: env.GROUP_LINK ?? '',
  ADMIN_IDS: env.ADMIN_IDS ?? '',
};
const put = spawnSync('npx wrangler secret bulk', {input: JSON.stringify(secrets), stdio: ['pipe', 'inherit', 'inherit'], shell: true});
if (put.status !== 0) throw new Error('wrangler secret bulk не прошёл');

async function tg(method, body) {
  const r = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(body),
  });
  const j = await r.json();
  console.log(method, j.ok ? 'ок' : j.description);
  if (!j.ok) process.exitCode = 1;
}

await tg('setWebhook', {
  url: `${env.WEBHOOK_URL.replace(/\/$/, '')}/webhook`,
  secret_token: env.WEBHOOK_SECRET,
  allowed_updates: ['message', 'callback_query', 'my_chat_member'],
});
await tg('setMyDescription', {
  description:
    'Dикторина — квиз для компании: песни, картинки, видео.\n\n' +
    'Жми «Старт» — запишем тебя. Наберём 1000 игроков — сделаем игру и позовём тебя первым.',
});
await tg('setMyShortDescription', {short_description: 'Квиз для компании. Наберём 1000 игроков — сделаем игру.'});
await tg('setMyCommands', {commands: [{command: 'start', description: 'Записаться'}]});
for (const id of (env.ADMIN_IDS ?? '').split(',').map((s) => s.trim()).filter(Boolean)) {
  await tg('setMyCommands', {
    commands: [
      {command: 'start', description: 'Записаться'},
      {command: 'stats', description: 'Сколько записалось'},
    ],
    scope: {type: 'chat', chat_id: Number(id)},
  });
}
