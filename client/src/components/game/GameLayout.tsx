// Frame for every camp screen: artwork, HUD at the top, page content, navigation at the bottom.
// It loads the campaign once and passes it to the page, so all panels show the same numbers.
import type { ReactNode } from 'react';
import type { CampaignDTO } from '@riverbound/shared';
import type { scenes } from '../../assets/art.ts';
import { useCampaign } from '../../hooks/useCampaign.ts';
import { PageStatus } from '../PageStatus.tsx';
import { SceneBackground } from '../SceneBackground.tsx';
import { CampNav } from './CampNav.tsx';
import { Hud } from './Hud.tsx';
import '../../styles/components/game.css';

type Props = {
  scene: keyof typeof scenes;
  className?: string;
  /** false during focused activities (feeding maths, crossings): the spec hides the camp navigation. */
  nav?: boolean;
  children: (campaign: CampaignDTO, setCampaign: (c: CampaignDTO) => void) => ReactNode;
};

export function GameLayout({ scene, className = '', nav = true, children }: Props) {
  const { campaignId, load, reload, setCampaign } = useCampaign();
  if (load.status !== 'ready') return <PageStatus load={load} onRetry={() => void reload()} />;

  return (
    <div className={`scene game ${className}`}>
      <SceneBackground scene={scene} />
      <Hud campaign={load.campaign} />
      <div className="game__body">{children(load.campaign, setCampaign)}</div>
      {nav && <CampNav campaignId={campaignId} />}
    </div>
  );
}
