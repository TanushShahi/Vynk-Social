import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import app from '../src/app.js';
import { runSeed } from '../src/db/seed.js';
import { query } from '../src/config/db.js';

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

describe('Vynk Social Platform — Phase 1–3 Bug Fixes & User Connectivity Verification', () => {
  let tokenA = '';
  let userA: any = null;
  let tokenB = '';
  let userB: any = null;
  let tokenC = '';
  let userC: any = null;

  before(async () => {
    await runSeed();
    server = app.listen(PORT);
    await new Promise(resolve => setTimeout(resolve, 300));

    // Account A: Aarav
    const resA = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: 'aarav@vynk.social', password: 'password123' })
    });
    assert.strictEqual(resA.status, 200);
    tokenA = resA.data.token;
    userA = resA.data.user;

    // Account B: Riya
    const resB = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: 'riya@vynk.social', password: 'password123' })
    });
    assert.strictEqual(resB.status, 200);
    tokenB = resB.data.token;
    userB = resB.data.user;

    // Account C: Tanush
    const resC = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: 'tanush@vynk.social', password: 'password123' })
    });
    assert.strictEqual(resC.status, 200);
    tokenC = resC.data.token;
    userC = resC.data.user;
  });

  after(() => {
    server.close();
  });

  // BUG 1: Follow Notification System
  describe('BUG 1: Follow Notification System', () => {
    test('Account A follows Account B and Account B receives real follow notification', async () => {
      // First ensure A does not follow B initially
      await api(`/users/${userB.id}/follow`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenA}` }
      });

      // Clear existing notifications for B to test cleanly
      query.run('DELETE FROM notifications WHERE user_id = ?', [userB.id]);

      // Account A follows Account B
      const followRes = await api(`/users/${userB.id}/follow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      assert.strictEqual(followRes.status, 200);
      assert.strictEqual(followRes.data.isFollowing, true);

      // Account B checks notifications
      const notifRes = await api('/notifications', {
        headers: { Authorization: `Bearer ${tokenB}` }
      });
      assert.strictEqual(notifRes.status, 200);
      assert.ok(Array.isArray(notifRes.data.notifications));

      const followNotif = notifRes.data.notifications.find(
        (n: any) => n.type === 'follow' && (n.actorId === userA.id || n.senderId === userA.id)
      );
      assert.ok(followNotif, 'Follow notification must exist for Account B');
      assert.ok(followNotif.content.includes(userA.uid) || followNotif.content.includes('following you'));

      // Account B marks notification as read
      const markReadRes = await api(`/notifications/${followNotif.id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${tokenB}` }
      });
      assert.strictEqual(markReadRes.status, 200);

      // Unfollowing should NOT create a notification
      const preCount = (query.get('SELECT COUNT(*) as count FROM notifications WHERE user_id = ?', [userB.id]) as any).count;
      await api(`/users/${userB.id}/follow`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      const postCount = (query.get('SELECT COUNT(*) as count FROM notifications WHERE user_id = ?', [userB.id]) as any).count;
      assert.strictEqual(preCount, postCount, 'Unfollowing must not generate notifications');
    });
  });

  // BUG 2: Replace Hardcoded Capsule Statistics
  describe('BUG 2: Replace Hardcoded Capsule Statistics', () => {
    test('User profile returns accurate live capsule count matching SQLite records', async () => {
      // Direct SQLite count
      const dbCapsules = (query.get('SELECT COUNT(*) as count FROM capsules WHERE user_id = ?', [userA.id]) as any).count;

      // Check /api/auth/me
      const meRes = await api('/auth/me', {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      assert.strictEqual(meRes.status, 200);
      assert.strictEqual(meRes.data.user.stats.capsulesCount, dbCapsules);
      assert.notStrictEqual(meRes.data.user.stats.capsulesCount, 12, 'Must not be hardcoded 12');
      assert.notStrictEqual(meRes.data.user.stats.capsulesCount, 86, 'Must not be hardcoded 86');

      // Check /api/users/:identifier
      const profileRes = await api(`/users/${userA.uid}`, {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      assert.strictEqual(profileRes.status, 200);
      assert.strictEqual(profileRes.data.profile.stats.capsulesCount, dbCapsules);

      // Create a new capsule and verify dynamic increment
      const createCapRes = await api('/capsules', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` },
        body: JSON.stringify({
          title: 'Dynamic Test Capsule 2026',
          description: 'Testing live capsule counting',
          coverUrl: 'https://images.unsplash.com/photo-test',
          isPrivate: false,
          colorTheme: 'violet',
          tags: ['test', 'capsule']
        })
      });
      assert.strictEqual(createCapRes.status, 201);
      const newCapsuleId = createCapRes.data.capsule.id;

      // Verify count increased by 1
      const updatedRes = await api(`/users/${userA.uid}`, {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      assert.strictEqual(updatedRes.data.profile.stats.capsulesCount, dbCapsules + 1);

      // Delete the capsule and verify decrement
      const delRes = await api(`/capsules/${newCapsuleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      assert.strictEqual(delRes.status, 200);

      const revertedRes = await api(`/users/${userA.uid}`, {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      assert.strictEqual(revertedRes.data.profile.stats.capsulesCount, dbCapsules);
    });
  });

  // BUG 3: Private Account Follow Requests
  describe('BUG 3: Implement Private Account Follow Requests', () => {
    test('Private account requires approval: request, accept, and reject flows', async () => {
      // Ensure clean state before testing private follow requests
      query.run('DELETE FROM follows WHERE (follower_id = ? AND following_id = ?) OR (follower_id = ? AND following_id = ?)', [userA.id, userB.id, userB.id, userA.id]);
      query.run('DELETE FROM follow_requests WHERE target_id = ? OR follower_id = ?', [userB.id, userB.id]);

      // 1. Account B sets privacy to private
      const privacyRes = await api('/users/profile', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${tokenB}` },
        body: JSON.stringify({ isPrivate: true })
      });
      assert.strictEqual(privacyRes.status, 200);

      // Verify Account B's profile reflects private
      const bProfileRes = await api(`/users/${userB.uid}`, {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      assert.strictEqual(bProfileRes.data.profile.isPrivate, true);

      // 2. Account A requests to follow Account B
      const followReqRes = await api(`/users/${userB.id}/follow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      assert.strictEqual(followReqRes.status, 200);
      assert.strictEqual(followReqRes.data.isFollowing, false);
      assert.strictEqual(followReqRes.data.isPending, true);

      // 3. Account B inspects pending follow requests
      const getReqsRes = await api('/users/follow-requests', {
        headers: { Authorization: `Bearer ${tokenB}` }
      });
      assert.strictEqual(getReqsRes.status, 200);
      assert.ok(Array.isArray(getReqsRes.data.requests));
      const pendingReq = getReqsRes.data.requests.find((r: any) => r.followerId === userA.id);
      assert.ok(pendingReq, 'Account A request must be in pending list');
      assert.strictEqual(pendingReq.status, 'pending');

      // 4. Account B accepts Account A's request
      const acceptRes = await api(`/users/${userA.id}/follow-request/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenB}` }
      });
      assert.strictEqual(acceptRes.status, 200);
      assert.strictEqual(acceptRes.data.success, true);

      // Verify Account A is now following Account B
      const checkFollowRes = await api(`/users/${userB.uid}`, {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      assert.strictEqual(checkFollowRes.data.profile.isFollowing, true);
      assert.strictEqual(checkFollowRes.data.profile.isPending, false);

      // 5. Test Reject Flow: Account C sends follow request, Account B rejects it
      query.run('DELETE FROM follows WHERE follower_id = ? AND following_id = ?', [userC.id, userB.id]);
      query.run('DELETE FROM follow_requests WHERE follower_id = ? AND target_id = ?', [userC.id, userB.id]);

      const followReqC = await api(`/users/${userB.id}/follow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenC}` }
      });
      assert.strictEqual(followReqC.status, 200);
      assert.strictEqual(followReqC.data.isPending, true);

      const rejectRes = await api(`/users/${userC.id}/follow-request/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenB}` }
      });
      assert.strictEqual(rejectRes.status, 200);

      // Verify Account C is not following and not pending
      const checkCRes = await api(`/users/${userB.uid}`, {
        headers: { Authorization: `Bearer ${tokenC}` }
      });
      assert.strictEqual(checkCRes.data.profile.isFollowing, false);
      assert.strictEqual(checkCRes.data.profile.isPending, false);

      // Reset Account B back to public
      await api('/users/profile', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${tokenB}` },
        body: JSON.stringify({ isPrivate: false })
      });
    });
  });

  // BUG 4: Account Blocking
  describe('BUG 4: Implement Account Blocking System', () => {
    test('Account A blocks Account B: severs relations and prevents follow & messages', async () => {
      // 1. Account A blocks Account B
      const blockRes = await api(`/users/${userB.id}/block`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      assert.strictEqual(blockRes.status, 200);
      assert.strictEqual(blockRes.data.isBlocked, true);

      // 2. Account A checks blocked list
      const blockedListRes = await api('/users/blocked', {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      assert.strictEqual(blockedListRes.status, 200);
      const isBInBlocked = blockedListRes.data.blockedUsers.some((u: any) => u.blockedId === userB.id || u.blockedUser?.id === userB.id);
      assert.ok(isBInBlocked, 'Account B must appear in blocked users list');

      // 3. Account B cannot follow Account A (returns 403)
      const blockedFollowRes = await api(`/users/${userA.id}/follow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenB}` }
      });
      assert.strictEqual(blockedFollowRes.status, 403);

      // 4. Account B cannot send messages to Account A (returns 403)
      // First find or create a conversation
      const convRes = await api('/messages/conversations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` },
        body: JSON.stringify({ participantId: userB.id })
      });
      const convId = convRes.data.conversation?.id;
      if (convId) {
        const sendRes = await api(`/messages/conversations/${convId}/messages`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${tokenB}` },
          body: JSON.stringify({ content: 'Hello while blocked' })
        });
        assert.strictEqual(sendRes.status, 403);
      }

      // 5. Account A unblocks Account B
      const unblockRes = await api(`/users/${userB.id}/block`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      assert.strictEqual(unblockRes.status, 200);
      assert.strictEqual(unblockRes.data.isBlocked, false);

      // Verify unblocked from blocked list
      const postUnblockList = await api('/users/blocked', {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      const stillBlocked = postUnblockList.data.blockedUsers.some((u: any) => u.id === userB.id);
      assert.strictEqual(stillBlocked, false);
    });
  });

  // BUG 5: Search Pagination & Dynamic Hashtags
  describe('BUG 5: Search Pagination & Dynamic Hashtags', () => {
    test('Search endpoint handles pagination metadata, offsets, and dynamic hashtags', async () => {
      // 1. Page 1 with limit 2
      const page1Res = await api('/search?q=a&page=1&limit=2');
      assert.strictEqual(page1Res.status, 200);
      assert.ok(page1Res.data.pagination, 'Pagination metadata must be present');
      assert.strictEqual(page1Res.data.pagination.page, 1);
      assert.strictEqual(page1Res.data.pagination.limit, 2);
      assert.ok(page1Res.data.users.length <= 2);

      // 2. Page 2 with limit 2
      const page2Res = await api('/search?q=a&page=2&limit=2');
      assert.strictEqual(page2Res.status, 200);
      assert.strictEqual(page2Res.data.pagination.page, 2);
      assert.strictEqual(page2Res.data.pagination.limit, 2);

      // Verify no duplicate users between page 1 and page 2
      const page1Ids = page1Res.data.users.map((u: any) => u.id);
      const page2Ids = page2Res.data.users.map((u: any) => u.id);
      for (const id of page2Ids) {
        assert.strictEqual(page1Ids.includes(id), false, 'Page 2 should not contain items from Page 1');
      }

      // 3. Dynamic hashtag aggregation
      assert.ok(Array.isArray(page1Res.data.hashtags));
      if (page1Res.data.hashtags.length > 0) {
        assert.ok(typeof page1Res.data.hashtags[0].count === 'number');
        assert.ok(page1Res.data.hashtags[0].tag.startsWith('#'));
      }
    });
  });

  // BUG 6: Remove All Hardcoded Profile Statistics
  describe('BUG 6: Zero Hardcoded Profile Statistics', () => {
    test('All profile statistics across users, search, and message participants match database', async () => {
      // 1. Current user /api/auth/me
      const meRes = await api('/auth/me', {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      const dbPostsCount = (query.get('SELECT COUNT(*) as c FROM posts WHERE author_id = ?', [userA.id]) as any).c;
      const dbFollowersCount = (query.get('SELECT COUNT(*) as c FROM follows WHERE following_id = ?', [userA.id]) as any).c;
      const dbFollowingCount = (query.get('SELECT COUNT(*) as c FROM follows WHERE follower_id = ?', [userA.id]) as any).c;
      const dbCapsulesCount = (query.get('SELECT COUNT(*) as c FROM capsules WHERE user_id = ?', [userA.id]) as any).c;

      assert.strictEqual(meRes.data.user.stats.postsCount, dbPostsCount);
      assert.strictEqual(meRes.data.user.stats.followersCount, dbFollowersCount);
      assert.strictEqual(meRes.data.user.stats.followingCount, dbFollowingCount);
      assert.strictEqual(meRes.data.user.stats.capsulesCount, dbCapsulesCount);

      // 2. Search users result stats
      const searchRes = await api(`/search?q=${userA.uid}`);
      assert.strictEqual(searchRes.status, 200);
      const foundUser = searchRes.data.users.find((u: any) => u.id === userA.id);
      assert.ok(foundUser);
      assert.strictEqual(foundUser.stats.postsCount, dbPostsCount);
      assert.strictEqual(foundUser.stats.capsulesCount, dbCapsulesCount);

      // 3. Follow requests follower stats
      // Clean previous follow between C and A
      query.run('DELETE FROM follows WHERE follower_id = ? AND following_id = ?', [userC.id, userA.id]);
      query.run('DELETE FROM follow_requests WHERE follower_id = ? AND target_id = ?', [userC.id, userA.id]);

      // Make user C request to follow user A
      await api('/users/profile', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${tokenA}` },
        body: JSON.stringify({ isPrivate: true })
      });
      await api(`/users/${userA.id}/follow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenC}` }
      });
      const reqList = await api('/users/follow-requests', {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      const cReq = reqList.data.requests.find((r: any) => r.followerId === userC.id);
      assert.ok(cReq);
      const dbCPosts = (query.get('SELECT COUNT(*) as c FROM posts WHERE author_id = ?', [userC.id]) as any).c;
      assert.strictEqual(cReq.follower.stats.postsCount, dbCPosts);

      // Reset user A back to public
      await api('/users/profile', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${tokenA}` },
        body: JSON.stringify({ isPrivate: false })
      });
    });
  });

  // TWO-ACCOUNT CONNECTIVITY AUDIT TEST
  describe('Full Two-Account Connectivity Test', () => {
    test('End-to-End Search, Profile Inspect, Mutual Follow, Notification, and Session Persistence', async () => {
      // Ensure clean public state for both accounts
      query.run('DELETE FROM blocks WHERE blocker_id IN (?, ?) OR blocked_id IN (?, ?)', [userA.id, userB.id, userA.id, userB.id]);
      query.run('DELETE FROM follows WHERE follower_id IN (?, ?) OR following_id IN (?, ?)', [userA.id, userB.id, userA.id, userB.id]);
      query.run('DELETE FROM follow_requests WHERE follower_id IN (?, ?) OR target_id IN (?, ?)', [userA.id, userB.id, userA.id, userB.id]);
      query.run('UPDATE users SET is_private = 0 WHERE id IN (?, ?)', [userA.id, userB.id]);

      // Step 1: Account A searches for Account B
      const searchRes = await api(`/search?q=${userB.uid}`);
      assert.strictEqual(searchRes.status, 200);
      const matchedB = searchRes.data.users.find((u: any) => u.id === userB.id);
      assert.ok(matchedB, 'Account A must find Account B in live search');

      // Step 2: Account A opens Account B profile
      const bProfileRes = await api(`/users/${userB.uid}`, {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      assert.strictEqual(bProfileRes.status, 200);
      assert.strictEqual(bProfileRes.data.profile.id, userB.id);

      // Step 3: Account A follows Account B
      // Clear follows between A and B first
      await api(`/users/${userB.id}/follow`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      await api(`/users/${userA.id}/follow`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenB}` }
      });

      const followRes = await api(`/users/${userB.id}/follow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      assert.strictEqual(followRes.status, 200);
      assert.strictEqual(followRes.data.isFollowing, true);

      // Step 4: Account B receives real notification
      const bNotifs = await api('/notifications', {
        headers: { Authorization: `Bearer ${tokenB}` }
      });
      assert.strictEqual(bNotifs.status, 200);
      const followNotif = bNotifs.data.notifications.find((n: any) => n.type === 'follow');
      assert.ok(followNotif, 'Account B must receive real follow notification');

      // Step 5: Account B inspects Account A profile: verifies relationship
      const aProfileRes = await api(`/users/${userA.uid}`, {
        headers: { Authorization: `Bearer ${tokenB}` }
      });
      assert.strictEqual(aProfileRes.status, 200);
      assert.strictEqual(aProfileRes.data.profile.isFollowing, false); // B doesn't follow A yet

      // Step 6: Account B follows Account A back
      const bFollowsA = await api(`/users/${userA.id}/follow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenB}` }
      });
      assert.strictEqual(bFollowsA.status, 200);
      assert.strictEqual(bFollowsA.data.isFollowing, true);

      // Step 7: Both accounts see mutual connection
      const aProfileFromB = await api(`/users/${userA.uid}`, {
        headers: { Authorization: `Bearer ${tokenB}` }
      });
      assert.strictEqual(aProfileFromB.data.profile.isFollowing, true);

      const bProfileFromA = await api(`/users/${userB.uid}`, {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      assert.strictEqual(bProfileFromA.data.profile.isFollowing, true);

      // Step 8: Account A logs out and logs back in
      const reLoginA = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier: 'aarav@vynk.social', password: 'password123' })
      });
      assert.strictEqual(reLoginA.status, 200);
      const newTokenA = reLoginA.data.token;

      // Step 9: Follow relationship still exists and persists in database
      const postLoginBProfile = await api(`/users/${userB.uid}`, {
        headers: { Authorization: `Bearer ${newTokenA}` }
      });
      assert.strictEqual(postLoginBProfile.status, 200);
      assert.strictEqual(postLoginBProfile.data.profile.isFollowing, true);
    });
  });
});
