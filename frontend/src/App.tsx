import React, { useState } from 'react';
import { useAuth } from './context/AuthContext.js';
import { AuthPage } from './pages/AuthPage.js';
import { FeedPage } from './pages/FeedPage.js';
import { ProfilePage } from './pages/ProfilePage.js';
import { DiscoverPage } from './pages/DiscoverPage.js';
import { VibesPage } from './pages/VibesPage.js';
import { MessagesPage } from './pages/MessagesPage.js';
import { RoomsPage } from './pages/RoomsPage.js';
import { Header } from './components/Header.js';
import { BottomNav, NavTab } from './components/BottomNav.js';
import { CreatePostModal } from './components/CreatePostModal.js';
import { StoryViewerModal } from './pages/StoryViewerModal.js';
import { NotificationsModal } from './components/NotificationsModal.js';
import { DemoSwitcher } from './components/DemoSwitcher.js';

export const App: React.FC = () => {
  const { user, isLoading, logout } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavTab>('home');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [selectedStory, setSelectedStory] = useState<any>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#070913]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
          <span className="text-xs text-purple-300 font-semibold tracking-wider uppercase">Loading Vynk...</span>
        </div>
      </div>
    );
  }

  // Not logged in -> Show Auth experience
  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-[#080a14] text-white flex flex-col justify-between selection:bg-purple-600">
      {/* Demo Switcher Pill */}
      <DemoSwitcher />

      {/* Main Top Header (hidden when on full-screen Vibes video page) */}
      {currentTab !== 'vibes' && (
        <Header
          onSearchClick={() => setCurrentTab('discover')}
          onNotificationsClick={() => setIsNotificationsOpen(true)}
          onRoomsClick={() => setCurrentTab('rooms')}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-xl mx-auto overflow-y-auto">
        {currentTab === 'home' && (
          <FeedPage
            onStoryClick={(story) => setSelectedStory(story)}
            onAddStoryClick={() => setIsCreateOpen(true)}
          />
        )}

        {currentTab === 'discover' && <DiscoverPage />}

        {currentTab === 'rooms' && <RoomsPage />}

        {currentTab === 'vibes' && <VibesPage />}

        {currentTab === 'messages' && <MessagesPage />}

        {currentTab === 'profile' && <ProfilePage onLogoutClick={logout} />}
      </main>

      {/* Floating Bottom Navigation */}
      <BottomNav
        currentTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab)}
        onCreateClick={() => setIsCreateOpen(true)}
      />

      {/* Create Modal */}
      <CreatePostModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onPostCreated={() => {
          setCurrentTab('home');
        }}
      />

      {/* Story Viewer Modal (with Story Threads support) */}
      <StoryViewerModal
        isOpen={!!selectedStory}
        onClose={() => setSelectedStory(null)}
        user={selectedStory}
      />

      {/* Notifications Center Modal */}
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />
    </div>
  );
};

export default App;
