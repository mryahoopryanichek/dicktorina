// Варианты хука — первые ~2 с ролика: остановить пролистывание и зацепить. Каждый — шаблон: текст и движение
// одни, под ними — материал вопроса своего типа (тут заглушки). Тексты и почему держит — out/hooks/hooks.md.
import type {FC} from 'react';
import {AbsoluteFill, Easing, random} from 'remotion';
import {PALETTES, chipColors, textWidth, type Palette, type PaletteId} from '../brand';
import {Block, Chip, FITW, Line, SAFE, SAFE_W, clamp01, fit, pop, shake, useTime} from './kit';
import {PictureStub, QuestionCard, SongCard, VideoStub} from './stubs';

export type HookProps = {p: Palette};
const LH = 1.12; // межстрочие строк хука, доля кегля
const TOP = SAFE.top + 30; // верх первой строки
const after = (lines: number, size: number, gap = 60) => TOP + lines * size * LH + gap; // низ блока строк + отступ
const BOTTOM = 1460; // низ заглушек: ниже — подпись и ник
const mid = (top: number, h: number) => Math.max(top, Math.round((top + BOTTOM - h) / 2)); // по центру свободного места
const TILT = 44; // отступ над повёрнутой плашкой: её правый край поднимается и иначе наезжает на строку выше
const SONG_H = 356; // высота SongCard с делениями секунд

// 1. «Тебе за 30» — песня
const Age: FC<HookProps> = ({p}) => {
  const {t} = useTime();
  const S = fit(['Узнаешь', 'за 3 секунды —', 'тебе точно'], FITW, 120);
  const sh = shake(t, 0.75, 0.4, 14);
  return (
    <AbsoluteFill style={{transform: `translate(${sh.x}px, ${sh.y}px)`}}>
      <Block p={p}>
        <Line size={S}>Узнаешь</Line>
        <Line size={S}>за 3 секунды —</Line>
        <Line size={S} at={0.7}>
          тебе точно
        </Line>
        <Line size={S} at={0.78} rotate={-3} style={{marginTop: TILT / 2}}>
          <Chip p={p}>за 30</Chip>
        </Line>
      </Block>
      <SongCard p={p} t={t} y={mid(after(4, S, 60 + TILT / 2), SONG_H)} />
    </AbsoluteFill>
  );
};

// 2. «СТОП. Ты знаешь эту песню. Не ври» — песня
const Stop: FC<HookProps> = ({p}) => {
  const {t} = useTime();
  const CUT = 0.55;
  const big = fit(['СТОП  '], FITW, 250);
  const S = fit(['Ты знаешь', 'эту песню.'], FITW, 118);
  const sh = shake(t, 0, CUT, 18);
  const sh2 = shake(t, 1.05, 0.3, 12);
  return (
    <AbsoluteFill style={{transform: `translate(${sh2.x}px, ${sh2.y}px)`}}>
      {t < CUT ? (
        <div style={{position: 'absolute', left: SAFE.left + sh.x, top: TOP + 60 + sh.y, fontSize: big, lineHeight: 1}}>
          <Chip p={p}>СТОП</Chip>
        </div>
      ) : (
        <Block p={p}>
          <Line size={S} at={CUT}>
            Ты знаешь
          </Line>
          <Line size={S} at={CUT + 0.08}>
            эту песню.
          </Line>
          <Line size={S} at={1.05} rotate={-3} style={{marginTop: TILT / 2}}>
            <Chip p={p}>Не ври.</Chip>
          </Line>
        </Block>
      )}
      <SongCard p={p} t={t} y={mid(after(3, S, 60 + TILT), SONG_H)} />
    </AbsoluteFill>
  );
};

