// The page map of the game. Each URL shows one page component.
import { Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './routes/ProtectedRoute.tsx';
import { SplashPage } from './pages/SplashPage.tsx';
import { WelcomePage } from './pages/WelcomePage.tsx';
import { RegisterPage } from './pages/RegisterPage.tsx';
import { SignInPage } from './pages/SignInPage.tsx';
import { CampaignSelectionPage } from './pages/CampaignSelectionPage.tsx';
import { CharacterSelectionPage } from './pages/CharacterSelectionPage.tsx';
import { StoryIntroPage } from './pages/StoryIntroPage.tsx';
import { TutorialPage } from './pages/TutorialPage.tsx';
import { CampPage } from './pages/CampPage.tsx';
import { FishingPage } from './pages/FishingPage.tsx';
import { FishPenPage } from './pages/FishPenPage.tsx';
import { FeedingChallengePage } from './pages/FeedingChallengePage.tsx';
import { InventoryPage } from './pages/InventoryPage.tsx';
import { ShopPage } from './pages/ShopPage.tsx';
import { EquipmentPage } from './pages/EquipmentPage.tsx';
import { RiverMapPage } from './pages/RiverMapPage.tsx';
import { RouteDetailsPage } from './pages/RouteDetailsPage.tsx';
import { CrossingPage } from './pages/CrossingPage.tsx';
import { RescuePage } from './pages/RescuePage.tsx';
import { LeaderboardPage } from './pages/LeaderboardPage.tsx';
import { TeamJournalPage } from './pages/TeamJournalPage.tsx';
import { CheckpointPage } from './pages/CheckpointPage.tsx';
import { ExpeditionFailedPage } from './pages/ExpeditionFailedPage.tsx';
import { EscapeSummaryPage } from './pages/EscapeSummaryPage.tsx';
import { SettingsPage } from './pages/SettingsPage.tsx';
import { HelpPage } from './pages/HelpPage.tsx';

export function App() {
  return (
    <Routes>
      {/* Public pages */}
      <Route path="/" element={<SplashPage />} />
      <Route path="/welcome" element={<WelcomePage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<SignInPage />} />
      <Route path="/help" element={<HelpPage />} />

      {/* Pages that need a signed-in player */}
      <Route element={<ProtectedRoute />}>
        <Route path="/campaigns" element={<CampaignSelectionPage />} />
        <Route path="/campaigns/new" element={<CharacterSelectionPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/campaigns/:campaignId">
          <Route path="intro" element={<StoryIntroPage />} />
          <Route path="tutorial" element={<TutorialPage />} />
          <Route path="camp" element={<CampPage />} />
          <Route path="fishing" element={<FishingPage />} />
          <Route path="feeding" element={<FishPenPage />} />
          <Route path="feeding/:batchId" element={<FeedingChallengePage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="shop" element={<ShopPage />} />
          <Route path="equipment" element={<EquipmentPage />} />
          <Route path="map" element={<RiverMapPage />} />
          <Route path="routes/:routeId" element={<RouteDetailsPage />} />
          <Route path="crossing/:challengeId" element={<CrossingPage />} />
          <Route path="rescue/:companionId" element={<RescuePage />} />
          <Route path="team" element={<TeamJournalPage />} />
          <Route path="leaderboard" element={<LeaderboardPage />} />
          <Route path="checkpoint" element={<CheckpointPage />} />
          <Route path="failed" element={<ExpeditionFailedPage />} />
          <Route path="complete" element={<EscapeSummaryPage />} />
        </Route>
      </Route>

      <Route path="*" element={<SplashPage />} />
    </Routes>
  );
}
