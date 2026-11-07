import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import app from '../src/app.js';
import { runSeed } from '../src/db/seed.js';

let server: http.Server;
const PORT = 5097;
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

describe('Vynk Social Platform - Phase 3 Test Suite', () => {
  let authToken = '';
  let currentUserId = 'user_tanush_01';
  let testCapsuleId = '';
  let testCollabPostId = '';
  let testRoomId = '';
  let testPollMsgId = '';

  before(async () => {
    await runSeed();
    server = app.listen(PORT);
    await new Promise(resolve => setTimeout(resolve, 300));

    // Sign in as Tanush
    const loginRes = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: 'tanush@vynk.social', password: 'password123' })
    });
    authToken = loginRes.data.token;
  });

  after(() => {
    server.close();
  });

  // 1. MOMENT CAPSULES
  describe('1. Moment Capsules (Timeline-Based Memory Capsules)', () => {
    test('GET /api/capsules returns public memory capsules', async () => {
      const res = await api('/capsules', {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      assert.equal(res.status, 200);
      assert.ok(res.data.capsules.length >= 2);
      const goaCapsule = res.data.capsules.find((c: any) => c.id === 'capsule_goa_01');
      assert.ok(goaCapsule, 'Goa Trip capsule found');
      assert.equal(goaCapsule.title, 'Goa Trip 2026');
      assert.ok(goaCapsule.itemsCount >= 4);
      assert.ok(goaCapsule.collaborators.length >= 2, 'Goa capsule collaborators attached');
    });

    test('GET /api/capsules/:id returns capsule with full timeline items', async () => {
      const res = await api('/capsules/capsule_goa_01', {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      assert.equal(res.status, 200);
      assert.ok(res.data.capsule.items.length >= 4);
      assert.equal(res.data.capsule.items[0].locationName, 'Anjuna Beach');
      assert.match(res.data.capsule.items[2].caption, /Artjuna/i);
    });

    test('POST /api/capsules creates a new Moment Capsule', async () => {
      const res = await api('/capsules', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          title: 'Road Trip Ladakh 2026',
          description: 'Riding high mountain passes and camping under the stars.',
          category: 'Adventure',
          locationName: 'Ladakh, India',
          musicTitle: 'Himalayan Breeze 🏔️',
          items: [
            {
              itemType: 'photo',
              mediaUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800',
              caption: 'Crossing Khardung La pass at 17,982 ft 🏔️'
            }
          ],
          collaboratorIds: ['user_aarav_02']
        })
      });

      assert.equal(res.status, 201);
      assert.equal(res.data.capsule.title, 'Road Trip Ladakh 2026');
      assert.equal(res.data.capsule.itemsCount, 1);
      testCapsuleId = res.data.capsule.id;
    });

    test('POST /api/capsules/:id/items appends a timeline moment', async () => {
      const res = await api(`/capsules/${testCapsuleId}/items`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          itemType: 'note',
          caption: 'Campfire stories by Pangong lake. Temperature dropped to -2°C!'
        })
      });

      assert.equal(res.status, 201);
      assert.equal(res.data.item.capsuleId, testCapsuleId);
      assert.equal(res.data.item.itemType, 'note');
    });
  });

  // 2. COLLAB POSTS
  describe('2. Collab Posts (Multi-User Shared Posts)', () => {
    test('POST /api/posts creates a shared Collab Post with co-authors', async () => {
      const res = await api('/posts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          caption: 'Hackathon Champions 2026! 🏆 Built our dream AI prototype in 36 hours.',
          mood: 'tech',
          isCollab: true,
          collabTitle: 'Hackathon 2026',
          collaboratorIds: ['user_arjun_04', 'user_riya_03'],
          media: [
            {
              url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800',
              type: 'image'
            }
          ]
        })
      });

      assert.equal(res.status, 201);
      assert.equal(res.data.post.isCollab, true);
      assert.equal(res.data.post.collabTitle, 'Hackathon 2026');
      testCollabPostId = res.data.post.id;
    });

    test('GET /api/posts/:id returns collab post with co-authors list', async () => {
      const res = await api(`/posts/${testCollabPostId}`);

      assert.equal(res.status, 200);
      assert.equal(res.data.post.isCollab, true);
      assert.ok(res.data.post.collaborators.length >= 2, 'Collaborators attached to post');
      const arjun = res.data.post.collaborators.find((c: any) => c.name === 'Arjun Verma');
      assert.ok(arjun, 'Arjun listed as co-author');
    });
  });

  // 3. SOCIAL ROOMS & LIVE DISCUSSIONS
  describe('3. Social Rooms (Topic Communities & Polls)', () => {
    test('GET /api/rooms returns topic-based social rooms', async () => {
      const res = await api('/rooms', {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      assert.equal(res.status, 200);
      assert.ok(res.data.rooms.length >= 4);
      const aiRoom = res.data.rooms.find((r: any) => r.topic === 'AI & Technology');
      assert.ok(aiRoom, 'AI & Technology room found');
      assert.ok(aiRoom.membersCount >= 1000);
    });

    test('POST /api/rooms creates a new topic room', async () => {
      const res = await api('/rooms', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          name: 'Indie Hackers & Founders',
          description: 'Bootstrapping profitable products and sharing revenue milestones.',
          topic: 'Tech & Startups'
        })
      });

      assert.equal(res.status, 201);
      assert.equal(res.data.room.name, 'Indie Hackers & Founders');
      assert.equal(res.data.room.isMember, true);
      testRoomId = res.data.room.id;
    });

    test('POST /api/rooms/:id/join toggles room membership', async () => {
      const res = await api(`/rooms/${testRoomId}/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` }
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.isMember, false, 'Left room');

      // Join back
      const resJoin = await api(`/rooms/${testRoomId}/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` }
      });
      assert.equal(resJoin.status, 200);
      assert.equal(resJoin.data.isMember, true, 'Joined room');
    });

    test('POST /api/rooms/:id/messages posts discussion message with Poll', async () => {
      const res = await api(`/rooms/${testRoomId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          pollData: {
            question: 'What is your primary revenue model?',
            options: [
              { text: 'Monthly Subscription (SaaS)' },
              { text: 'One-time Lifetime License' },
              { text: 'Usage-based Pay as you go' }
            ]
          }
        })
      });

      assert.equal(res.status, 201);
      assert.equal(res.data.message.mediaType, 'poll');
      assert.equal(res.data.message.pollData.options.length, 3);
      testPollMsgId = res.data.message.id;
    });

    test('POST /api/rooms/messages/:id/vote casts vote on poll option', async () => {
      const res = await api(`/rooms/messages/${testPollMsgId}/vote`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ optionIndex: 0 })
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.pollData.userVote, 0);
      assert.equal(res.data.pollData.options[0].votes, 1);
      assert.equal(res.data.pollData.totalVotes, 1);
    });
  });

  // 4. HEALTHIER SOCIAL MEDIA & ACHIEVEMENTS
  describe('4. Healthier Social Media & Community Achievements', () => {
    test('GET /api/health-engagement/summary returns mindful social summary', async () => {
      const res = await api('/health-engagement/summary', {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      assert.equal(res.status, 200);
      assert.ok(res.data.summary.creatorsDiscovered >= 1);
      assert.ok(res.data.summary.momentsInspired >= 1);
      assert.ok(res.data.summary.communitiesActive >= 1);
      assert.ok(res.data.summary.healthyTimeMinutes > 0);
    });

    test('GET /api/health-engagement/achievements returns unlocked badges', async () => {
      const res = await api('/health-engagement/achievements', {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      assert.equal(res.status, 200);
      assert.ok(res.data.achievements.length >= 3);
      const builder = res.data.achievements.find((a: any) => a.badgeId === 'community_builder');
      assert.ok(builder, 'Community builder badge present');
    });
  });
});
