import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
  HueSaturation,
  Vignette,
} from '@react-three/postprocessing';
import { tokens } from '@virgil/visual-language';
import { BlendFunction } from 'postprocessing';
import { useSettings } from '../ui/settings.js';

/** Post pipeline by tier. Bloom is capped by the tokens so labels never wash out. */
export function Effects({ mono = false }: { mono?: boolean } = {}) {
  const { tier } = useSettings();
  if (tier === 'constrained') return null;
  const intensity = tier === 'mobile' ? 0.3 : tier === 'laptop' ? 0.42 : tokens.bloom.intensityMax;
  const resScale = tier === 'mobile' || tier === 'laptop' ? 0.25 : 0.5;
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom
        intensity={intensity}
        luminanceThreshold={tokens.bloom.thresholdMin}
        luminanceSmoothing={0.15}
        mipmapBlur
        resolutionScale={resScale}
      />
      {tier === 'ultra' || tier === 'desktop' ? (
        <ChromaticAberration
          blendFunction={BlendFunction.NORMAL}
          offset={[0.0008, 0.0006]}
          radialModulation
          modulationOffset={0.4}
        />
      ) : (
        <></>
      )}
      <Vignette eskil={false} offset={0.22} darkness={0.55} />
      {mono ? <HueSaturation saturation={-1} /> : <></>}
    </EffectComposer>
  );
}
