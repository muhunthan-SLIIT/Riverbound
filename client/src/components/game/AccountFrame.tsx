// Frame for Settings and Help, which belong to the account, not to one journey.
// If the player has a journey in progress, its HUD and camp navigation are shown (as in Figma).
// Otherwise (no journey yet, or signed out on the Help page) a simple back link is shown instead.
import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { CampaignDTO } from '@riverbound/shared';
import type { scenes } from '../../assets/art.ts';
import { useSession } from '../../hooks/SessionContext.tsx';
import { campaignApi } from '../../services/gameApi.ts';
import { paths } from '../../routes/paths.ts';
import { isUnfinished } from '../../routes/resume.ts';
import { SceneBackground } from '../SceneBackground.tsx';
import { CampNav } from './CampNav.tsx';
import { Hud } from './Hud.tsx';
import '../../styles/components/game.css';

type Props = { scene: keyof typeof scenes; className?: string; children: (campaign: CampaignDTO | null) => ReactNode };

export function AccountFrame({ scene, className = '', children }: Props) {
  const { status } = useSession();
  const [campaign, setCampaign] = useState<CampaignDTO | null>(null);

  useEffect(() => {
    if (status !== 'signed_in') return;
    let active = true;
    campaignApi
      .list()
      .then(({ campaigns }) => {
        if (active) setCampaign(campaigns.find(isUnfinished) ?? null);
      })
      .catch(() => undefined); // the page still works without the HUD
    return () => {
      active = false;
    };
  }, [status]);

  return (
    <div className={`scene game ${className}`}>
      <SceneBackground scene={scene} />
      {campaign ? (
        <Hud campaign={campaign} />
      ) : (
        <nav className="account-frame__top" aria-label="Back">
          <Link to={status === 'signed_in' ? paths.campaigns : paths.welcome} className="btn btn-chip account-frame__back">
            ← {status === 'signed_in' ? 'Your journeys' : 'Back to start'}
          </Link>
        </nav>
      )}
      <div className="game__body">{children(campaign)}</div>
      {campaign && <CampNav campaignId={campaign.id} />}
    </div>
  );
}
