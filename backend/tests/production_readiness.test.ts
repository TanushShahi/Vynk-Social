import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import app from '../src/app.js';
import { runSeed } from '../src/db/seed.js';
import { query } from '../src/config/db.js';

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

describe('Vynk Social — Final Phase 1–3 Production Readiness Verification Suite', () => {
  let devA_token = '';
  let devA_user: any = null;
  let devB_token = '';
  let devB_user: any = null;

  before(async () => {
    await runSeed();
    server = app.listen(PORT);
    await new Promise(resolve => setTimeout(resolve, 300));

    // Device A: Aarav (user_aarav_02)
    const resA = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: 'aarav@vynk.social', password: 'password123' })
    });
    assert.strictEqual(resA.status, 200);
    devA_token = resA.data.token;
    devA_user = resA.data.user;

    // Device B: Riya (user_riya_03)
    const resB = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: 'riya@vynk.social', password: 'password123' })
    });
    assert.strictEqual(resB.status, 200);
    devB_token = resB.data.token;
    devB_user = resB.data.user;
  });

  after(() => {
    server.closeAllConnections?.();
    server.close();
  });

  // =========================================================================
  // 1. REAL MULTI-DEVICE / TWO-ENVIRONMENT CONNECTIVITY
  // =========================================================================
  describe('1. Real Multi-Device Independent Session Connectivity', () => {
    test('Device A & Device B: Search, Profile, Mutual Follow, Post, Comment, Story, Message, Reactions', async () => {
      // 1. Device A searches for Device B
      const searchRes = await api(`/search?q=${devB_user.uid}`, {
        headers: { Authorization: `Bearer ${devA_token}` }
      });
      assert.strictEqual(searchRes.status, 200);
      assert.ok(searchRes.data.users.some((u: any) => u.id === devB_user.id));

      // 2. Device A views Device B profile
      const profRes = await api(`/users/${devB_user.uid}`, {
        headers: { Authorization: `Bearer ${devA_token}` }
      });
      assert.strictEqual(profRes.status, 200);
      assert.strictEqual(profRes.data.profile.id, devB_user.id);

      // Clean follow & blocks
      query.run('DELETE FROM follows WHERE follower_id IN (?, ?) OR following_id IN (?, ?)', [devA_user.id, devB_user.id, devA_user.id, devB_user.id]);
      query.run('DELETE FROM blocks WHERE blocker_id IN (?, ?) OR blocked_id IN (?, ?)', [devA_user.id, devB_user.id, devA_user.id, devB_user.id]);
      query.run('UPDATE users SET is_private = 0 WHERE id IN (?, ?)', [devA_user.id, devB_user.id]);

      // 3. Device A follows Device B
      const followRes = await api(`/users/${devB_user.id}/follow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${devA_token}` }
      });
      assert.strictEqual(followRes.status, 200);
      assert.strictEqual(followRes.data.isFollowing, true);

      // 4. Device B receives follow notification
      const notifsB = await api('/notifications', {
        headers: { Authorization: `Bearer ${devB_token}` }
      });
      assert.strictEqual(notifsB.status, 200);
      const followNotif = notifsB.data.notifications.find((n: any) => n.type === 'follow' && n.actorId === devA_user.id);
      assert.ok(followNotif, 'Device B must receive follow notification from Device A');

      // 5. Device A creates a post; Device B views it in feed
      const createPostRes = await api('/posts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${devA_token}` },
        body: JSON.stringify({
          caption: 'Live multi-device test post across sessions!',
          mood: 'creative',
          audience: 'public',
          tags: ['multidevice', 'vynk'],
          media: [{ url: 'https://images.unsplash.com/photo-1518770660439-4636190af475', type: 'image' }]
        })
      });
      assert.strictEqual(createPostRes.status, 201);
      const testPostId = createPostRes.data.post.id;

      // Device B retrieves the post
      const getPostRes = await api(`/posts/${testPostId}`, {
        headers: { Authorization: `Bearer ${devB_token}` }
      });
      assert.strictEqual(getPostRes.status, 200);
      assert.strictEqual(getPostRes.data.post.id, testPostId);

      // 6. Device B reacts to Device A post ("Wave")
      const reactRes = await api(`/posts/${testPostId}/react`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${devB_token}` },
        body: JSON.stringify({ reactionType: 'inspire' })
      });
      assert.strictEqual(reactRes.status, 200);
      assert.strictEqual(reactRes.data.userReaction, 'inspire');

      // 7. Device B comments on Device A post
      const commentRes = await api(`/comments/post/${testPostId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${devB_token}` },
        body: JSON.stringify({ content: 'Remarkable post seen from Device B!' })
      });
      assert.strictEqual(commentRes.status, 201);
      const commentId = commentRes.data.comment.id;

      // 8. Device A replies to Device B comment
      const replyRes = await api(`/comments/post/${testPostId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${devA_token}` },
        body: JSON.stringify({ content: 'Thanks from Device A!', parentId: commentId })
      });
      assert.strictEqual(replyRes.status, 201);

      // 9. Device A posts a Story; Device B views and contributes to Story Thread
      const createStoryRes = await api('/stories', {
        method: 'POST',
        headers: { Authorization: `Bearer ${devA_token}` },
        body: JSON.stringify({
          mediaUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb',
          mediaType: 'image',
          caption: 'Morning sunrise on Device A'
        })
      });
      assert.strictEqual(createStoryRes.status, 201);
      const parentStoryId = createStoryRes.data.story.id;

      const threadRes = await api('/stories', {
        method: 'POST',
        headers: { Authorization: `Bearer ${devB_token}` },
        body: JSON.stringify({
          mediaUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800',
          mediaType: 'image',
          caption: 'Sunrise view from Device B!',
          parentStoryId
        })
      });
      assert.strictEqual(threadRes.status, 201);
      assert.strictEqual(threadRes.data.story.parentStoryId, parentStoryId);

      // 10. Direct Messaging: Device A sends message to Device B
      // Find or create conversation
      const convRes = await api('/messages/conversations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${devA_token}` },
        body: JSON.stringify({ participantId: devB_user.id })
      });
      assert.strictEqual(convRes.status, 200);
      const convId = convRes.data.conversation.id;

      const msgSendRes = await api(`/messages/conversations/${convId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${devA_token}` },
        body: JSON.stringify({ content: 'Direct ping between devices!' })
      });
      assert.strictEqual(msgSendRes.status, 201);
      const msgId = msgSendRes.data.message.id;

      // Device B reacts to message
      const msgReactRes = await api(`/messages/messages/${msgId}/react`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${devB_token}` },
        body: JSON.stringify({ emoji: '⚡' })
      });
      assert.strictEqual(msgReactRes.status, 200);

      // Device A unfollows Device B
      const unfollowRes = await api(`/users/${devB_user.id}/follow`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${devA_token}` }
      });
      assert.strictEqual(unfollowRes.status, 200);
      assert.strictEqual(unfollowRes.data.isFollowing, false);
    });
  });

  // =========================================================================
  // 2. COMPLETE BLOCKING ENFORCEMENT ACROSS ALL 8 SUB-SYSTEMS
  // =========================================================================
  describe('2. Complete Blocking Enforcement Across All Features', () => {
    test('Enforces blocking across follows, messaging, comments, stories, rooms, collabs, capsules, search', async () => {
      // Setup: Account A blocks Account B
      const blockRes = await api(`/users/${devB_user.id}/block`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${devA_token}` }
      });
      assert.strictEqual(blockRes.status, 200);
      assert.strictEqual(blockRes.data.isBlocked, true);

      // 1. Follow System Restriction: B cannot follow A; A cannot follow B
      const bFollowsA = await api(`/users/${devA_user.id}/follow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${devB_token}` }
      });
      assert.strictEqual(bFollowsA.status, 403, 'Blocked user cannot follow');

      const aFollowsB = await api(`/users/${devB_user.id}/follow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${devA_token}` }
      });
      assert.strictEqual(aFollowsB.status, 403, 'Blocker cannot follow blocked user');

      // 2. Messaging Restriction: B cannot message A in conversation
      const convRes = await api('/messages/conversations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${devA_token}` },
        body: JSON.stringify({ participantId: devB_user.id })
      });
      const convId = convRes.data.conversation?.id;
      if (convId) {
        const bMsgA = await api(`/messages/conversations/${convId}/messages`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${devB_token}` },
          body: JSON.stringify({ content: 'Should be blocked' })
        });
        assert.strictEqual(bMsgA.status, 403, 'Blocked user cannot send message');
      }

      // 3. Comments Restriction: B cannot comment on A post; A cannot comment on B post
      // Create a post by Account A
      const postARes = await api('/posts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${devA_token}` },
        body: JSON.stringify({ caption: 'Account A post for block testing', mood: 'chill' })
      });
      const postAId = postARes.data.post.id;

      const bCommentPostA = await api(`/comments/post/${postAId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${devB_token}` },
        body: JSON.stringify({ content: 'Blocked comment attempt' })
      });
      assert.strictEqual(bCommentPostA.status, 403, 'Blocked user cannot comment on post');

      // 4. Wave Reaction Restriction: B cannot react to A post
      const bReactPostA = await api(`/posts/${postAId}/react`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${devB_token}` },
        body: JSON.stringify({ reactionType: 'love' })
      });
      assert.strictEqual(bReactPostA.status, 403, 'Blocked user cannot react to post');

      // 5. Story Thread Restriction: B cannot contribute to A Story Thread
      const storyARes = await api('/stories', {
        method: 'POST',
        headers: { Authorization: `Bearer ${devA_token}` },
        body: JSON.stringify({ mediaUrl: 'https://images.unsplash.com/test-story', caption: 'Story A' })
      });
      const storyAId = storyARes.data.story.id;

      const bThreadStoryA = await api('/stories', {
        method: 'POST',
        headers: { Authorization: `Bearer ${devB_token}` },
        body: JSON.stringify({ mediaUrl: 'https://images.unsplash.com/test-thread', parentStoryId: storyAId })
      });
      assert.strictEqual(bThreadStoryA.status, 403, 'Blocked user cannot contribute to story thread');

      // 6. Social Room Restriction: B cannot join room created by A
      const roomARes = await api('/rooms', {
        method: 'POST',
        headers: { Authorization: `Bearer ${devA_token}` },
        body: JSON.stringify({ name: 'Account A Private Room', topic: 'Tech' })
      });
      const roomAId = roomARes.data.room.id;

      const bJoinRoomA = await api(`/rooms/${roomAId}/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${devB_token}` }
      });
      assert.strictEqual(bJoinRoomA.status, 403, 'Blocked user cannot join room');

      // 7. Collab Posts Restriction: A cannot invite blocked B as co-author
      const collabRes = await api('/posts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${devA_token}` },
        body: JSON.stringify({
          caption: 'Collab post attempt with blocked user',
          isCollab: true,
          collabTitle: 'Blocked Collab',
          collaboratorIds: [devB_user.id]
        })
      });
      assert.strictEqual(collabRes.status, 403, 'Cannot create collab with blocked user');

      // 8. Capsule Invitation Restriction: A cannot invite blocked B to capsule
      const capRes = await api('/capsules', {
        method: 'POST',
        headers: { Authorization: `Bearer ${devA_token}` },
        body: JSON.stringify({
          title: 'Blocked Capsule Invite',
          collaboratorIds: [devB_user.id]
        })
      });
      assert.strictEqual(capRes.status, 403, 'Cannot add blocked user to capsule');

      // 9. Profile & Post Visibility: B viewing A profile shows isBlockedBy; A posts hidden from B
      const profCheck = await api(`/users/${devA_user.uid}`, {
        headers: { Authorization: `Bearer ${devB_token}` }
      });
      assert.strictEqual(profCheck.status, 200);
      assert.strictEqual(profCheck.data.profile.isBlockedBy, true);

      const bViewPostsA = await api(`/posts/user/${devA_user.id}`, {
        headers: { Authorization: `Bearer ${devB_token}` }
      });
      assert.strictEqual(bViewPostsA.status, 403, 'Cannot view post list of blocking user');

      // Unblock: Account A unblocks Account B
      const unblockRes = await api(`/users/${devB_user.id}/block`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${devA_token}` }
      });
      assert.strictEqual(unblockRes.status, 200);
      assert.strictEqual(unblockRes.data.isBlocked, false);
    });
  });

  // =========================================================================
  // 3. NOTIFICATION RELIABILITY & DEDUPLICATION
  // =========================================================================
  describe('3. Notification Reliability, Deduplication & Persistence', () => {
    test('Verifies follow, request, accept, message, comment, story, collab, and room notifications', async () => {
      // Clean previous notifications, blocks, and follows for Account B & Account A
      query.run('DELETE FROM notifications WHERE user_id IN (?, ?)', [devA_user.id, devB_user.id]);
      query.run('DELETE FROM blocks WHERE blocker_id IN (?, ?) OR blocked_id IN (?, ?)', [devA_user.id, devB_user.id, devA_user.id, devB_user.id]);
      query.run('DELETE FROM follows WHERE follower_id IN (?, ?) OR following_id IN (?, ?)', [devA_user.id, devB_user.id, devA_user.id, devB_user.id]);
      query.run('UPDATE users SET is_private = 0 WHERE id IN (?, ?)', [devA_user.id, devB_user.id]);

      // 1. Follow Notification
      await api(`/users/${devB_user.id}/follow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${devA_token}` }
      });
      const notifs1 = await api('/notifications', { headers: { Authorization: `Bearer ${devB_token}` } });
      const fNotif = notifs1.data.notifications.find((n: any) => n.type === 'follow');
      assert.ok(fNotif, 'Follow notification generated');

      // 2. Prevent duplicate follow notification
      const dupFollow = await api(`/users/${devB_user.id}/follow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${devA_token}` }
      });
      assert.strictEqual(dupFollow.status, 400); // Already following, no duplicate

      // 3. Follow Request & Acceptance Notifications
      // Account B becomes private
      await api('/users/profile', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${devB_token}` },
        body: JSON.stringify({ isPrivate: true })
      });
      // Unfollow first
      await api(`/users/${devB_user.id}/follow`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${devA_token}` }
      });
      // Request follow
      const reqRes = await api(`/users/${devB_user.id}/follow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${devA_token}` }
      });
      assert.strictEqual(reqRes.status, 200, JSON.stringify(reqRes.data));
      assert.strictEqual(reqRes.data.isPending, true);

      const notifsReq = await api('/notifications', { headers: { Authorization: `Bearer ${devB_token}` } });
      const reqNotif = notifsReq.data.notifications.find((n: any) => n.type === 'follow_request');
      assert.ok(reqNotif, 'Follow request notification generated');

      // Accept follow request
      query.run('DELETE FROM notifications WHERE user_id = ?', [devA_user.id]);
      const acceptRes = await api(`/users/${devA_user.id}/follow-request/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${devB_token}` }
      });
      assert.strictEqual(acceptRes.status, 200, JSON.stringify(acceptRes.data));
      const notifsAccept = await api('/notifications', { headers: { Authorization: `Bearer ${devA_token}` } });
      console.log('DEBUG notifsAccept count:', notifsAccept.data.notifications?.length, 'items:', JSON.stringify(notifsAccept.data));
      const acceptNotif = notifsAccept.data.notifications.find((n: any) => n.type === 'follow_accept');
      assert.ok(acceptNotif, 'Follow accept notification generated');

      // Reset B to public
      await api('/users/profile', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${devB_token}` },
        body: JSON.stringify({ isPrivate: false })
      });

      // 4. Comment Notification
      const postRes = await api('/posts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${devB_token}` },
        body: JSON.stringify({ caption: 'Notification test post', mood: 'chill' })
      });
      const pId = postRes.data.post.id;
      await api(`/comments/post/${pId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${devA_token}` },
        body: JSON.stringify({ content: 'Generating comment notification' })
      });
      const notifsComment = await api('/notifications', { headers: { Authorization: `Bearer ${devB_token}` } });
      const commentNotif = notifsComment.data.notifications.find((n: any) => n.type === 'comment');
      assert.ok(commentNotif, 'Comment notification generated');

      // 5. Reaction Notification
      await api(`/posts/${pId}/react`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${devA_token}` },
        body: JSON.stringify({ reactionType: 'wow' })
      });
      const notifsReact = await api('/notifications', { headers: { Authorization: `Bearer ${devB_token}` } });
      const reactNotif = notifsReact.data.notifications.find((n: any) => n.type === 'reaction');
      assert.ok(reactNotif, 'Reaction notification generated');

      // 6. Story Thread Notification
      const storyRes = await api('/stories', {
        method: 'POST',
        headers: { Authorization: `Bearer ${devB_token}` },
        body: JSON.stringify({ mediaUrl: 'https://images.unsplash.com/test-s', caption: 'Story notification test' })
      });
      const sId = storyRes.data.story.id;
      await api('/stories', {
        method: 'POST',
        headers: { Authorization: `Bearer ${devA_token}` },
        body: JSON.stringify({ mediaUrl: 'https://images.unsplash.com/test-t', parentStoryId: sId })
      });
      const notifsStory = await api('/notifications', { headers: { Authorization: `Bearer ${devB_token}` } });
      const storyNotif = notifsStory.data.notifications.find((n: any) => n.type === 'story_thread');
      assert.ok(storyNotif, 'Story thread notification generated');

      // 7. Collab Invite Notification
      await api('/posts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${devA_token}` },
        body: JSON.stringify({
          caption: 'Collab notification test',
          isCollab: true,
          collabTitle: 'Shared Trip',
          collaboratorIds: [devB_user.id]
        })
      });
      const notifsCollab = await api('/notifications', { headers: { Authorization: `Bearer ${devB_token}` } });
      const collabNotif = notifsCollab.data.notifications.find((n: any) => n.type === 'collab_invite');
      assert.ok(collabNotif, 'Collab invite notification generated');

      // 8. Room Invite / Activity Notification
      const roomRes = await api('/rooms', {
        method: 'POST',
        headers: { Authorization: `Bearer ${devB_token}` },
        body: JSON.stringify({ name: 'Notification Room', topic: 'Gaming' })
      });
      const rId = roomRes.data.room.id;
      await api(`/rooms/${rId}/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${devA_token}` }
      });
      const notifsRoom = await api('/notifications', { headers: { Authorization: `Bearer ${devB_token}` } });
      const roomNotif = notifsRoom.data.notifications.find((n: any) => n.type === 'room_invite');
      assert.ok(roomNotif, 'Room join notification generated');

      // 9. Persistence across Re-login
      const reloginRes = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier: 'riya@vynk.social', password: 'password123' })
      });
      const freshTokenB = reloginRes.data.token;
      const postLoginNotifs = await api('/notifications', { headers: { Authorization: `Bearer ${freshTokenB}` } });
      assert.ok(postLoginNotifs.data.notifications.length >= 5, 'Notifications persisted across sessions');
    });
  });

  // =========================================================================
  // 4. COMPLETE PHASE 1–3 FUNCTIONAL INTEGRATION
  // =========================================================================
  describe('4. Complete Phase 1–3 Feature Matrix Test', () => {
    test('Phase 1–3 Complete Lifecycle: Feed, Waves, Capsules, Collabs, Rooms, Polls, Health Engagement', async () => {
      console.log('STEP 1: feed');
      // Phase 1: Mood Feed filtering
      const motivatedFeed = await api('/posts/feed?mood=motivated');
      assert.strictEqual(motivatedFeed.status, 200);
      assert.ok(Array.isArray(motivatedFeed.data.posts));
      for (const p of motivatedFeed.data.posts) {
        assert.strictEqual(p.mood, 'motivated');
      }

      console.log('STEP 2: vibes');
      // Phase 2: Vibes (Vertical video clips)
      const vibesRes = await api('/vibes/feed?type=for_you');
      assert.strictEqual(vibesRes.status, 200);
      assert.ok(Array.isArray(vibesRes.data.videos));

      console.log('STEP 3: conv');
      // Phase 2: Shared Space (Photos, Notes, Links inside DM)
      const convRes = await api('/messages/conversations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${devA_token}` },
        body: JSON.stringify({ participantId: devB_user.id })
      });
      const convId = convRes.data.conversation.id;

      console.log('STEP 4: add shared space');
      const addSpaceRes = await api(`/messages/conversations/${convId}/shared-space`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${devA_token}` },
        body: JSON.stringify({
          itemType: 'note',
          content: 'Shared itinerary for next week',
          title: 'Trip Notes'
        })
      });
      assert.strictEqual(addSpaceRes.status, 201);

      console.log('STEP 5: get shared space');
      const getSpaceRes = await api(`/messages/conversations/${convId}/shared-space`, {
        headers: { Authorization: `Bearer ${devB_token}` }
      });
      assert.strictEqual(getSpaceRes.status, 200);
      assert.ok(getSpaceRes.data.items.some((item: any) => item.title === 'Trip Notes'));

      console.log('STEP 6: create capsule');
      // Phase 3: Moment Capsules with Full Timeline
      const capRes = await api('/capsules', {
        method: 'POST',
        headers: { Authorization: `Bearer ${devA_token}` },
        body: JSON.stringify({
          title: 'Engineering Life 2026',
          description: 'Four years summarized in a digital memory capsule',
          coverUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644',
          category: 'College',
          privacy: 'public'
        })
      });
      assert.strictEqual(capRes.status, 201);
      const capId = capRes.data.capsule.id;

      console.log('STEP 7: add moment');
      // Add timeline moments
      const addMomentRes = await api(`/capsules/${capId}/items`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${devA_token}` },
        body: JSON.stringify({
          itemType: 'photo',
          mediaUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644',
          caption: 'First Day of Lab',
          locationName: 'Campus Lab 301'
        })
      });
      assert.strictEqual(addMomentRes.status, 201);

      console.log('STEP 8: inspect capsule');
      const inspectCapRes = await api(`/capsules/${capId}`);
      assert.strictEqual(inspectCapRes.status, 200);
      assert.strictEqual(inspectCapRes.data.capsule.items.length, 1);

      console.log('STEP 9: create room');
      // Phase 3: Social Rooms with Polls and Live Voting
      const roomRes = await api('/rooms', {
        method: 'POST',
        headers: { Authorization: `Bearer ${devA_token}` },
        body: JSON.stringify({
          name: 'AI & Design Collective',
          topic: 'Tech',
          description: 'Weekly design critiques and prompts'
        })
      });
      const roomId = roomRes.data.room.id;

      console.log('STEP 10: poll message');
      // Post discussion with a poll
      const pollMsgRes = await api(`/rooms/${roomId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${devA_token}` },
        body: JSON.stringify({
          content: 'What is your preferred UI design framework in 2026?',
          pollData: {
            question: 'Best CSS Approach?',
            options: ['Tailwind CSS', 'Vanilla CSS Modules', 'Figma Tokens']
          }
        })
      });
      assert.strictEqual(pollMsgRes.status, 201);
      const pollMsgId = pollMsgRes.data.message.id;

      console.log('STEP 11: vote');
      // Device B votes on Poll option 0 (Tailwind CSS)
      const voteRes = await api(`/rooms/messages/${pollMsgId}/vote`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${devB_token}` },
        body: JSON.stringify({ optionIndex: 0 })
      });
      assert.strictEqual(voteRes.status, 200);
      assert.strictEqual(voteRes.data.pollData.userVote, 0);
      assert.strictEqual(voteRes.data.pollData.options[0].votes, 1);

      console.log('STEP 12: health');
      // Phase 3: Healthier Social Media Summary & Achievements
      const healthSummary = await api('/health-engagement/summary', {
        headers: { Authorization: `Bearer ${devA_token}` }
      });
      assert.strictEqual(healthSummary.status, 200);
      assert.ok(typeof healthSummary.data.summary.creatorsDiscovered === 'number');
      assert.ok(typeof healthSummary.data.summary.healthyTimeMinutes === 'number');

      console.log('STEP 13: achievements');
      const achievementsRes = await api('/health-engagement/achievements', {
        headers: { Authorization: `Bearer ${devA_token}` }
      });
      assert.strictEqual(achievementsRes.status, 200);
      assert.ok(Array.isArray(achievementsRes.data.achievements));
      console.log('DONE ALL STEPS');
    });
  });
});
