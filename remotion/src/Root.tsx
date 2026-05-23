import { Composition } from 'remotion';
import { V030, V030Vertical, totalFrames } from './V030';
import { V030Live, totalFramesLive } from './V030Live';
import { V030Cinematic, totalFramesCinematic } from './V030Cinematic';
import { DribbbleShot } from './shots/template';
import { SHOTS } from './shots/registry';

const FPS = 30;

// Dribbble stills — rendered with `remotion still`. 2400×1800 4:3 — publishable.
const SHOT_WIDTH = 2400;
const SHOT_HEIGHT = 1800;

export const RemotionRoot: React.FC = () => {
  const total = totalFrames();
  const totalLive = totalFramesLive();
  const totalCinematic = totalFramesCinematic();
  return (
    <>
      <Composition
        id="V030"
        component={V030}
        durationInFrames={total}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="V030Vertical"
        component={V030Vertical}
        durationInFrames={total}
        fps={FPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="V030Live"
        component={V030Live}
        durationInFrames={totalLive}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="V030Cinematic"
        component={V030Cinematic}
        durationInFrames={totalCinematic}
        fps={FPS}
        width={1920}
        height={1080}
      />
      {SHOTS.map((s) => (
        <Composition
          key={s.id}
          id={s.id}
          component={DribbbleShot}
          durationInFrames={1}
          fps={FPS}
          width={SHOT_WIDTH}
          height={SHOT_HEIGHT}
          defaultProps={{
            src: s.src,
            eyebrow: s.eyebrow,
            title: s.title,
            subtitle: s.subtitle,
            tone: s.tone,
          }}
        />
      ))}
    </>
  );
};
