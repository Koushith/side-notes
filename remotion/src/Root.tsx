import { Composition } from 'remotion';
import { V030, V030Vertical, totalFrames } from './V030';
import { V030Live, totalFramesLive } from './V030Live';

const FPS = 30;

export const RemotionRoot: React.FC = () => {
  const total = totalFrames();
  const totalLive = totalFramesLive();
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
    </>
  );
};
