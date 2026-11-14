// Page 13: Inventory & Sell Fish (Figma node 18:536).
// Three stock cards (Unfed / Reserved / Fed). Only FED fish can be sold, at 10 coins each,
// through POST /api/campaigns/:id/fish/sell. The server checks the quantity again and
// updates fish, coins and the ledger in one transaction.
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FEED_BONUS_COINS, FISH_SALE_PRICE, type CampaignDTO } from '@riverbound/shared';
import { GameLayout } from '../components/game/GameLayout.tsx';
import { SpriteIcon } from '../components/SpriteIcon.tsx';
import { useSound } from '../hooks/SoundContext.tsx';
import { useToast } from '../hooks/useToast.ts';
import { ApiError, newActionKey } from '../services/apiClient.ts';
import { campApi, campaignApi } from '../services/gameApi.ts';
import { paths } from '../routes/paths.ts';
import '../styles/pages/inventory.css';

export function InventoryPage() {
  return <GameLayout scene="merchantStall" className="market">{(c, set) => <InventoryContent campaign={c} setCampaign={set} />}</GameLayout>;
}

function InventoryContent({ campaign: c, setCampaign }: { campaign: CampaignDTO; setCampaign: (c: CampaignDTO) => void }) {
  const { play } = useSound();
  const { toast, show } = useToast();
  const inv = c.inventory;
  const fed = inv.fedAvailable;
  const [quantity, setQuantity] = useState(fed);
  const [pending, setPending] = useState(false);
  const actionKey = useRef(newActionKey());

  // Keep the stepper inside 1..fed whenever the stock changes.
  useEffect(() => setQuantity((q) => (fed === 0 ? 0 : q === 0 ? fed : Math.min(Math.max(q, 1), fed))), [fed]);

  const blocked = c.state !== 'at_camp' || c.activeFeedingBatchId !== null || c.activeChallengeId !== null;
  const canSell = fed > 0 && !blocked && !pending;
  const proceeds = quantity * FISH_SALE_PRICE;

  const sell = async (amount: number) => {
    if (!canSell || amount < 1 || amount > fed) return;
    setPending(true);
    try {
      const result = await campApi.sell(c.id, amount, actionKey.current);
      actionKey.current = newActionKey();
      setCampaign(result.campaign);
      play('coins');
      show(`Sold ${result.sold} fed fish for ${result.earned} coins.`);
    } catch (error) {
      const uncertain = error instanceof ApiError && (error.code === 'NETWORK' || error.status >= 500);
      if (uncertain) {
        // A timeout may hide a sale that DID happen: check the saved state before saying it failed.
        const fresh = await campaignApi.get(c.id).catch(() => null);
        if (fresh && fresh.campaign.totals.fishSold > c.totals.fishSold) {
          actionKey.current = newActionKey();
          setCampaign(fresh.campaign);
          show('Your sale went through.');
          return;
        }
      } else {
        actionKey.current = newActionKey();
      }
      show(error instanceof Error ? error.message : 'The sale did not go through.', 'error');
    } finally {
      setPending(false);
    }
  };

  const setTyped = (text: string) => {
    const n = Number.parseInt(text, 10);
    setQuantity(Number.isNaN(n) ? 1 : Math.min(Math.max(n, 1), fed));
  };

  return (
    <>
      <main className="market__main">
        <p className="eyebrow market__eyebrow">The merchant&rsquo;s dock</p>
        <h1 className="market__title">Your catch, ready for the market.</h1>

        <div className="market__grid">
          <div className="market__left">
            <ul className="stock" aria-label="Your fish">
              <StockCard label="Unfed" count={inv.unfedAvailable} />
              <StockCard label="Reserved" count={inv.unfedReserved} />
              <StockCard label="Fed" count={fed} highlight />
            </ul>

            <section className="sell" aria-labelledby="sell-title">
              <h2 id="sell-title" className="sell__title">
                Sell fed fish
              </h2>
              <p className="sell__rule">Only fed fish can be sold. Unfed and reserved fish stay safe.</p>

              {fed === 0 ? (
                <div className="sell__empty">
                  <p>Catch fish in the shallows, then feed a batch to prepare them for sale.</p>
                  <div className="sell__empty-links">
                    {inv.unfedReserved > 0 && c.activeFeedingBatchId ? (
                      <Link to={paths.feedingBatch(c.id, c.activeFeedingBatchId)} className="btn btn-primary">
                        Resume feeding
                      </Link>
                    ) : inv.unfedAvailable > 0 ? (
                      <Link to={paths.feeding(c.id)} className="btn btn-primary">
                        Feed your fish
                      </Link>
                    ) : (
                      <Link to={paths.fishing(c.id)} className="btn btn-primary">
                        Catch fish
                      </Link>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <p className="sell__label" id="qty-label">
                    Quantity
                  </p>
                  <div className="sell__row">
                    <div className="stepper" role="group" aria-labelledby="qty-label">
                      <button
                        type="button"
                        className="stepper__btn"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        disabled={quantity <= 1 || pending}
                        aria-label="One fewer fish"
                      >
                        −
                      </button>
                      <input
                        className="stepper__value"
                        inputMode="numeric"
                        aria-labelledby="qty-label"
                        value={quantity}
                        onChange={(e) => setTyped(e.target.value)}
                        disabled={pending}
                      />
                      <button
                        type="button"
                        className="stepper__btn"
                        onClick={() => setQuantity((q) => Math.min(fed, q + 1))}
                        disabled={quantity >= fed || pending}
                        aria-label="One more fish"
                      >
                        +
                      </button>
                    </div>
                    <div className="sell__sum" aria-live="polite">
                      <p className="sell__formula">
                        {quantity} fish × {FISH_SALE_PRICE} coins = {proceeds} coins
                      </p>
                      <p className="sell__after">Wallet after sale: {c.coins + proceeds} coins</p>
                    </div>
                  </div>
                  {blocked && <p className="sell__blocked">Finish your feeding batch before trading.</p>}
                  <div className="sell__actions">
                    <button type="button" className="btn btn-primary sell__btn" onClick={() => void sell(fed)} disabled={!canSell} aria-busy={pending}>
                      {pending ? 'Selling…' : 'Sell All Fed Fish'}
                    </button>
                    <button type="button" className="btn btn-emerald sell__btn" onClick={() => void sell(quantity)} disabled={!canSell}>
                      Sell Selected
                    </button>
                  </div>
                </>
              )}
            </section>
          </div>

          <aside className="panel market__tip" aria-labelledby="tip-title">
            {fed > 0 ? (
              <>
                <h2 id="tip-title" className="market__tip-title">
                  A good trade goes a long way.
                </h2>
                <p className="market__tip-text">
                  {fed} fed fish earn {fed * FISH_SALE_PRICE} coins.
                  <br />
                  {fed === 4
                    ? `With your feeding reward, that is ${fed * FISH_SALE_PRICE + FEED_BONUS_COINS} toward new gear.`
                    : 'Spend your coins at the shop.'}
                </p>
                <Link to={paths.shop(c.id)} className="btn btn-link market__tip-link">
                  Go to the shop
                </Link>
              </>
            ) : (
              <>
                <h2 id="tip-title" className="market__tip-title">
                  Nothing fed yet?
                </h2>
                <p className="market__tip-text">Finish feeding a batch, then come back to trade it for coins.</p>
                <Link to={paths.feeding(c.id)} className="btn btn-link market__tip-link">
                  Feeding Preparation
                </Link>
              </>
            )}
          </aside>
        </div>
      </main>

      {toast && (
        <p className={`toast${toast.kind === 'error' ? ' toast--error' : ''}`} role="status">
          {toast.text}
        </p>
      )}
    </>
  );
}

function StockCard({ label, count, highlight = false }: { label: string; count: number; highlight?: boolean }) {
  return (
    <li className={`stock__card${highlight ? ' stock__card--fed' : ''}`}>
      <span className="stock__tile">
        <SpriteIcon name="fish" size={56} />
      </span>
      <span>
        <span className="stock__label">{label}</span>
        <span className="stock__count">{count}</span>
      </span>
    </li>
  );
}
