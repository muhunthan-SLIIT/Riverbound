// Decides where "Continue Adventure" takes the player, from the SAVED campaign state.
// Order (App Spec page 5): finished journey -> summary; story not seen -> intro / tutorial;
// unfinished feeding batch or crossing -> resume it; failed -> failure page; otherwise -> camp.
import type { CampaignDTO } from '@riverbound/shared';
import { paths } from './paths.ts';

export function resumePath(c: CampaignDTO): string {
  if (c.state === 'completed') return paths.complete(c.id);
  if (!c.introDone) return paths.intro(c.id);
  if (!c.tutorialDone) return paths.tutorial(c.id);
  if (c.activeFeedingBatchId) return paths.feedingBatch(c.id, c.activeFeedingBatchId);
  if (c.state === 'crossing' && c.activeChallengeId) return paths.crossing(c.id, c.activeChallengeId);
  // Between two crossings: the route page offers "Continue expedition".
  if (c.state === 'crossing' && c.expedition) return paths.route(c.id, c.expedition.regionId);
  if (c.state === 'failed') return paths.failed(c.id);
  return paths.camp(c.id);
}

export function isUnfinished(c: CampaignDTO): boolean {
  return c.state !== 'completed' && c.state !== 'abandoned';
}
