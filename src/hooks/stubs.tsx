// Заглушки вместо материала вопроса: картинка, видео, песня, вопрос да/нет. В настоящем ролике на их месте —
// кадр, видео или звук из игры; хук стоит поверх начала вопроса.
import type {CSSProperties, ReactNode} from 'react';
import {random} from 'remotion';
import {chipColors, type Palette} from '../brand';
import {SAFE, SAFE_W} from './kit';

// Белая рамка, как у картинок в игре
export const Framed = ({
  x = SAFE.left,
  y,
  w = SAFE_W,
  h,
  rotate = 0,
  children,
  style,
}: {
  x?: number;
  y: number;
  w?: number;
  h: number;
  rotate?: number;
  children: ReactNode;
  style?: CSSProperties;
}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: w,
      height: h,
      boxSizing: 'border-box',
      background: '#fff',
      padding: 14,
      borderRadius: 20,
      boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      transform: `rotate(${rotate}deg)`,
      ...style,
    }}
  >
    <div style={{position: 'relative', width: '100%', height: '100%', borderRadius: 10, overflow: 'hidden'}}>
      {children}
    </div>
  </div>
);

// Подпись заглушки: что тут будет в настоящем ролике
export const StubLabel = ({children, style}: {children: ReactNode; style?: CSSProperties}) => (
  <div
    style={{
      position: 'absolute',
      left: 22,
      top: 20,
      fontSize: 34,
      lineHeight: 1,
      padding: '12px 18px 14px',
      borderRadius: 12,
      background: 'rgba(0,0,0,0.55)',
      color: '#fff',
      textShadow: 'none',
      ...style,
    }}
  >
    {children}
  </div>
);

// Картинка: цветной прямоугольник с парой пятен
export const PictureArt = ({p, t, blur = 0}: {p: Palette; t: number; blur?: number}) => (
  <div
    style={{
      position: 'absolute',
      inset: blur ? -blur * 2 : 0,
      filter: blur ? `blur(${blur}px)` : undefined,
      background: `linear-gradient(160deg, ${p.high} 0%, ${p.mid} 55%, ${p.low} 100%)`,
    }}
  >
    <div
      style={{
        position: 'absolute',
        left: `${58 + Math.sin(t * 0.8) * 2}%`,
        top: '14%',
        width: '26%',
        aspectRatio: '1',
        borderRadius: '50%',
        background: '#FFF6C8',
        opacity: 0.9,
      }}
    />
    <div
      style={{
        position: 'absolute',
        left: '12%',
        top: '38%',
        width: '34%',
        height: '52%',
        borderRadius: '45% 45% 18% 18%',
        background: p.ink,
        opacity: 0.55,
      }}
    />
    <div
      style={{
        position: 'absolute',
        left: '-10%',
        right: '-10%',
        bottom: '-30%',
        height: '55%',
        borderRadius: '50%',
        background: p.low,
        opacity: 0.85,
      }}
    />
  </div>
);

export const PictureStub = ({p, t, y, h, rotate, blur}: {p: Palette; t: number; y: number; h: number; rotate?: number; blur?: number}) => (
  <Framed y={y} h={h} rotate={rotate}>
    <PictureArt p={p} t={t} blur={blur} />
    <StubLabel>картинка</StubLabel>
  </Framed>
);

// Видео: тёмный кадр, по нему что-то движется, внизу ползёт полоса времени
export const VideoStub = ({t, y, h, children}: {t: number; y: number; h: number; children?: ReactNode}) => (
  <Framed y={y} h={h}>
    <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #2B2540, #12101A)'}} />
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        style={{
          position: 'absolute',
          left: `${50 + 34 * Math.sin(t * (1.1 + i * 0.4) + i * 2)}%`,
          top: `${45 + 22 * Math.cos(t * (0.9 + i * 0.3) + i)}%`,
          width: 160 + i * 40,
          height: 160 + i * 40,
          borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
          background: ['#E8317A', '#35D0DA', '#F6C945'][i],
          opacity: 0.55,
          filter: 'blur(26px)',
        }}
      />
    ))}
    <div style={{position: 'absolute', left: 24, right: 24, bottom: 22, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.3)'}}>
      <div style={{width: `${12 + t * 9}%`, height: '100%', borderRadius: 4, background: '#fff'}} />
    </div>
    <StubLabel>видео</StubLabel>
    {children}
  </Framed>
);

