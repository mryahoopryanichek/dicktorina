// Бот записи на Dикторину. Telegram шлёт сюда обновления (webhook), записи — в D1.
// /start <метка> — записать: метка = площадка, откуда пришёл (tt, ig, yt, fr — по ссылке друга).
// /stats — счётчик для решающего (только ADMIN_IDS). /whoami — свой id.

type User = {id: number; is_bot?: boolean; username?: string; first_name?: string; last_name?: string; language_code?: string};
type Message = {message_id: number; from?: User; chat: {id: number; type: string}; text?: string};
type ChatMemberUpdated = {chat: {id: number; type: string}; from: User; new_chat_member: {status: string}};
type Update = {update_id: number; message?: Message; my_chat_member?: ChatMemberUpdated};
type Button = {text: string; url: string};

const now = () => new Date().toISOString();

async function tg(env: Env, method: string, body: unknown) {
  const r = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(body),
  });
  if (!r.ok) console.error(method, r.status, await r.text());
}

const send = (env: Env, chatId: number, text: string, buttons: Button[][] = []) =>
  tg(env, 'sendMessage', {
    chat_id: chatId,
    text,
    link_preview_options: {is_disabled: true},
    ...(buttons.length ? {reply_markup: {inline_keyboard: buttons}} : {}),
  });

function buttons(env: Env): Button[][] {
  const invite = `https://t.me/${env.BOT_USERNAME}?start=fr`;
  const pitch = 'Записываюсь на Dикторину — квиз для компании. Наберём 1000 игроков — сделают. Го со мной!';
  const share = `https://t.me/share/url?url=${encodeURIComponent(invite)}&text=${encodeURIComponent(pitch)}`;
  const rows: Button[][] = [];
  if (env.GROUP_LINK) rows.push([{text: 'Вступить в группу', url: env.GROUP_LINK}]);
  rows.push([{text: 'Позвать друзей', url: share}]);
  return rows;
}

const total = async (env: Env) =>
  (await env.DB.prepare('SELECT COUNT(*) AS n FROM users').first<{n: number}>())?.n ?? 0;

// Записать или обновить. Площадку пишем только при первом /start — откуда человек пришёл впервые
async function upsert(env: Env, u: User, source: string | null) {
  const existed = await env.DB.prepare('SELECT 1 FROM users WHERE id = ?').bind(u.id).first();
  const t = now();
  await env.DB.prepare(
    `INSERT INTO users (id, username, first_name, last_name, lang, source, created_at, last_seen, blocked)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7, 0)
     ON CONFLICT (id) DO UPDATE SET username = ?2, first_name = ?3, last_name = ?4, lang = ?5,
       source = COALESCE(users.source, ?6), last_seen = ?7, blocked = 0`,
  )
    .bind(u.id, u.username ?? null, u.first_name ?? null, u.last_name ?? null, u.language_code ?? null, source, t)
    .run();
  return !existed;
}

async function stats(env: Env) {
  const day = new Date(Date.now() - 864e5).toISOString();
  const week = new Date(Date.now() - 7 * 864e5).toISOString();
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS n, SUM(created_at >= ?1) AS d1, SUM(created_at >= ?2) AS d7, SUM(blocked) AS b FROM users`,
  )
    .bind(day, week)
    .first<{n: number; d1: number | null; d7: number | null; b: number | null}>();
  const by = await env.DB.prepare(
    `SELECT COALESCE(source, 'без метки') AS s, COUNT(*) AS n FROM users GROUP BY s ORDER BY n DESC`,
  ).all<{s: string; n: number}>();
  const names: Record<string, string> = {tt: 'TikTok', ig: 'Instagram', yt: 'YouTube', fr: 'по ссылке друга'};
  return [
    `Записалось: ${row?.n ?? 0} из ${env.GOAL}`,
    `За сутки: ${row?.d1 ?? 0}, за неделю: ${row?.d7 ?? 0}`,
    '',
    'Откуда:',
    ...by.results.map((r) => `${names[r.s] ?? r.s} — ${r.n}`),
    '',
    `Заблокировали бота: ${row?.b ?? 0}`,
  ].join('\n');
}

async function onMessage(env: Env, m: Message) {
  const u = m.from;
  if (!u || u.is_bot || m.chat.type !== 'private') return;
  const text = (m.text ?? '').trim();
  const [cmd, arg] = text.split(/\s+/, 2);

  if (cmd === '/stats') {
    const admins = env.ADMIN_IDS.split(',').map((s) => s.trim());
    if (admins.includes(String(u.id))) await send(env, m.chat.id, await stats(env));
    return;
  }
  if (cmd === '/whoami') {
    await send(env, m.chat.id, `Твой id: ${u.id}`);
    return;
  }

  const source = cmd === '/start' && arg && /^[a-z0-9_]{1,32}$/i.test(arg) ? arg.toLowerCase() : null;
  const fresh = await upsert(env, u, cmd === '/start' ? source ?? 'none' : null);
  const n = await total(env);
  const text1 = fresh
    ? `Ты в списке — №${n} из ${env.GOAL}! 🙌\n\nКогда наберём ${env.GOAL} игроков, сделаем Dикторину и позовём тебя первым.` +
      (env.GROUP_LINK ? '\n\nА пока заходи в группу: там анонсы и вопросы из игры.' : '')
    : `Ты уже в списке. Нас ${n} из ${env.GOAL} — зови друзей, так быстрее 😉`;
  await send(env, m.chat.id, text1, buttons(env));
}

// Человек заблокировал бота или разблокировал — рассылке надо знать
async function onMember(env: Env, c: ChatMemberUpdated) {
  if (c.chat.type !== 'private') return;
  const blocked = c.new_chat_member.status === 'kicked' ? 1 : 0;
  await env.DB.prepare('UPDATE users SET blocked = ?, last_seen = ? WHERE id = ?').bind(blocked, now(), c.from.id).run();
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'POST' && url.pathname === '/webhook') {
      if (req.headers.get('X-Telegram-Bot-Api-Secret-Token') !== env.WEBHOOK_SECRET) {
        return new Response('forbidden', {status: 403});
      }
      const update = await req.json<Update>();
      try {
        if (update.message) await onMessage(env, update.message);
        else if (update.my_chat_member) await onMember(env, update.my_chat_member);
      } catch (e) {
        console.error('update', update.update_id, e); // Telegram получит 200 и не будет слать то же снова
      }
      return new Response('ok');
    }
    return new Response('Dикторина');
  },
} satisfies ExportedHandler<Env>;