// 3. «Самый ███ вопрос нашей игры» — любой тип
const Censor: FC<HookProps> = ({p}) => {
  const {t, frame} = useTime();
  const S = fit(['нашей игры', 'вопрос'], FITW, 124);
  const barW = textWidth('отбитый', S);
  const wipe = Easing.out(Easing.cubic)(clamp01(t / 0.3));
  const j = Math.floor(frame / 4);
  const jx = (random(`cx${j}`) - 0.5) * 6;
  const jr = (random(`cr${j}`) - 0.5) * 2;
  const small = fit(['чуть не вырезали  '], FITW, 66);
  return (
    <AbsoluteFill>
      <Block p={p}>
        <Line size={S}>Самый</Line>
        <div style={{height: S * LH, display: 'flex', alignItems: 'center'}}>
          <div
            style={{
              width: barW * wipe,
              height: S * 0.86,
              background: '#0A0A0A',
              borderRadius: 10,
              transform: `translateX(${jx}px) rotate(${jr - 1}deg)`,
              boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
            }}
          />
        </div>
        <Line size={S}>вопрос</Line>
        <Line size={S}>нашей игры</Line>
        <Line size={small} at={1.0} rotate={-3} style={{marginTop: TILT}}>
          <Chip p={p}>чуть не вырезали</Chip>
        </Line>
      </Block>
      <PictureStub p={p} t={t} y={after(4, S, small * 1.2 + TILT + 70)} h={BOTTOM - after(4, S, small * 1.2 + TILT + 70)} rotate={1.5} />
    </AbsoluteFill>
  );
};

// Полоса «осторожно»: жёлто-чёрная, бежит
const Hazard = ({y, t, rotate, dir = 1}: {y: number; t: number; rotate: number; dir?: number}) => (
  <div
    style={{
      position: 'absolute',
      left: -200,
      width: 1480,
      top: y,
      height: 66,
      transform: `rotate(${rotate}deg)`,
      background: 'repeating-linear-gradient(45deg, #111 0 42px, #FFD21F 42px 84px)',
      backgroundPosition: `${dir * t * 240}px 0`,
      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
    }}
  />
);

// 4. «Уберите детей от экрана… и бабушку» — любой тип
const Kids: FC<HookProps> = ({p}) => {
  const {t} = useTime();
  const S = fit(['Уберите детей', 'от экрана'], FITW, 120);
  const small = fit(['…и бабушку  '], FITW, 104);
  const blink = t < 1.0 ? (Math.sin(t * Math.PI * 2 * 2.5) > 0 ? 1 : 0.35) : 1;
  const alarm = t < 1.0 ? 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 2.5) : 0;
  const sh = shake(t, 1.0, 0.35, 14);
  const top = TOP + 250;
  const band2 = top + 2 * S * LH + small * 1.2 + TILT + 60;
  const picY = band2 + 130;
  return (
    <AbsoluteFill style={{transform: `translate(${sh.x}px, ${sh.y}px)`}}>
      <AbsoluteFill style={{background: 'radial-gradient(80% 60% at 50% 40%, transparent 40%, rgba(255,0,0,0.55) 100%)', opacity: alarm * 0.6}} />
      <Hazard y={TOP - 10} t={t} rotate={-3} />
      <svg width="140" height="124" viewBox="0 0 140 124" style={{position: 'absolute', left: SAFE.left, top: TOP + 104, opacity: blink}}>
        <path d="M70 6 L134 118 H6 Z" fill="#FFD21F" stroke="#111" strokeWidth="9" strokeLinejoin="round" />
        <rect x="63" y="40" width="14" height="44" rx="5" fill="#111" />
        <circle cx="70" cy="99" r="8" fill="#111" />
      </svg>
      <Block p={p} top={top}>
        <Line size={S}>Уберите детей</Line>
        <Line size={S}>от экрана</Line>
        <Line size={small} at={1.0} rotate={-4} style={{marginTop: TILT}}>
          <Chip p={p}>…и бабушку</Chip>
        </Line>
      </Block>
      <Hazard y={band2} t={t} rotate={2} dir={-1} />
      <PictureStub p={p} t={t} y={picY} h={BOTTOM - picY} />
    </AbsoluteFill>
  );
};

// Человечек для сетки игроков
const Person = ({color, size}: {color: string; size: number}) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={{display: 'block'}}>
    <circle cx="50" cy="30" r="19" fill={color} />
    <path d="M13 97 C13 66 30 55 50 55 C70 55 87 66 87 97 Z" fill={color} />
  </svg>
);

