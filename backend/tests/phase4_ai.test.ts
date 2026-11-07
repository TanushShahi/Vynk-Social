import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import app from '../src/app.js';
import { runSeed } from '../src/db/seed.js';
import { query } from '../src/config/db.js';

let server: http.Server;
const PORT = 5105;
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

describe('Vynk Social Platform — Phase 4: Advanced AI Intelligence & Personalization', () => {
  let tokenA = '';
  let userA: any = null;
  let tokenB = '';
  let userB: any = null;
  let samplePostId = '';

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

    // Fetch a sample post to test with
    const feed = await api('/posts/feed', {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert.strictEqual(feed.status, 200);
    assert.ok(feed.data.posts && feed.data.posts.length > 0);
    samplePostId = feed.data.posts[0].id;
  });

  after(async () => {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server.close(err => (err ? reject(err) : resolve()));
      });
    }
  });

  // =========================================================================
  // 1. AI PROVIDER ARCHITECTURE & HONEST REPORTING
  // =========================================================================
  describe('1. AI Provider Architecture & Honest Reporting', () => {
    test('GET /ai/provider reports operational status and provider metadata without hallucinations', async () => {
      const res = await api('/ai/provider');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.status, 'ok');
      assert.ok(res.data.provider);
      assert.ok(typeof res.data.provider.provider === 'string');
      assert.ok(typeof res.data.provider.model === 'string');
      assert.strictEqual(res.data.provider.status, 'operational');
    });

    test('POST /ai/suggest maintains backward compatibility for legacy clients', async () => {
      const res = await api('/ai/suggest', {
        method: 'POST',
        body: JSON.stringify({ topic: 'mountain summit sunrise' })
      });
      assert.strictEqual(res.status, 200);
      assert.ok(res.data.suggestedMood);
      assert.ok(Array.isArray(res.data.extractedTags));
      assert.ok(typeof res.data.confidence === 'number');
    });
  });

  // =========================================================================
  // 2. AI CONTENT ASSISTANT & TONE CUSTOMIZATION
  // =========================================================================
  describe('2. AI Content Assistant & Tone Customization', () => {
    test('POST /ai/content/assist generates caption, hashtags, mood, altText, and 8 tone variations', async () => {
      const res = await api('/ai/content/assist', {
        method: 'POST',
        body: JSON.stringify({
          topic: 'Stargazing at a quiet campsite in Ladakh',
          currentMood: 'CURIOUS',
          tone: 'poetic',
          targetAudience: 'outdoor explorers'
        })
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      const assistant = res.data.assistant;
      assert.ok(assistant.caption && assistant.caption.length > 0);
      assert.ok(Array.isArray(assistant.hashtags) && assistant.hashtags.length > 0);
      assert.ok(assistant.suggestedMood);
      assert.ok(assistant.altText);
      assert.ok(assistant.category);
      assert.ok(Array.isArray(assistant.writingSuggestions));

      // Verify tone variations object contains requested tones
      assert.ok(assistant.toneVariations);
      assert.ok(assistant.toneVariations.friendly);
      assert.ok(assistant.toneVariations.witty);
      assert.ok(assistant.toneVariations.poetic);
      assert.ok(assistant.toneVariations.minimalist);
      assert.ok(assistant.toneVariations.inspirational);
      assert.ok(assistant.toneVariations.humorous);
      assert.ok(assistant.toneVariations.analytical);
      assert.ok(assistant.toneVariations.rebellious);
    });

    test('POST /ai/content/improve refines existing draft with explanation', async () => {
      const res = await api('/ai/content/improve', {
        method: 'POST',
        body: JSON.stringify({
          text: 'today was good i walked a lot',
          tone: 'inspirational'
        })
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.result.original, 'today was good i walked a lot');
      assert.ok(res.data.result.improved && res.data.result.improved.length > 0);
      assert.ok(res.data.result.explanation && res.data.result.explanation.length > 0);
      assert.strictEqual(res.data.result.tone, 'inspirational');
    });

    test('POST /ai/content/hashtags returns authentic interest hashtags', async () => {
      const res = await api('/ai/content/hashtags', {
        method: 'POST',
        body: JSON.stringify({
          text: 'minimalist architectural photography in Tokyo',
          count: 5
        })
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.ok(Array.isArray(res.data.hashtags));
      assert.ok(res.data.hashtags.length <= 5);
      // Verify no leading '#'
      for (const tag of res.data.hashtags) {
        assert.ok(!tag.startsWith('#'));
      }
    });
  });

  // =========================================================================
  // 3. MULTIMODAL IMAGE UNDERSTANDING
  // =========================================================================
  describe('3. Multimodal Image Understanding', () => {
    test('POST /ai/image/understand extracts scene context, palette, and perceptual hash', async () => {
      const res = await api('/ai/image/understand', {
        method: 'POST',
        body: JSON.stringify({
          mediaUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?mountain-hike-trail'
        })
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      const img = res.data.imageUnderstanding;
      assert.ok(Array.isArray(img.detectedObjects) && img.detectedObjects.length > 0);
      assert.ok(img.sceneDescription && img.sceneDescription.length > 0);
      assert.ok(Array.isArray(img.dominantColors) && img.dominantColors.length > 0);
      assert.ok(img.suggestedCategory);
      assert.ok(img.visualMood);
      assert.ok(typeof img.confidenceScore === 'number');
      assert.ok(img.perceptualHash && img.perceptualHash.startsWith('phash_'));
    });
  });

  // =========================================================================
  // 4. AI MOMENT CAPSULE ASSISTANT & DUPLICATE DETECTION
  // =========================================================================
  describe('4. AI Moment Capsule Assistant & Duplicate Detection', () => {
    test('POST /ai/capsule/assist generates narrative structure and detects duplicate images', async () => {
      const res = await api('/ai/capsule/assist', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Monsoon in the Western Ghats',
          category: 'Travel',
          items: [
            { mediaUrl: 'https://example.com/waterfall_1.jpg', caption: 'First view of the falls' },
            { mediaUrl: 'https://example.com/waterfall_1.jpg', caption: 'Burst capture duplicate' },
            { mediaUrl: 'https://example.com/tea_estate.jpg', caption: 'Foggy tea hills' }
          ]
        })
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      const ca = res.data.capsuleAssistant;
      assert.ok(ca.suggestedTitle);
      assert.ok(ca.memoryDescription);
      assert.ok(ca.chronologicalSummary);
      assert.ok(Array.isArray(ca.chapterHighlights) && ca.chapterHighlights.length > 0);

      // Verify duplicate detection caught indices 0 and 1
      assert.ok(Array.isArray(ca.duplicatesDetected));
      assert.strictEqual(ca.duplicatesDetected.length, 1);
      assert.strictEqual(ca.duplicatesDetected[0].indexA, 0);
      assert.strictEqual(ca.duplicatesDetected[0].indexB, 1);
      assert.strictEqual(ca.duplicatesDetected[0].similarity, 1.0);
      assert.ok(ca.duplicatesDetected[0].recommendation);
    });

    test('GET /ai/capsule/recap queries real SQLite user milestones and requires confirmation', async () => {
      const res = await api('/ai/capsule/recap?year=2026', {
        headers: { Authorization: `Bearer ${tokenA}` }
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      const recap = res.data.recap;
      assert.ok(recap.timeframe);
      assert.strictEqual(recap.year, 2026);
      assert.ok(typeof recap.stats.totalPosts === 'number');
      assert.ok(typeof recap.stats.totalCapsules === 'number');
      assert.ok(recap.recapContent.themeTitle);
      assert.ok(recap.recapContent.narrativeSummary);
      assert.ok(Array.isArray(recap.recapContent.milestones));
      assert.strictEqual(recap.requiresConfirmation, true); // User must review before publishing
    });
  });

  // =========================================================================
  // 5. CONTENT MODERATION & APPEALS SYSTEM
  // =========================================================================
  describe('5. Multimodal Content Moderation & Appeals System', () => {
    test('POST /ai/moderate approves constructive community content', async () => {
      const res = await api('/ai/moderate', {
        method: 'POST',
        body: JSON.stringify({
          content: 'Excited to announce our open source photography workshop this Saturday!'
        })
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.verdict.status, 'APPROVED');
      assert.strictEqual(res.data.verdict.severity, 'low');
      assert.ok(Array.isArray(res.data.verdict.categories));
      assert.ok(res.data.verdict.explanation);
    });

    test('POST /ai/moderate flags severe harassment with human explanation and appeal eligibility', async () => {
      const res = await api('/ai/moderate', {
        method: 'POST',
        body: JSON.stringify({
          content: 'You should go kill yourself you worthless coward'
        })
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.verdict.status, 'REJECTED');
      assert.strictEqual(res.data.verdict.severity, 'high');
      assert.strictEqual(res.data.verdict.appealEligible, true);
      assert.ok(res.data.verdict.explanation.length > 0);
    });

    test('POST /moderation/appeal submits appeal and GET /moderation/appeals lists user appeals', async () => {
      const appealRes = await api('/moderation/appeal', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` },
        body: JSON.stringify({
          entityType: 'post',
          entityId: samplePostId,
          reason: 'This was a misunderstanding of colloquial metaphor and does not violate guidelines.'
        })
      });

      assert.strictEqual(appealRes.status, 201);
      assert.strictEqual(appealRes.data.success, true);
      assert.ok(appealRes.data.appeal.id);
      assert.strictEqual(appealRes.data.appeal.userId, userA.id);
      assert.strictEqual(appealRes.data.appeal.status, 'pending');

      // Retrieve user's appeals
      const listRes = await api('/moderation/appeals', {
        headers: { Authorization: `Bearer ${tokenA}` }
      });

      assert.strictEqual(listRes.status, 200);
      assert.strictEqual(listRes.data.success, true);
      assert.ok(Array.isArray(listRes.data.appeals));
      const found = listRes.data.appeals.find((a: any) => a.id === appealRes.data.appeal.id);
      assert.ok(found);
      assert.strictEqual(found.entityId, samplePostId);
    });
  });

  // =========================================================================
  // 6. INTELLIGENT MOOD FEED & NEGATIVE FEEDBACK
  // =========================================================================
  describe('6. Intelligent Mood Feed & Negative Feedback', () => {
    test('POST /posts/:id/hide removes post from feed and unhide restores it', async () => {
      // 1. Initial feed contains samplePostId
      const feedBefore = await api('/posts/feed', {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      const existsInitially = feedBefore.data.posts.some((p: any) => p.id === samplePostId);
      assert.strictEqual(existsInitially, true);

      // 2. Hide post
      const hideRes = await api(`/posts/${samplePostId}/hide`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` },
        body: JSON.stringify({ reason: 'not_interested' })
      });
      assert.strictEqual(hideRes.status, 200);
      assert.strictEqual(hideRes.data.success, true);

      // 3. Post is now excluded from Account A feed
      const feedAfter = await api('/posts/feed', {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      const isExcluded = !feedAfter.data.posts.some((p: any) => p.id === samplePostId);
      assert.strictEqual(isExcluded, true);

      // 4. Other users (Account B) can still see the post
      const feedOther = await api('/posts/feed', {
        headers: { Authorization: `Bearer ${tokenB}` }
      });
      const existsForOther = feedOther.data.posts.some((p: any) => p.id === samplePostId);
      assert.strictEqual(existsForOther, true);

      // 5. Unhide post
      const unhideRes = await api(`/posts/${samplePostId}/hide`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      assert.strictEqual(unhideRes.status, 200);
      assert.strictEqual(unhideRes.data.success, true);

      // 6. Post is back in feed
      const feedRestored = await api('/posts/feed', {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      const isRestored = feedRestored.data.posts.some((p: any) => p.id === samplePostId);
      assert.strictEqual(isRestored, true);
    });

    test('Content Preferences: PUT /posts/preferences filters out excluded topics', async () => {
      // Set excluded topics
      const updateRes = await api('/posts/preferences', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${tokenA}` },
        body: JSON.stringify({
          interests: ['technology', 'art'],
          preferredMoods: ['creative', 'chill'],
          excludedTopics: ['politics', 'cryptocurrency', 'gossip']
        })
      });

      assert.strictEqual(updateRes.status, 200);
      assert.strictEqual(updateRes.data.success, true);
      assert.ok(updateRes.data.preferences.excludedTopics.includes('politics'));

      // Retrieve preferences
      const getRes = await api('/posts/preferences', {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      assert.strictEqual(getRes.status, 200);
      assert.deepStrictEqual(getRes.data.preferences.excludedTopics, ['politics', 'cryptocurrency', 'gossip']);
    });
  });

  // =========================================================================
  // 7. CREATOR AI ASSISTANT & AUDIENCE ANALYTICS
  // =========================================================================
  describe('7. Creator AI Assistant & Audience Analytics', () => {
    test('GET /ai/creator/insights computes metrics from real SQLite posts & reactions', async () => {
      const res = await api('/ai/creator/insights', {
        headers: { Authorization: `Bearer ${tokenA}` }
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      const insights = res.data.insights;
      assert.strictEqual(insights.creatorId, userA.id);
      assert.ok(Array.isArray(insights.topPerformingMoods));
      assert.ok(Array.isArray(insights.audienceTopWaveReactions));
      assert.ok(Array.isArray(insights.topHashtags));
      assert.ok(Array.isArray(insights.contentIdeas) && insights.contentIdeas.length > 0);
      assert.ok(insights.performanceSummary && insights.performanceSummary.length > 0);
    });

    test('POST /ai/creator/ideas generates tailored post concepts for a given theme', async () => {
      const res = await api('/ai/creator/ideas', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` },
        body: JSON.stringify({
          theme: 'Sustainable Living & Mindful Habits',
          mood: 'LEARNING'
        })
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.theme, 'Sustainable Living & Mindful Habits');
      assert.ok(Array.isArray(res.data.ideas) && res.data.ideas.length > 0);
    });
  });
});
