// Page 14: Equipment Shop (Figma node 18:538).
// All shop items on one scrollable shelf. Each card shows Buy, Owned, Locked (with the exact reason)
// or "Need N more coins", using the same shared rule the server uses (map first, compass second).
// Buying opens a confirmation (balance, cost, balance after) and then calls
// POST /api/campaigns/:id/buy. The server re-checks everything and saves coins + item together.
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { SHOP_ITEMS, getItemState, getShopItem, nextPurchase, type CampaignDTO, type ItemId, type ItemState } from '@riverbound/shared';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';
import { GameLayout } from '../components/game/GameLayout.tsx';
import { SpriteIcon } from '../components/SpriteIcon.tsx';
import { useSound } from '../hooks/SoundContext.tsx';
import { useToast } from '../hooks/useToast.ts';
import { ApiError, newActionKey } from '../services/apiClient.ts';
import { campApi, campaignApi } from '../services/gameApi.ts';
import { paths } from '../routes/paths.ts';
import '../styles/pages/inventory.css';
import '../styles/pages/shop.css';

export function ShopPage() {
  return <GameLayout scene="merchantStall" className="shop">{(c, set) => <ShopContent campaign={c} setCampaign={set} />}</GameLayout>;
}

/** Short state labels, worded like the Figma shelf ("Locked: map + compass"). */
function stateText(id: ItemId, state: ItemState, owned: readonly ItemId[]): string {
  switch (state.status) {
    case 'owned':
      return 'Owned';
    case 'buyable':
      return 'Buy';
    case 'need_coins':
      return `Need ${state.shortfall} more coins`;
    case 'locked': {
      if (!owned.includes('river_map')) return id === 'compass' ? 'Locked: buy map first' : 'Locked: map + compass';
      if (!owned.includes('compass')) return 'Locked: buy compass first';
      return `Locked: ${state.reason.replace(/\.$/, '').toLowerCase()}`;
    }
  }
}

/** Advice panel on the left: changes as the player moves through map -> compass -> kit. */
function advice(owned: ItemId[], regionsCleared: number): { title: string; text: string } {
  if (!owned.includes('river_map')) return { title: '“Start with a map.”', text: 'Before anything else, learn the river. Then find your bearings with a compass.' };
  if (!owned.includes('compass')) return { title: '“Now find your bearings.”', text: 'A map shows the way. A compass keeps you on it.' };
  if (nextPurchase(owned, regionsCleared)) return { title: '“Gear up for the river.”', text: 'Every region asks for the right equipment. Feed and sell fish to afford it.' };
  return { title: '“You are ready.”', text: 'Your gear is set for the next crossing.' };
}

function ShopContent({ campaign: c, setCampaign }: { campaign: CampaignDTO; setCampaign: (c: CampaignDTO) => void }) {
  const { play } = useSound();
  const { toast, show } = useToast();
  const [selected, setSelected] = useState<ItemId | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const actionKey = useRef(newActionKey());

  const owned = c.inventory.ownedItems;
  const blocked = c.state !== 'at_camp' || c.activeFeedingBatchId !== null || c.activeChallengeId !== null;
  const next = nextPurchase(owned, c.regionsCleared.length);
  const tip = advice(owned, c.regionsCleared.length);
  const item = selected ? getShopItem(selected) : null;

  const open = (id: ItemId) => {
    setError(null);
    actionKey.current = newActionKey();
    setSelected(id);
  };

  const buy = async () => {
    if (!selected || !item) return;
    setPending(true);
    setError(null);
    try {
      const { campaign } = await campApi.buy(c.id, selected, actionKey.current);
      setCampaign(campaign);
      setSelected(null);
      play('purchase');
      show(`${item.name} bought! ${campaign.coins} coins left.`);
    } catch (err) {
      const uncertain = err instanceof ApiError && (err.code === 'NETWORK' || err.status >= 500);
      if (uncertain) {
        // A timeout may hide a successful purchase: check before saying it failed.
        const fresh = await campaignApi.get(c.id).catch(() => null);
        if (fresh?.campaign.inventory.ownedItems.includes(selected)) {
          setCampaign(fresh.campaign);
          setSelected(null);
          show(`${item.name} bought! ${fresh.campaign.coins} coins left.`);
          return;
        }
      }
      setError(err instanceof Error ? err.message : 'The purchase did not go through.');
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <main className="shop__main">
        <p className="eyebrow shop__eyebrow">River trader</p>
        <h1 className="shop__title">Good gear changes the journey.</h1>

        <div className="shop__grid">
          <aside className="panel shop__advice" aria-labelledby="advice-title">
            <h2 id="advice-title" className="shop__advice-title">
              {tip.title}
            </h2>
            <p className="shop__advice-text">{tip.text}</p>
            {next && (
              <span className="shop__advice-tile">
                <SpriteIcon name={next} size={120} label={getShopItem(next).name} />
              </span>
            )}
            <p className="shop__order">
              Map first · {getShopItem('river_map').price} coins
              <br />
              Compass second · {getShopItem('compass').price} coins
            </p>
            <Link to={paths.inventory(c.id)} className="btn btn-link shop__sell-link">
              Sell Fed Fish
            </Link>
          </aside>

          <section className="shop__shelf-wrap" aria-labelledby="shelf-title">
            <h2 id="shelf-title" className="visually-hidden">
              Equipment shelf
            </h2>
            {blocked && <p className="shop__blocked">Finish your feeding batch before trading.</p>}
            <ul className="shop__shelf">
              {SHOP_ITEMS.map((shopItem) => {
                const state = getItemState(shopItem.id, owned, c.coins);
                const buyable = state.status === 'buyable' && !blocked;
                return (
                  <li key={shopItem.id}>
                    <button
                      type="button"
                      className={`item-card item-card--${state.status}`}
                      onClick={() => buyable && open(shopItem.id)}
                      aria-disabled={!buyable}
                      aria-label={`${shopItem.name}, ${shopItem.price} coins. ${shopItem.purpose}. ${stateText(shopItem.id, state, owned)}.`}
                    >
                      <span className="item-card__icon">
                        <SpriteIcon name={shopItem.id} size={64} />
                      </span>
                      <span className="item-card__name">{shopItem.name}</span>
                      <span className="item-card__price">{shopItem.price} coins</span>
                      <span className="item-card__purpose">{shopItem.purpose}</span>
                      <span className="item-card__state">
                        {state.status === 'owned' && <span aria-hidden="true">✓ </span>}
                        {stateText(shopItem.id, state, owned)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
        <p className="shop__hint">Scroll the equipment shelf to see all {SHOP_ITEMS.length} items.</p>
      </main>

      {item && (
        <ConfirmDialog
          open={selected !== null}
          title={`Buy the ${item.name.toLowerCase()}?`}
          confirmLabel={`Buy for ${item.price} coins`}
          pending={pending}
          error={error}
          onConfirm={() => void buy()}
          onCancel={() => setSelected(null)}
        >
          <dl className="buy-summary">
            <div>
              <dt>Current balance</dt>
              <dd>{c.coins} coins</dd>
            </div>
            <div>
              <dt>Cost</dt>
              <dd>− {item.price} coins</dd>
            </div>
            <div className="buy-summary__total">
              <dt>Balance after</dt>
              <dd>{c.coins - item.price} coins</dd>
            </div>
          </dl>
          <p>Equipment is permanent. It cannot be refunded or sold back.</p>
        </ConfirmDialog>
      )}

      {toast && (
        <p className={`toast${toast.kind === 'error' ? ' toast--error' : ''}`} role="status">
          {toast.text}
        </p>
      )}
    </>
  );
}
