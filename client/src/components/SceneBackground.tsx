// Full-screen painted artwork behind a page, with an optional dark layer for readability.
import { scenes } from '../assets/art.ts';

type Props = { scene?: keyof typeof scenes; scrim?: boolean };

export function SceneBackground({ scene = 'welcomeRiver', scrim = false }: Props) {
  return (
    <>
      <img className="scene__art" src={scenes[scene]} alt="" aria-hidden="true" decoding="async" />
      {scrim && <div className="scene__scrim" aria-hidden="true" />}
    </>
  );
}
