import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import app from '../src/app.js';
import { runSeed } from '../src/db/seed.js';

let server: http.Server;
const PORT = 5098;
const BASE_URL = `http://localhost:${PORT}/api`;

async function api(path: string, options: RequestInit = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

describe('Vynk Social Platform - Phase 2 Test Suite', () => {
  let authToken = '';
  let currentUserId = 'user_tanush_01';
  let testStoryId = '';
  let testConversationId = 'conv_riya_direct';

  before(async () => {
    await runSeed();
    server = app.listen(PORT);
    await new Promise(resolve => setTimeout(resolve, 300));

    // Login as Tanush to obtain auth token
    const loginRes = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: 'tanush@vynk.social', password: 'password123' })
    });
    authToken = loginRes.data.token;
  });

  after(() => {
    server.close();
  });

  // 1. STORIES & STORY THREADS
  describe('1. Stories & Story Threads', () => {
    test('GET /api/stories returns stories and active story threads', async () => {
      const res = await api('/stories', {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      assert.equal(res.status, 200);
      assert.ok(res.data.stories.length >= 1);
      const riyaStory = res.data.stories.find((s: any) => s.id === 'story_riya_parent_01');
      assert.ok(riyaStory, 'Root story found');
      assert.ok(riyaStory.threads.length >= 2, 'Story threads chained together');
      assert.equal(riyaStory.threads[0].caption, 'Hiking the sunrise trail right now 🌿');
    });

    test('POST /api/stories creates a new top-level story', async () => {
      const res = await api('/stories', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          mediaUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800',
          caption: 'Sunset moments 🌅'
        })
      });

      assert.equal(res.status, 201);
      assert.equal(res.data.story.caption, 'Sunset moments 🌅');
      testStoryId = res.data.story.id;
    });

    test('POST /api/stories creates a Story Thread entry linked to parent', async () => {
      const res = await api('/stories', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          mediaUrl: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800',
          caption: 'Adding my star trail memory to this thread! ✨',
          parentStoryId: testStoryId
        })
      });

      assert.equal(res.status, 201);
      assert.equal(res.data.story.parentStoryId, testStoryId);
    });

    test('POST /api/stories/:id/view records story view', async () => {
      const res = await api(`/stories/${testStoryId}/view`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` }
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.viewed, true);
    });
  });

  // 2. SHORT-FORM VIDEOS ("VYNK VIBES")
  describe('2. Short-Form Video System (Vynk Vibes)', () => {
    test('GET /api/vibes/feed returns vertical video clips with audio tracks', async () => {
      const res = await api('/vibes/feed?type=for_you', {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      assert.equal(res.status, 200);
      assert.ok(res.data.videos.length >= 2);
      const skaterVideo = res.data.videos.find((v: any) => v.id === 'post_skate_vibe_01');
      assert.ok(skaterVideo, 'Skater video found');
      assert.match(skaterVideo.audioTitle, /Sunset/i);
      assert.ok(skaterVideo.totalReactions >= 1);
    });

    test('POST /api/vibes/:id/view increments views count', async () => {
      const res = await api('/vibes/post_skate_vibe_01/view', {
        method: 'POST'
      });

      assert.equal(res.status, 200);
      assert.ok(res.data.viewsCount > 124000);
    });
  });

  // 3. MESSAGING & SHARED SPACES
  describe('3. Messaging & Shared Spaces (Vynk Direct)', () => {
    test('GET /api/messages/conversations returns list of conversations with unread badges', async () => {
      const res = await api('/messages/conversations', {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      assert.equal(res.status, 200);
      assert.ok(res.data.conversations.length >= 4);

      const riyaConv = res.data.conversations.find((c: any) => c.name === 'Riya Mehta');
      assert.ok(riyaConv, 'Riya direct conversation found');
      assert.equal(riyaConv.unreadCount, 2);
    });

    test('GET /api/messages/conversations/:id/messages returns conversation thread', async () => {
      const res = await api(`/messages/conversations/${testConversationId}/messages`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      assert.equal(res.status, 200);
      assert.ok(res.data.messages.length >= 2);
      assert.match(res.data.messages[0].content, /Hey Tanush/i);
    });

    test('POST /api/messages/conversations/:id/messages sends message', async () => {
      const res = await api(`/messages/conversations/${testConversationId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ content: 'Yes! Absolutely ready for tomorrow.' })
      });

      assert.equal(res.status, 201);
      assert.equal(res.data.message.content, 'Yes! Absolutely ready for tomorrow.');
      assert.equal(res.data.message.senderId, currentUserId);
    });

    test('POST /api/messages/messages/:id/react adds emoji reaction to message', async () => {
      // First get a message id
      const msgRes = await api(`/messages/conversations/${testConversationId}/messages`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const firstMsgId = msgRes.data.messages[0].id;

      const res = await api(`/messages/messages/${firstMsgId}/react`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ reaction: '❤️' })
      });

      assert.equal(res.status, 200);
      assert.ok(res.data.reactions.length >= 1);
      assert.equal(res.data.reactions[0].reaction, '❤️');
    });

    test('GET /api/messages/conversations/:id/shared-space retrieves shared photos, notes and links', async () => {
      const res = await api(`/messages/conversations/${testConversationId}/shared-space`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      assert.equal(res.status, 200);
      assert.ok(res.data.items.length >= 2);
      const note = res.data.items.find((i: any) => i.itemType === 'note');
      assert.ok(note, 'Shared note found');
      assert.match(note.title, /Agenda/i);
    });

    test('POST /api/messages/conversations/:id/shared-space adds item to shared space', async () => {
      const res = await api(`/messages/conversations/${testConversationId}/shared-space`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          itemType: 'link',
          title: 'Design Guidelines 2026',
          content: 'https://vynk.social/guidelines'
        })
      });

      assert.equal(res.status, 201);
      assert.equal(res.data.item.title, 'Design Guidelines 2026');
    });
  });

  // 4. GLOBAL SEARCH
  describe('4. Global Search System', () => {
    test('GET /api/search?q=tanush finds user by name/handle', async () => {
      const res = await api('/search?q=tanush');
      assert.equal(res.status, 200);
      assert.ok(res.data.users.length >= 1);
      assert.equal(res.data.users[0].name, 'Tanush');
    });

    test('GET /api/search?q=skate finds videos and hashtags', async () => {
      const res = await api('/search?q=skate');
      assert.equal(res.status, 200);
      assert.ok(res.data.videos.length >= 1);
    });

    test('GET /api/search/suggestions returns autocomplete suggestions', async () => {
      const res = await api('/search/suggestions?q=riya');
      assert.equal(res.status, 200);
      assert.ok(res.data.suggestions.length >= 1);
      assert.match(res.data.suggestions[0].title, /Riya/i);
    });
  });

  // 5. NOTIFICATIONS
  describe('5. Notifications System', () => {
    test('GET /api/notifications returns user activity alerts', async () => {
      const res = await api('/notifications', {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      assert.equal(res.status, 200);
      assert.ok(res.data.notifications.length >= 3);
      assert.ok(res.data.unreadCount >= 1);
    });

    test('POST /api/notifications/read-all marks notifications read', async () => {
      const res = await api('/notifications/read-all', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` }
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
    });
  });
});
