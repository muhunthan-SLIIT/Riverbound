// The 8-item camp navigation bar (Figma "Camp navigation"). On phones it becomes a "Menu" sheet.
import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { paths } from '../../routes/paths.ts';

type Item = { label: string; to: (id: string) => string };

const ITEMS: Item[] = [
  { label: 'Camp', to: paths.camp },
  { label: 'Fishing', to: paths.fishing },
  { label: 'Feeding', to: paths.feeding },
  { label: 'Inventory', to: paths.inventory },
  { label: 'Shop', to: paths.shop },
  { label: 'Equipment', to: paths.equipment },
  { label: 'River Map', to: paths.map },
  { label: 'Crew', to: paths.team },
];

export function CampNav({ campaignId }: { campaignId: string }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Close the phone menu after moving to another page.
  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <nav className={`camp-nav${open ? ' camp-nav--open' : ''}`} aria-label="Camp">
      <button
        type="button"
        className="camp-nav__toggle btn btn-chip"
        aria-expanded={open}
        aria-controls="camp-nav-list"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? 'Close menu' : 'Menu'}
      </button>
      <ul id="camp-nav-list" className="camp-nav__list">
        {ITEMS.map((item) => (
          <li key={item.label}>
            <NavLink to={item.to(campaignId)} end className={({ isActive }) => `camp-nav__link${isActive ? ' is-current' : ''}`}>
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
