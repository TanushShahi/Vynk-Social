import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import app from '../src/app.js';
import { runSeed } from '../src/db/seed.js';

let server: http.Server;
const PORT = 5099;
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

describe('Vynk Social Platform - Phase 1 Test Suite', () => {
  let authToken = '';
  let currentUserId = '';
  let currentUserUID = '';
  let testPostId = '';
  let testCommentId = '';

  before(async () => {
    // Seed clean initial state
    await runSeed();
    server = app.listen(PORT);
    await new Promise(resolve => setTimeout(resolve, 300));
  });

  after(() => {
    server.close();
  });

  // 1. AUTHENTICATION TESTS
  describe('1. Authentication & UID System', () => {
    test('POST /api/auth/register creates user with unique Vynk UID', async () => {
      const payload = {
        name: 'Maya Lin',
        email: 'maya.lin@test.com',
        password: 'password123',
        uid: 'vynk.m9x2k1',
        interests: ['Design', 'Travel']
      };

      const res = await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      assert.equal(res.status, 201);
      assert.ok(res.data.token, 'Token must be returned');
      assert.equal(res.data.user.name, 'Maya Lin');
      assert.equal(res.data.user.uid, 'vynk.m9x2k1');
      assert.ok(res.data.user.interests.includes('Design'));

      authToken = res.data.token;
      currentUserId = res.data.user.id;
      currentUserUID = res.data.user.uid;
    });

    test('POST /api/auth/register rejects duplicate email', async () => {
      const res = await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Duplicate Maya',
          email: 'maya.lin@test.com',
          password: 'password123'
        })
      });

      assert.equal(res.status, 400);
      assert.match(res.data.error, /already exists/i);
    });

    test('POST /api/auth/login succeeds with email and password', async () => {
      const res = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier: 'maya.lin@test.com',
          password: 'password123'
        })
      });

      assert.equal(res.status, 200);
      assert.ok(res.data.token);
      assert.equal(res.data.user.name, 'Maya Lin');
    });

    test('POST /api/auth/login succeeds with UID identifier', async () => {
      const res = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier: '@vynk.m9x2k1',
          password: 'password123'
        })
      });

      assert.equal(res.status, 200);
      assert.ok(res.data.token);
    });

    test('POST /api/auth/login rejects invalid password', async () => {
      const res = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier: 'maya.lin@test.com',
          password: 'wrongpassword'
        })
      });

      assert.equal(res.status, 401);
    });

    test('GET /api/auth/me returns current user profile with stats', async () => {
      const res = await api('/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.user.id, currentUserId);
      assert.ok(res.data.user.stats);
    });
  });

  // 2. USER PROFILE TESTS
  describe('2. User Profiles & Connections', () => {
    test('GET /api/users/:identifier returns public profile', async () => {
      const res = await api('/users/vynk.t7x4k9');
      assert.equal(res.status, 200);
      assert.equal(res.data.profile.name, 'Tanush');
      assert.ok(res.data.profile.stats.postsCount >= 1);
    });

    test('PATCH /api/users/profile updates user bio and interests', async () => {
      const res = await api('/users/profile', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          bio: 'Building the next gen social web on Vynk! ⚡',
          interests: ['Tech & AI', 'Travel', 'Coding']
        })
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.profile.bio, 'Building the next gen social web on Vynk! ⚡');
      assert.ok(res.data.profile.interests.includes('Coding'));
    });
  });

  // 3. POSTS & MOOD FEED TESTS
  describe('3. Posts & Mood Feed System', () => {
    test('POST /api/posts creates new post with mood and tags', async () => {
      const payload = {
        caption: 'First moment shared on Vynk! Sunset over the horizon 🌄',
        mood: 'travel',
        tags: ['#Travel', '#Sunset', '#Moments'],
        media: [
          {
            url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800',
            type: 'image',
            altText: 'Vibrant sunset over mountains'
          }
        ]
      };

      const res = await api('/posts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
        body: JSON.stringify(payload)
      });

      assert.equal(res.status, 201);
      assert.equal(res.data.post.caption, payload.caption);
      assert.equal(res.data.post.mood, 'travel');
      assert.equal(res.data.post.media.length, 1);
      testPostId = res.data.post.id;
    });

    test('GET /api/posts/feed returns posts with mood filtering', async () => {
      const resTravel = await api('/posts/feed?mood=travel');
      assert.equal(resTravel.status, 200);
      assert.ok(resTravel.data.posts.length > 0);
      for (const p of resTravel.data.posts) {
        assert.equal(p.mood, 'travel');
      }

      const resAll = await api('/posts/feed?mood=for_you');
      assert.equal(resAll.status, 200);
      assert.ok(resAll.data.posts.length > 1);
    });

    test('GET /api/posts/:id fetches single post details', async () => {
      const res = await api(`/posts/${testPostId}`);
      assert.equal(res.status, 200);
      assert.equal(res.data.post.id, testPostId);
    });
  });

  // 4. WAVES REACTION SYSTEM TESTS
  describe('4. "Waves" Meaningful Social Interaction System', () => {
    test('POST /api/posts/:id/react toggles inspire (✦) reaction', async () => {
      const res = await api(`/posts/${testPostId}/react`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ reactionType: 'inspire' })
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.userReaction, 'inspire');
      assert.equal(res.data.reactionsSummary.inspire, 1);
      assert.match(res.data.headline, /felt inspired/i);
    });

    test('POST /api/posts/:id/react updates reaction when user switches to love (❤️)', async () => {
      const res = await api(`/posts/${testPostId}/react`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ reactionType: 'love' })
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.userReaction, 'love');
      assert.equal(res.data.reactionsSummary.love, 1);
      assert.equal(res.data.reactionsSummary.inspire, 0); // Replaced previous reaction
    });

    test('POST /api/posts/:id/react clicking same reaction toggles it off', async () => {
      const res = await api(`/posts/${testPostId}/react`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ reactionType: 'love' })
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.userReaction, null);
      assert.equal(res.data.reactionsSummary.love, 0);
    });
  });

  // 5. COMMENTS & THREADING TESTS
  describe('5. Comments & Threading', () => {
    test('POST /api/comments/post/:id creates a comment', async () => {
      const res = await api(`/comments/post/${testPostId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ content: 'Gorgeous perspective! Great first post.' })
      });

      assert.equal(res.status, 201);
      assert.equal(res.data.comment.content, 'Gorgeous perspective! Great first post.');
      testCommentId = res.data.comment.id;
    });

    test('POST /api/comments/post/:id creates a nested reply', async () => {
      const res = await api(`/comments/post/${testPostId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          content: 'Thank you so much! Truly appreciated.',
          parentId: testCommentId
        })
      });

      assert.equal(res.status, 201);
      assert.equal(res.data.comment.parentId, testCommentId);
    });

    test('GET /api/comments/post/:id returns threaded comments hierarchy', async () => {
      const res = await api(`/comments/post/${testPostId}`);
      assert.equal(res.status, 200);
      assert.ok(res.data.comments.length >= 1);
      const parent = res.data.comments.find((c: any) => c.id === testCommentId);
      assert.ok(parent, 'Parent comment found');
      assert.ok(parent.replies && parent.replies.length >= 1, 'Reply attached to parent');
    });

    test('POST /api/comments/:commentId/like toggles comment like', async () => {
      const res = await api(`/comments/${testCommentId}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` }
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.isLiked, true);
      assert.equal(res.data.likesCount, 1);
    });
  });

  // 6. FOLLOW & CONNECTION SYSTEM TESTS
  describe('6. Follow & Connection System', () => {
    test('POST /api/users/:targetId/follow connects with creator', async () => {
      const targetUserId = 'user_tanush_01';
      const res = await api(`/users/${targetUserId}/follow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` }
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.isFollowing, true);
    });

    test('POST /api/users/:targetId/follow prevents self-following', async () => {
      const res = await api(`/users/${currentUserId}/follow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` }
      });

      assert.equal(res.status, 400);
      assert.match(res.data.error, /cannot connect with yourself/i);
    });

    test('DELETE /api/users/:targetId/follow disconnects from creator', async () => {
      const targetUserId = 'user_tanush_01';
      const res = await api(`/users/${targetUserId}/follow`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` }
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.isFollowing, false);
    });
  });

  // 7. AI ASSISTANT CONTENT SUGGESTION TESTS
  describe('7. AI Content Suggestion & Safety', () => {
    test('POST /api/ai/suggest returns smart caption, tags and mood', async () => {
      const res = await api('/ai/suggest', {
        method: 'POST',
        body: JSON.stringify({ topic: 'mountain hike sunrise' })
      });

      assert.equal(res.status, 200);
      assert.ok(res.data.caption);
      assert.ok(res.data.tags.length > 0);
      assert.equal(res.data.safetyScore, 'SAFE');
    });
  });
});
