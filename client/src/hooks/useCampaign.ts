// Loads one saved campaign from GET /api/campaigns/:id for the page in the URL.
// The server checks ownership: someone else's campaign simply looks "not available".
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { CampaignDTO } from '@riverbound/shared';
import { ApiError } from '../services/apiClient.ts';
import { campaignApi } from '../services/gameApi.ts';

export type CampaignLoad =
  | { status: 'loading' }
  | { status: 'error'; message: string; notFound: boolean }
  | { status: 'ready'; campaign: CampaignDTO };

export function useCampaign() {
  const { campaignId = '' } = useParams();
  const [load, setLoad] = useState<CampaignLoad>({ status: 'loading' });

  const reload = useCallback(
    async (signal?: AbortSignal) => {
      setLoad({ status: 'loading' });
      try {
        const { campaign } = await campaignApi.get(campaignId, signal);
        setLoad({ status: 'ready', campaign });
      } catch (error) {
        if (signal?.aborted) return;
        const notFound = error instanceof ApiError && (error.status === 404 || error.status === 400);
        setLoad({ status: 'error', notFound, message: error instanceof Error ? error.message : 'Could not load your journey.' });
      }
    },
    [campaignId],
  );

  useEffect(() => {
    const controller = new AbortController();
    void reload(controller.signal);
    return () => controller.abort();
  }, [reload]);

  /** Replace the campaign with the newer copy the server sent after an action. */
  const setCampaign = useCallback((campaign: CampaignDTO) => setLoad({ status: 'ready', campaign }), []);

  return { campaignId, load, reload, setCampaign };
}
