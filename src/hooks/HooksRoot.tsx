// Композиции хуков — отдельно от основного src/Root.tsx. HooksPreview — все варианты подряд,
// Hook01…Hook13 — по одному. Закрытые зоны показать: --props='{"zones":true}'
import {Composition} from 'remotion';
import {REEL} from '../brand';
import {HookOne, HooksPreview, hooksFrames, type HooksPreviewProps} from './Preview';
import {HOOKS} from './variants';

export const HooksRoot = () => (
  <>
    <Composition
      id="HooksPreview"
      component={HooksPreview}
      defaultProps={{zones: false} satisfies HooksPreviewProps}
      durationInFrames={hooksFrames(REEL.fps)}
      fps={REEL.fps}
      width={REEL.width}
      height={REEL.height}
    />
    {HOOKS.map((h, i) => (
      <Composition
        key={i}
        id={`Hook${String(i + 1).padStart(2, '0')}`}
        component={HookOne}
        defaultProps={{n: i + 1, zones: false}}
        durationInFrames={Math.round(h.seconds * REEL.fps)}
        fps={REEL.fps}
        width={REEL.width}
        height={REEL.height}
      />
    ))}
  </>
);
