// Temporary page body used until the Figma design for a page is supplied.
// It is clearly labelled so nobody mistakes it for a finished page.
import { Link } from 'react-router-dom';

type Props = { number: number; title: string; purpose: string };

export function PendingDesign({ number, title, purpose }: Props) {
  return (
    <main className="pending-page">
      <p className="eyebrow">Page {String(number).padStart(2, '0')} · waiting for Figma design</p>
      <h1>{title}</h1>
      <p>{purpose}</p>
      <Link to="/">Back to start</Link>
    </main>
  );
}