// Песня: пластинка крутится, эквалайзер прыгает, под карточкой — 3 деления по секунде
export const SongCard = ({p, t, y, seconds = 3}: {p: Palette; t: number; y: number; seconds?: number}) => {
  const {fill} = chipColors(p);
  const bars = 13;
  return (
    <div style={{position: 'absolute', left: SAFE.left, top: y, width: SAFE_W}}>
      <div
        style={{
          position: 'relative',
          height: 300,
          borderRadius: 36,
          background: 'rgba(255,255,255,0.3)',
          border: '4px solid rgba(255,255,255,0.6)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.22)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 36,
            top: 34,
            width: 232,
            height: 232,
            borderRadius: '50%',
            background: 'repeating-radial-gradient(circle, #151515 0 7px, #2b2b2b 7px 10px)',
            transform: `rotate(${t * 220}deg)`,
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
          }}
        >
          <div style={{position: 'absolute', left: 76, top: 76, width: 80, height: 80, borderRadius: '50%', background: p.high}} />
          <div style={{position: 'absolute', left: 84, top: 98, width: 18, height: 18, borderRadius: '50%', background: p.low}} />
          <div style={{position: 'absolute', left: 109, top: 109, width: 14, height: 14, borderRadius: '50%', background: '#111'}} />
        </div>
        <div style={{position: 'absolute', left: 312, right: 36, top: 70, bottom: 40, display: 'flex', alignItems: 'flex-end', gap: 12}}>
          {Array.from({length: bars}, (_, i) => {
            const v = Math.abs(Math.sin(t * (5 + random(`eq${i}`) * 6) + random(`ep${i}`) * 6));
            return <div key={i} style={{flex: 1, height: `${18 + 82 * v}%`, borderRadius: 8, background: fill}} />;
          })}
        </div>
        <div style={{position: 'absolute', left: 312, top: 22, fontSize: 34, color: fill, textShadow: 'none'}}>песня</div>
      </div>
      <div style={{display: 'flex', gap: 14, marginTop: 22}}>
        {Array.from({length: seconds}, (_, i) => (
          <div key={i} style={{flex: 1, height: 26, borderRadius: 13, background: 'rgba(255,255,255,0.35)', overflow: 'hidden'}}>
            <div style={{width: `${Math.min(1, Math.max(0, t - i)) * 100}%`, height: '100%', background: fill}} />
          </div>
        ))}
      </div>
    </div>
  );
};

// Вопрос да/нет: белая карточка с вопросом-заглушкой
export const QuestionCard = ({p, y, h = 380}: {p: Palette; y: number; h?: number}) => (
  <div
    style={{
      position: 'absolute',
      left: SAFE.left,
      top: y,
      width: SAFE_W,
      height: h,
      boxSizing: 'border-box',
      padding: '44px 44px',
      borderRadius: 32,
      background: '#fff',
      color: p.ink === '#FFFFFF' ? p.low : p.ink,
      boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
      textShadow: 'none',
    }}
  >
    <div style={{fontSize: 34, opacity: 0.55, marginBottom: 26}}>вопрос</div>
    <div style={{fontSize: 64, lineHeight: 1.1}}>Да или нет?</div>
    <div style={{marginTop: 34, height: 30, width: '86%', borderRadius: 15, background: 'rgba(0,0,0,0.12)'}} />
    <div style={{marginTop: 18, height: 30, width: '58%', borderRadius: 15, background: 'rgba(0,0,0,0.12)'}} />
  </div>
);
