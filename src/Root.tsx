// Список роликов: id, размер, частота кадров, длина. Палитра — пропсом: --props='{"palette":"sunset"}'
import {Composition} from 'remotion';
import {Intro, INTRO_SECONDS, type IntroProps} from './intro/Intro';
import {Outro, OUTRO_SECONDS, type OutroProps} from './outro/Outro';
import {PALETTE_IDS, REEL} from './brand';
import {Palettes} from './Palettes';

export const RemotionRoot = () => (
  <>
    <Composition
      id="Outro"
      component={Outro}
      defaultProps={{palette: 'emerald'} satisfies OutroProps}
      durationInFrames={Math.round(OUTRO_SECONDS * REEL.fps)}
      fps={REEL.fps}
      width={REEL.width}
      height={REEL.height}
    />
    <Composition
      id="Intro"
      component={Intro}
      defaultProps={{palette: 'emerald'} satisfies IntroProps}
      durationInFrames={Math.round(INTRO_SECONDS * REEL.fps)}
      fps={REEL.fps}
      width={REEL.width}
      height={REEL.height}
    />
    <Composition
      id="Palettes"
      component={Palettes}
      durationInFrames={PALETTE_IDS.length}
      fps={REEL.fps}
      width={REEL.width}
      height={REEL.height}
    />
  </>
);
