// Every piece of game artwork in one place. Pages import from here, never from file paths.
// Source: Figma "Riptide Escape" › section "07 · Provisional art direction / source assets" (node 18:494).
// The artwork is PROVISIONAL in Figma: replace the files with final licensed art before release.
import emblem from './images/emblem.png';
import equipmentSprites from './images/items/equipment-sprites.webp';
import rewardChestOpen from './images/items/reward-chest-open.webp';
import alex from './images/portraits/alex.webp';
import finn from './images/portraits/finn.webp';
import jonah from './images/portraits/jonah.webp';
import mira from './images/portraits/mira.webp';
import tess from './images/portraits/tess.webp';
import campHub from './images/scenes/camp-hub.webp';
import crossingGorge from './images/scenes/crossing-gorge.webp';
import expeditionMap from './images/scenes/expedition-map.webp';
import finalEscape from './images/scenes/final-escape.webp';
import fishPen from './images/scenes/fish-pen.webp';
import fishingRiverbank from './images/scenes/fishing-riverbank.webp';
import mapHandover from './images/scenes/map-handover.webp';
import merchantStall from './images/scenes/merchant-stall.webp';
import reedMarsh from './images/scenes/reed-marsh.webp';
import riverAccident from './images/scenes/river-accident.webp';
import scoutRescue from './images/scenes/scout-rescue.webp';
import welcomeRiver from './images/scenes/welcome-river.webp';

/** Full-screen backgrounds, 1440 x 900. */
export const scenes = {
  welcomeRiver, // Splash, Welcome, Register, Sign in
  riverAccident, // Story intro panel 1
  mapHandover, // Story intro panel 3 (the trader)
  campHub, // Camp dashboard
  fishingRiverbank, // Fishing area
  fishPen, // Fish pen + feeding maths
  merchantStall, // Inventory / sell + shop
  expeditionMap, // River map
  crossingGorge, // Rapid Gorge crossings
  reedMarsh, // Reed Marsh crossings
  scoutRescue, // Teammate rescue
  finalEscape, // Escape summary
} as const;

/** Character portraits, 512 x 512. Keys match CharacterId ('female' = Alex, 'male' = Finn) and CompanionId. */
export const portraits = {
  female: alex,
  male: finn,
  mira,
  jonah,
  tess,
} as const;

export const items = {
  equipmentSprites, // 1536 x 1536 sprite sheet with transparent background
  rewardChestOpen, // 768 x 768, feeding reward
} as const;

export { emblem };
