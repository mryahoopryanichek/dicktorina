// Список роликов: id, размер, частота кадров, длина. Палитра — пропсом: --props='{"palette":"sunset"}'
import {Composition} from 'remotion';
import {Intro, INTRO_SECONDS, type IntroProps} from './intro/Intro';
import {REEL} from './brand';

export const RemotionRoot = () => (
  <Composition
    id="Intro"
    component={Intro}
    defaultProps={{palette: 'emerald'} satisfies IntroProps}
    durationInFrames={Math.round(INTRO_SECONDS * REEL.fps)}
    fps={REEL.fps}
    width={REEL.width}
    height={REEL.height}
  />
);
