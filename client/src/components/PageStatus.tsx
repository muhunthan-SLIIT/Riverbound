// Full-page loading and error messages, used while a page fetches its data.
import { Link } from 'react-router-dom';
import { paths } from '../routes/paths.ts';
import type { CampaignLoad } from '../hooks/useCampaign.ts';

type Props = { load: Exclude<CampaignLoad, { status: 'ready' }>; onRetry: () => void };

export function PageStatus({ load, onRetry }: Props) {
  if (load.status === 'loading') {
    return (
      <main className="page-status" role="status">
        <p>Loading your journey…</p>
      </main>
    );
  }
  return (
    <main className="page-status" role="alert">
      <h1 className="page-status__title">{load.notFound ? 'Journey not available' : 'Connection problem'}</h1>
      <p>{load.notFound ? 'This journey does not exist or belongs to another account.' : load.message}</p>
      <div className="page-status__actions">
        {!load.notFound && (
          <button type="button" className="btn btn-primary" onClick={onRetry}>
            Try again
          </button>
        )}
        <Link to={paths.campaigns} className="btn btn-secondary">
          Back to your journal
        </Link>
      </div>
    </main>
  );
}
