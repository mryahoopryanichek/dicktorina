// Блок «как играть» после ответа (решающий, 2026-11-07), как на лендинге: телевизор с комнатой —
// QR и код BAZA, друзья заходят по одному, телефон «Саня, ты в игре!». Голос читает текст решающего,
// картинка идёт под слова: «Включите» — код, «создайте» — комната, «подключитесь» — друзья, «начинайте» — все в сборе.
// QR настоящий: ведёт в бота с меткой start=reel.
import {AbsoluteFill, Easing, Html5Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Background} from '../Background';
import {FONT, PALETTES, chipColors, type PaletteId} from '../brand';
import type {VoiceId} from '../outro/Outro';
import EXPLAIN from './explain.json';
import QR from './qr.json';

export type ExplainLine = {len: number; tv: number; room: number; join: number; go: number};
export const EXPLAIN_LINES = EXPLAIN as unknown as Record<VoiceId, ExplainLine>;
export const EXPLAIN_VOICE_AT = 0.15;
export const explainSeconds = (voice: VoiceId) => EXPLAIN_VOICE_AT + EXPLAIN_LINES[voice].len + 0.5;

const LEFT = 86;
const WIDTH = 850;
const SCREEN = '#1B1340'; // экран телевизора — тёмный при любой палитре, как на лендинге
const PLAYERS = [
  {name: 'Лёха', color: '#9B3FD9'},
  {name: 'Катя', color: '#FF6A4D'},
  {name: 'Босс', color: '#3FAE5A'},
  {name: 'Саня', color: '#3A7BEA'},
  {name: 'Тёща', color: '#E0A21B'},
];
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const Explainer = ({palette, voice}: {palette: PaletteId; voice: VoiceId}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const p = PALETTES[palette];
  const {fill, label} = chipColors(p);
  const L = EXPLAIN_LINES[voice];
  const at = (k: number) => EXPLAIN_VOICE_AT + k; // момент слова в ролике
  const pop = (start: number) => spring({frame: Math.round((t - start) * fps), fps, config: {damping: 11, stiffness: 170}});
  const rise = (start: number) => interpolate(t, [start, start + 0.35], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});

  const tvIn = rise(0.05);
  const allIn = t >= at(L.go);
  const flash = t < at(L.go) ? 0 : interpolate(t, [at(L.go), at(L.go) + 0.5], [0.35, 0], clamp);
  const splash = interpolate(t, [at(L.tv) - 0.25, at(L.tv)], [1, 0], clamp); // до «Включите» на экране — заставка
  const phone = spring({frame: Math.round((t - at(L.join) - 0.6) * fps), fps, config: {damping: 13, stiffness: 120}});
  const steps = [
    {label: 'Телевизор', at: at(L.tv)},
    {label: 'Комната', at: at(L.room)},
    {label: 'Телефоны', at: at(L.join)},
  ];

  return (
    <AbsoluteFill style={{fontFamily: FONT.fontFamily, fontWeight: 800, color: p.ink}}>
      <Background palette={p} />
      <Sequence from={Math.round(EXPLAIN_VOICE_AT * fps)} layout="none">
        <Html5Audio src={staticFile(`voices/explain-${voice}.mp3`)} />
      </Sequence>

      <div style={{position: 'absolute', left: LEFT, top: 150, opacity: rise(0)}}>
        <span style={{background: fill, color: label, borderRadius: 99, padding: '10px 26px', fontSize: 32}}>КАК МЫ ИГРАЕМ</span>
      </div>
      <div style={{position: 'absolute', left: LEFT, top: 232, width: WIDTH, fontSize: 60, lineHeight: 1.1, opacity: rise(0.1), transform: `translateY(${(1 - rise(0.1)) * 24}px)`}}>
        Играем, когда собираемся вместе
      </div>

      {/* Телевизор */}
      <div
        style={{
          position: 'absolute',
          left: LEFT - 20,
          top: 420,
          width: WIDTH + 40,
          height: 560,
          borderRadius: 30,
          background: SCREEN,
          border: '10px solid #0D0A22',
          boxShadow: '0 30px 70px rgba(0,0,0,0.4)',
          opacity: tvIn,
          transform: `translateY(${(1 - tvIn) * 60}px)`,
          color: '#fff',
          overflow: 'hidden',
        }}
      >
        <div style={{position: 'absolute', inset: 0, background: '#fff', opacity: flash}} />
        {/* Заставка на экране, пока голос читает первую фразу */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 18,
            opacity: splash,
            transform: `scale(${1 + 0.04 * Math.sin(t * 3)})`,
          }}
        >
          <div style={{fontSize: 110}}>Dикторина</div>
          <div style={{fontSize: 30, opacity: 0.8}}>игра для компании</div>
        </div>
        <div style={{position: 'absolute', left: 40, top: 30, fontSize: 40, opacity: 1 - splash}}>Dикторина</div>
        <div
          style={{
            position: 'absolute',
            right: 34,
            top: 26,
            fontSize: 26,
            background: '#fff',
            color: SCREEN,
            borderRadius: 99,
            padding: '8px 20px',
            transform: `scale(${allIn ? pop(at(L.go)) : 0})`,
          }}
        >
          Все в сборе!
        </div>
        {/* QR и код комнаты — по слову «Включите» */}
        <div
          style={{
            position: 'absolute',
            left: 40,
            top: 110,
            width: 210,
            height: 210,
            background: '#fff',
            borderRadius: 18,
            padding: 14,
            transform: `scale(${pop(at(L.tv))})`,
          }}
        >
          <svg viewBox={`0 0 ${QR.n} ${QR.n}`} shapeRendering="crispEdges" style={{width: '100%', height: '100%', display: 'block'}}>
            <path fill={SCREEN} d={QR.d} />
          </svg>
        </div>
        <div style={{position: 'absolute', left: 290, top: 112, fontSize: 28, lineHeight: 1.25, opacity: rise(at(L.tv))}}>
          Заходите с телефона.
          <br />
          Код комнаты:
        </div>
        <div style={{position: 'absolute', left: 290, top: 200, display: 'flex', gap: 14}}>
          {'BAZA'.split('').map((ch, i) => {
            const k = pop(at(L.tv) + 0.15 + i * 0.12);
            return (
              <div
                key={i}
                style={{
                  width: 86,
                  height: 96,
                  borderRadius: 16,
                  background: '#fff',
                  color: SCREEN,
                  fontSize: 58,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: `rotateX(${(1 - k) * 90}deg)`,
                  opacity: Math.min(1, k * 2),
                }}
              >
                {ch}
              </div>
            );
          })}
        </div>
        <div style={{position: 'absolute', left: 290, top: 312, fontSize: 24, opacity: 0.8 * rise(at(L.room))}}>или наведи камеру на QR</div>
        {/* Друзья заходят по одному — по слову «подключитесь» */}
        <div style={{position: 'absolute', left: 40, top: 380, display: 'flex', gap: 34}}>
          {PLAYERS.map((pl, i) => {
            const k = pop(at(L.join) + i * 0.2);
            return (
              <div key={pl.name} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, transform: `scale(${k})`, opacity: Math.min(1, k * 2)}}>
                <div
                  style={{
                    width: 92,
                    height: 92,
                    borderRadius: '50%',
                    background: pl.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 42,
                    boxShadow: pl.name === 'Саня' ? '0 0 0 6px #fff' : undefined,
                  }}
                >
                  {pl.name[0]}
                </div>
                <div style={{fontSize: 24}}>{pl.name}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{position: 'absolute', left: LEFT + WIDTH / 2 - 120, top: 990, width: 240, height: 26, borderRadius: 8, background: '#0D0A22', opacity: tvIn}} />

      {/* Телефон Сани */}
      <div
        style={{
          position: 'absolute',
          left: 590,
          top: 990,
          width: 310,
          height: 510,
          borderRadius: 54,
          background: '#0D0A22',
          padding: 14,
          boxShadow: '0 30px 60px rgba(0,0,0,0.45)',
          transform: `translateX(${(1 - phone) * 520}px) rotate(${6 * (1 - phone) - 3}deg)`,
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 42,
            background: `linear-gradient(205deg, ${p.high}, ${p.mid} 55%, ${p.low})`,
            padding: '100px 28px 0',
            color: p.ink,
          }}
        >
          <div style={{width: 92, height: 92, borderRadius: '50%', background: fill, color: label, fontSize: 56, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>✓</div>
          <div style={{fontSize: 34, lineHeight: 1.1, marginTop: 24}}>Саня, ты в игре!</div>
          <div style={{fontSize: 26, marginTop: 16, opacity: 0.85}}>Смотри на телевизор</div>
        </div>
      </div>

      {/* Шаги под голос */}
      <div style={{position: 'absolute', left: LEFT, top: 1060, display: 'flex', flexDirection: 'column', gap: 16}}>
        {steps.map((st, i) => {
          const on = t >= st.at;
          const k = rise(st.at);
          return (
            <div
              key={st.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                fontSize: 40,
                opacity: 0.35 + 0.65 * k,
                transform: `translateX(${(1 - k) * -20}px)`,
              }}
            >
              <span
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: '50%',
                  background: on ? fill : `${p.ink}26`,
                  color: on ? label : p.ink,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 32,
                }}
              >
                {i + 1}
              </span>
              {st.label}
            </div>
          );
        })}
        <div style={{fontSize: 52, marginTop: 8, transform: `scale(${allIn ? pop(at(L.go)) : 0})`, transformOrigin: 'left center'}}>Поехали!</div>
      </div>
    </AbsoluteFill>
  );
};