// 5. «Угадали: 1 из 12. А ты?» — любой тип
const OneOf: FC<HookProps> = ({p}) => {
  const {t} = useTime();
  const {label} = chipColors(p);
  const TOTAL = 12;
  const KEEP = 6;
  // Остальные гаснут по одному в случайном порядке
  const order = Array.from({length: TOTAL}, (_, i) => i)
    .filter((i) => i !== KEEP)
    .sort((a, b) => random(`o${a}`) - random(`o${b}`));
  const offAt = (i: number) => 0.15 + order.indexOf(i) * 0.075;
  const left = TOTAL - order.filter((i) => t >= offAt(i)).length;
  const S1 = fit(['Угадали:'], FITW, 110);
  const S2 = fit(['12 из 12'], FITW, 170);
  const S3 = fit(['А ты?  '], FITW, 104);
  const gridY = mid(after(2, (S1 + S2) / 2, S3 * 1.2 + 30 + 60), 3 * 196);
  const cell = SAFE_W / 4;
  const ring = t > 1.0 ? 0.5 + 0.5 * Math.sin((t - 1.0) * Math.PI * 4) : 0;
  return (
    <AbsoluteFill>
      <Block p={p}>
        <Line size={S1}>Угадали:</Line>
        <Line size={S2}>{`${left} из ${TOTAL}`}</Line>
        <Line size={S3} at={1.15} rotate={-3} style={{marginTop: 30}}>
          <Chip p={p}>А ты?</Chip>
        </Line>
      </Block>
      {Array.from({length: TOTAL}, (_, i) => {
        const keep = i === KEEP;
        const k = keep ? 0 : clamp01((t - offAt(i)) / 0.12);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: SAFE.left + (i % 4) * cell + (cell - 170) / 2,
              top: gridY + Math.floor(i / 4) * 196,
              opacity: 1 - 0.78 * k,
              transform: `scale(${(1 - 0.18 * k) * (keep ? 1 + 0.1 * ring : 1)})`,
            }}
          >
            {keep && (
              <div
                style={{
                  position: 'absolute',
                  inset: -18,
                  borderRadius: '50%',
                  background: label,
                  opacity: 0.35 + 0.45 * ring,
                  filter: 'blur(14px)',
                }}
              />
            )}
            <div style={{position: 'relative'}}>
              <Person color={p.ink} size={170} />
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// 6. «Мы из-за этого поругались» + шкала ДА/НЕТ — да/нет
const Fight: FC<HookProps> = ({p}) => {
  const {t} = useTime();
  const {fill, label} = chipColors(p);
  const S = fit(['Мы из-за этого', 'поругались'], FITW, 118);
  // Доля «да» мечется около половины, но не уже 42 % — надписи должны влезать в свою половину
  const yes = 50 + 6 * Math.sin(t * 6.1) + 2 * Math.sin(t * 17.3 + 1);
  const pct = Math.round(yes);
  const sh = shake(t, 0.3, 0.35, 12);
  const barY = mid(after(2, S, 60), 160 + 70 + 420);
  return (
    <AbsoluteFill style={{transform: `translate(${sh.x}px, ${sh.y}px)`}}>
      <Block p={p}>
        <Line size={S}>Мы из-за этого</Line>
        <Line size={S} at={0.3}>
          поругались
        </Line>
      </Block>
      <div
        style={{
          position: 'absolute',
          left: SAFE.left,
          top: barY,
          width: SAFE_W,
          height: 160,
          borderRadius: 80,
          overflow: 'hidden',
          background: '#fff',
          boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
          textShadow: 'none',
          fontSize: 54,
        }}
      >
        <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: `${yes}%`, background: fill}} />
        <div style={{position: 'absolute', left: `${yes}%`, top: -10, bottom: -10, width: 14, marginLeft: -7, background: label, transform: 'skewX(-14deg)'}} />
        <div style={{position: 'absolute', left: 44, top: 0, height: 160, display: 'flex', alignItems: 'center', color: label}}>
          ДА {pct}%
        </div>
        <div style={{position: 'absolute', right: 44, top: 0, height: 160, display: 'flex', alignItems: 'center', color: fill}}>
          НЕТ {100 - pct}%
        </div>
      </div>
      <QuestionCard p={p} y={barY + 230} h={420} />
    </AbsoluteFill>
  );
};

// 7. «Кто-то это продаёт. За деньги.» + ценник, цифры крутятся — цена
const Price: FC<HookProps> = ({p}) => {
  const {t, frame} = useTime();
  const S = fit(['Кто-то это', 'продаёт.'], FITW, 120);
  const S3 = fit(['За деньги.  '], FITW, 100);
  const PIC_H = 600;
  const picY = mid(after(2, S, S3 * 1.2 + TILT + 60), PIC_H);
  const tick = Math.floor(frame / 3);
  const d = (i: number) => Math.floor(random(`d${i}-${tick}`) * 10);
  const swing = -6 + 9 * Math.sin(t * 5.2) * Math.exp(-t * 0.5);
  return (
    <AbsoluteFill>
      <Block p={p}>
        <Line size={S}>Кто-то это</Line>
        <Line size={S}>продаёт.</Line>
        <Line size={S3} at={0.75} rotate={-3} style={{marginTop: TILT}}>
          <Chip p={p}>За деньги.</Chip>
        </Line>
      </Block>
      <PictureStub p={p} t={t} y={picY} h={PIC_H} rotate={-2} />
      <div
        style={{
          position: 'absolute',
          left: 440,
          top: picY + PIC_H - 200,
          width: 480,
          height: 200,
          transformOrigin: '36px 50%',
          transform: `rotate(${swing}deg)`,
          filter: 'drop-shadow(0 14px 22px rgba(0,0,0,0.35))',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: '#fff',
            clipPath: 'polygon(14% 0, 100% 0, 100% 100%, 14% 100%, 0 50%)',
            borderRadius: 16,
          }}
        />
        <div style={{position: 'absolute', left: 26, top: 88, width: 24, height: 24, borderRadius: '50%', background: p.low}} />
        <div style={{position: 'absolute', left: 92, top: 26, fontSize: 74, lineHeight: 1, color: '#151515', textShadow: 'none', whiteSpace: 'nowrap'}}>
          {[0, 1, -1, 2, 3, 4].map((i) =>
            i < 0 ? (
              <span key="sp" style={{display: 'inline-block', width: 22}} />
            ) : (
              <span key={i} style={{display: 'inline-block', width: 54, textAlign: 'center'}}>
                {d(i)}
              </span>
            ),
          )}
          <span style={{marginLeft: 8}}>₽</span>
        </div>
        <div style={{position: 'absolute', left: 96, top: 126, fontSize: 40, color: p.low, textShadow: 'none'}}>±5 000 ₽</div>
      </div>
    </AbsoluteFill>
  );
};

// 8. «Угадай размер. ±1 см» + линейка — «плюс-минус»
const Size: FC<HookProps> = ({p}) => {
  const {t, frame, fps} = useTime();
  const {fill, label} = chipColors(p);
  const S = fit(['Угадай', 'размер.'], FITW, 160);
  const S3 = fit(['±1 см  '], FITW, 118);
  const sh = shake(t, 0.55, 0.35, 14);
  const rulerY = after(2, S, S3 * 1.2 + TILT + 60);
  const MAX = SAFE_W - 110; // линейка + «?» на конце (заходит на 20 px, шириной 120) — не правее SAFE.right
  const len = MAX * (0.22 + 0.78 * Easing.out(Easing.cubic)(clamp01(t / 1.3)));
  const CM = 40;
  const q = pop(frame, fps, 1.25);
  return (
    <AbsoluteFill style={{transform: `translate(${sh.x}px, ${sh.y}px)`}}>
      <Block p={p}>
        <Line size={S}>Угадай</Line>
        <Line size={S}>размер.</Line>
        <Line size={S3} at={0.55} rotate={-3} style={{marginTop: TILT / 2}}>
          <Chip p={p}>±1 см</Chip>
        </Line>
      </Block>
      <div
        style={{
          position: 'absolute',
          left: SAFE.left,
          top: rulerY,
          width: len,
          height: 150,
          boxSizing: 'border-box',
          background: 'linear-gradient(180deg, #FBE38A, #F2C94C)',
          border: `6px solid ${fill}`,
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 18px 40px rgba(0,0,0,0.28)',
          textShadow: 'none',
        }}
      >
        {Array.from({length: Math.ceil(MAX / (CM / 2)) + 1}, (_, i) => (
          <div key={i} style={{position: 'absolute', left: 14 + (i * CM) / 2, top: 0, width: 4, height: i % 2 ? 30 : 54, background: '#2A2108'}} />
        ))}
        {Array.from({length: Math.floor((MAX - 50) / (CM * 2)) + 1}, (_, i) => (
          <div key={i} style={{position: 'absolute', left: 14 + i * CM * 2 - 30, width: 60, top: 64, fontSize: 30, textAlign: 'center', color: '#2A2108'}}>
            {i * 2}
          </div>
        ))}
      </div>
      <div
        style={{
          position: 'absolute',
          left: SAFE.left + len - 20,
          top: rulerY + 75 - 60,
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: fill,
          color: label,
          fontSize: 84,
          lineHeight: '120px',
          textAlign: 'center',
          textShadow: 'none',
          transform: `scale(${0.4 + 0.6 * q})`,
          opacity: clamp01(q * 3),
        }}
      >
        ?
      </div>
      <PictureStub p={p} t={t} y={rulerY + 220} h={BOTTOM - rulerY - 220} />
    </AbsoluteFill>
  );
};

// 9. «Жми паузу, когда поймёшь, чем кончится» — видео
const Pause: FC<HookProps> = ({p}) => {
  const {t, frame, fps} = useTime();
  const S = fit(['Жми паузу,', 'когда поймёшь,', 'чем кончится  '], FITW, 112);
  const h = Math.round((SAFE_W - 28) * (9 / 16)) + 28;
  const vidY = mid(after(3, S, 60), h);
  const k = pop(frame, fps, 0.3);
  const beat = 1 + 0.1 * Math.pow(Math.abs(Math.sin(t * Math.PI * 1.6)), 2);
  return (
    <AbsoluteFill>
      <Block p={p}>
        <Line size={S}>Жми паузу,</Line>
        <Line size={S}>когда поймёшь,</Line>
        <Line size={S} at={0.5}>
          чем <Chip p={p}>кончится</Chip>
        </Line>
      </Block>
      <VideoStub t={t} y={vidY} h={h}>
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 190,
            height: 190,
            marginLeft: -95,
            marginTop: -95,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.92)',
            transform: `scale(${k * beat})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 26,
            boxShadow: '0 0 0 14px rgba(255,255,255,0.25)',
          }}
        >
          <div style={{width: 30, height: 86, borderRadius: 8, background: p.low}} />
          <div style={{width: 30, height: 86, borderRadius: 8, background: p.low}} />
        </div>
      </VideoStub>
    </AbsoluteFill>
  );
};

// 10. «Угадай, пока размыто. Потом будет стыдно» — картинка
const Blur: FC<HookProps> = ({p}) => {
  const {t} = useTime();
  const S = fit(['Угадай,', 'пока размыто'], FITW, 120);
  const S3 = fit(['потом будет стыдно  '], FITW, 64);
  const picY = after(2, S, S3 * 1.2 + TILT + 60);
  const blur = 44 - 14 * clamp01(t / 2);
  return (
    <AbsoluteFill>
      <Block p={p}>
        <Line size={S}>Угадай,</Line>
        <Line size={S}>пока размыто</Line>
        <Line size={S3} at={1.0} rotate={-2} style={{marginTop: TILT}}>
          <Chip p={p}>потом будет стыдно</Chip>
        </Line>
      </Block>
      <PictureStub p={p} t={t} y={picY} h={1450 - picY} blur={blur} />
    </AbsoluteFill>
  );
};

// 11. «Опиши это без мата. Не сможешь.» — картинка, видео
const NoSwear: FC<HookProps> = ({p}) => {
  const {t} = useTime();
  const S = fit(['Опиши это', 'без мата.'], FITW, 130);
  const S3 = fit(['Не сможешь.  '], FITW, 100);
  const picY = after(2, S, S3 * 1.2 + TILT + 60);
  const picH = BOTTOM - 70 - picY;
  return (
    <AbsoluteFill>
      <Block p={p}>
        <Line size={S}>Опиши это</Line>
        <Line size={S}>без мата.</Line>
        <Line size={S3} at={0.8} rotate={-3} style={{marginTop: TILT}}>
          <Chip p={p}>Не сможешь.</Chip>
        </Line>
      </Block>
      <PictureStub p={p} t={t} y={picY} h={picH} rotate={1.5} />
      <div
        style={{
          position: 'absolute',
          left: SAFE.left + 30,
          top: picY + picH - 50,
          height: 120,
          padding: '0 36px 0 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 22,
          borderRadius: 60,
          background: '#fff',
          boxShadow: '0 16px 40px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{width: 76, height: 76, borderRadius: '50%', background: p.mid}} />
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: '#333',
              transform: `translateY(${-12 * Math.max(0, Math.sin(t * 9 - i * 0.9))}px)`,
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};

// 12. «Грузим вопрос, за который нас забанят» + 8=====D растёт как полоса загрузки — любой тип
const Loading: FC<HookProps> = ({p}) => {
  const {t} = useTime();
  const {fill} = chipColors(p);
  const S = fit(['Грузим вопрос,', 'за который', 'нас забанят'], FITW, 112);
  const N = 8;
  const Sb = fit(['8' + '='.repeat(N) + 'D'], FITW, 170);
  const n = Math.round(N * Easing.out(Easing.quad)(clamp01(t / 1.5)));
  const pct = Math.min(97, Math.round(97 * Easing.out(Easing.quad)(clamp01(t / 1.4))));
  const logoY = mid(after(3, S, 60), Sb * 1.25 + 124);
  return (
    <AbsoluteFill>
      <Block p={p}>
        <Line size={S}>Грузим вопрос,</Line>
        <Line size={S}>за который</Line>
        <Line size={S}>
          нас <Chip p={p}>забанят</Chip>
        </Line>
      </Block>
      <div style={{position: 'absolute', left: SAFE.left, top: logoY, fontSize: Sb, lineHeight: 1, whiteSpace: 'nowrap'}}>
        {'8' + '='.repeat(n) + 'D'}
      </div>
      <div
        style={{
          position: 'absolute',
          left: SAFE.left,
          top: logoY + Sb * 1.25,
          width: SAFE_W,
          height: 40,
          borderRadius: 20,
          background: 'rgba(255,255,255,0.45)',
          overflow: 'hidden',
        }}
      >
        <div style={{width: `${pct}%`, height: '100%', borderRadius: 20, background: fill}} />
      </div>
      <div style={{position: 'absolute', left: SAFE.left, top: logoY + Sb * 1.25 + 64, fontSize: 52}}>
        загрузка {pct}%
      </div>
    </AbsoluteFill>
  );
};

// 13. «Скинь другу, который шутит ниже пояса» — любой тип
const Friend: FC<HookProps> = ({p}) => {
  const {t, frame, fps} = useTime();
  const {fill, label} = chipColors(p);
  const S = fit(['Скинь другу,', 'который шутит', 'ниже пояса  '], FITW, 112);
  const D = 150;
  const rowY = mid(after(3, S, 60), D + 200);
  const gap = (SAFE_W - 5 * D) / 4;
  const hops = [0, 1, 2, 3, 4, 3, 1, 2];
  const step = Math.min(hops.length - 1, Math.max(0, Math.floor((t - 0.1) / 0.12)));
  const at = hops[step];
  const done = 0.1 + (hops.length - 1) * 0.12;
  const land = pop(frame, fps, done, 8);
  const tagK = pop(frame, fps, done + 0.1);
  const colors = [PALETTES.ruby.mid, PALETTES.sky.mid, PALETTES.emerald.low, PALETTES.gold.mid, PALETTES.grape.mid];
  const letters = ['А', 'Д', 'С', 'Ж', 'К'];
  const cx = (i: number) => SAFE.left + i * (D + gap);
  return (
    <AbsoluteFill>
      <Block p={p}>
        <Line size={S}>Скинь другу,</Line>
        <Line size={S}>который шутит</Line>
        <Line size={S} at={0.35}>
          <Chip p={p}>ниже пояса</Chip>
        </Line>
      </Block>
      {colors.map((c, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: cx(i),
            top: rowY,
            width: D,
            height: D,
            borderRadius: '50%',
            background: c,
            border: '6px solid #fff',
            boxSizing: 'border-box',
            color: '#fff',
            fontSize: 70,
            lineHeight: `${D - 12}px`,
            textAlign: 'center',
            textShadow: 'none',
            boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
          }}
        >
          {letters[i]}
        </div>
      ))}
      <div
        style={{
          position: 'absolute',
          left: cx(at) - 16,
          top: rowY - 16,
          width: D + 32,
          height: D + 32,
          borderRadius: '50%',
          border: `12px solid ${fill}`,
          boxSizing: 'border-box',
          transform: `scale(${1 + 0.18 * land * Math.exp(-(t - done) * 3) * (t > done ? 1 : 0)})`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: cx(2) + D / 2 - 300,
          width: 600,
          top: rowY + D + 30,
          fontSize: 64,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          opacity: clamp01(tagK * 3),
          transform: `scale(${0.5 + 0.5 * tagK})`,
          transformOrigin: '50% 0',
        }}
      >
        <svg width="60" height="40" viewBox="0 0 60 40" style={{display: 'block', marginBottom: -2}}>
          <path d="M30 0 L60 40 H0 Z" fill={fill} />
        </svg>
        <span
          style={{
            display: 'inline-block',
            background: fill,
            color: label,
            borderRadius: 14,
            padding: '6px 20px 12px',
            textShadow: 'none',
          }}
        >
          вот этому
        </span>
      </div>
    </AbsoluteFill>
  );
};

export type HookDef = {
  title: string; // коротко, для подписи в углу превью
  kind: string; // тип вопроса
  palette: PaletteId;
  seconds: number;
  C: FC<HookProps>;
};

export const HOOKS: HookDef[] = [
  {title: 'Тебе за 30', kind: 'песня', palette: 'synth', seconds: 2.2, C: Age},
  {title: 'СТОП. Не ври', kind: 'песня', palette: 'candy', seconds: 2.2, C: Stop},
  {title: 'Самый ███ вопрос', kind: 'любой', palette: 'night', seconds: 2.0, C: Censor},
  {title: 'Уберите детей', kind: 'любой', palette: 'ruby', seconds: 2.2, C: Kids},
  {title: 'Угадали 1 из 12', kind: 'любой', palette: 'sky', seconds: 2.2, C: OneOf},
  {title: 'Мы поругались', kind: 'да/нет', palette: 'sunset', seconds: 2.0, C: Fight},
  {title: 'Кто-то это продаёт', kind: 'цена', palette: 'gold', seconds: 2.0, C: Price},
  {title: 'Угадай размер', kind: '± плюс-минус', palette: 'emerald', seconds: 2.0, C: Size},
  {title: 'Чем кончится', kind: 'видео', palette: 'grape', seconds: 2.0, C: Pause},
  {title: 'Пока размыто', kind: 'картинка', palette: 'lagoon', seconds: 2.0, C: Blur},
  {title: 'Без мата', kind: 'картинка', palette: 'orchid', seconds: 2.0, C: NoSwear},
  {title: 'Загрузка 8=D', kind: 'любой', palette: 'spring', seconds: 2.0, C: Loading},
  {title: 'Скинь другу', kind: 'любой', palette: 'night', seconds: 2.0, C: Friend},
];
