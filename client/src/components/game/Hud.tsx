// The player HUD from Figma (instance used on every camp screen):
// portrait + "Name · Riverbound", hearts (number AND icons, never colour alone), coins, Sound, Settings.
import { Link } from 'react-router-dom';
import { MAX_HEARTS, type CampaignDTO } from '@riverbound/shared';
import { useSound } from '../../hooks/SoundContext.tsx';
import { paths } from '../../routes/paths.ts';
import { Portrait } from '../Portrait.tsx';
import { SpriteIcon } from '../SpriteIcon.tsx';

function Heart({ full }: { full: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" className={full ? 'heart heart--full' : 'heart heart--empty'}>
      <path d="M12 21s-7.5-4.6-9.6-9.2C1 8.6 2.9 5 6.4 5c2.1 0 3.6 1.2 4.4 2.6h2.4C14 6.2 15.5 5 17.6 5 21.1 5 23 8.6 21.6 11.8 19.5 16.4 12 21 12 21z" />
    </svg>
  );
}

export function Hud({ campaign }: { campaign: CampaignDTO }) {
  const { enabled, setEnabled } = useSound();
  return (
    <header className="hud">
      <Portrait who={campaign.character} decorative className="hud__portrait" />
      <div className="hud__who">
        <p className="hud__name">{campaign.characterName} · Riverbound</p>
        <p className="hud__hearts">
          <span>
            Hearts {campaign.hearts} / {MAX_HEARTS}
          </span>
          <span className="hud__heart-icons">
            {Array.from({ length: MAX_HEARTS }, (_, i) => (
              <Heart key={i} full={i < campaign.hearts} />
            ))}
          </span>
        </p>
      </div>

      <p className="hud__coins">
        <span className="hud__coin-tile">
          <SpriteIcon name="coin" size={40} />
        </span>
        <span aria-live="polite">{campaign.coins} coins</span>
      </p>

      <div className="hud__links">
        <button type="button" className="hud__link" aria-pressed={enabled} onClick={() => setEnabled(!enabled)}>
          Sound: {enabled ? 'On' : 'Off'}
        </button>
        <Link to={paths.settings} className="hud__link">
          Settings
        </Link>
      </div>
    </header>
  );
}
