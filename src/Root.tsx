// Список роликов: id, размер, частота кадров, длина
import {Composition} from 'remotion';
import {Intro, INTRO_SECONDS} from './intro/Intro';
import {REEL} from './brand';

export const RemotionRoot = () => (
  <Composition
    id="Intro"
    component={Intro}
    durationInFrames={Math.round(INTRO_SECONDS * REEL.fps)}
    fps={REEL.fps}
    width={REEL.width}
    height={REEL.height}
  />
);
