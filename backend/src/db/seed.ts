import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { query, initDatabase } from '../config/db.js';

export async function runSeed() {
  console.log('Seeding Vynk database (Phase 1 & Phase 2)...');
  initDatabase();

  // Clear existing data for fresh seed
  query.run('DELETE FROM user_achievements');
  query.run('DELETE FROM room_poll_votes');
  query.run('DELETE FROM room_messages');
  query.run('DELETE FROM room_members');
  query.run('DELETE FROM rooms');
  query.run('DELETE FROM post_collaborators');
  query.run('DELETE FROM capsule_collaborators');
  query.run('DELETE FROM capsule_items');
  query.run('DELETE FROM capsules');
  query.run('DELETE FROM notifications');
  query.run('DELETE FROM shared_space_items');
  query.run('DELETE FROM message_reactions');
  query.run('DELETE FROM messages');
  query.run('DELETE FROM conversation_members');
  query.run('DELETE FROM conversations');
  query.run('DELETE FROM story_views');
  query.run('DELETE FROM stories');
  query.run('DELETE FROM comment_likes');
  query.run('DELETE FROM comments');
  query.run('DELETE FROM reactions');
  query.run('DELETE FROM post_media');
  query.run('DELETE FROM saved_posts');
  query.run('DELETE FROM posts');
  query.run('DELETE FROM follows');
  query.run('DELETE FROM user_interests');
  query.run('DELETE FROM users');

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Seed Users (Matching the reference UI exactly)
  const usersData = [
    {
      id: 'user_tanush_01',
      uid: 'vynk.t7x4k9',
      name: 'Tanush',
      email: 'tanush@vynk.social',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
      coverUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80',
      bio: 'Tech | AI | Travel | Good Food.\nTurning moments into memories. ✨',
      isVerified: 1,
      interests: ['Tech & AI', 'Travel', 'Photography', 'Music', 'Gaming', 'Fitness', 'Movies']
    },
    {
      id: 'user_aarav_02',
      uid: 'vynk.a8k2m1',
      name: 'Aarav Sharma',
      email: 'aarav@vynk.social',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
      coverUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&auto=format&fit=crop&q=80',
      bio: 'Mountain seeker & visual artist. Chasing high peaks and dusk light. 🏔️',
      isVerified: 1,
      interests: ['Travel', 'Photography', 'Adventure']
    },
    {
      id: 'user_riya_03',
      uid: 'vynk.r3m9p2',
      name: 'Riya Mehta',
      email: 'riya@vynk.social',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80',
      coverUrl: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=1200&auto=format&fit=crop&q=80',
      bio: 'Creative designer & UI explorer. Good vibes only 🌸',
      isVerified: 1,
      interests: ['Creative', 'Design', 'Photography', 'Music']
    },
    {
      id: 'user_arjun_04',
      uid: 'vynk.a1k8z7',
      name: 'Arjun Verma',
      email: 'arjun@vynk.social',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
      coverUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&auto=format&fit=crop&q=80',
      bio: 'Full-stack builder, open-source enthusiast and AI tinkerer 🚀',
      isVerified: 0,
      interests: ['Tech & AI', 'Coding', 'Gaming']
    },
    {
      id: 'user_sneha_05',
      uid: 'vynk.s6p4n9',
      name: 'Sneha Kapoor',
      email: 'sneha@vynk.social',
      avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&auto=format&fit=crop&q=80',
      coverUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=1200&auto=format&fit=crop&q=80',
      bio: 'Fitness coach, mindful living, and daily habits for peak energy 🌿⚡',
      isVerified: 1,
      interests: ['Fitness', 'Motivated', 'Health']
    },
    {
      id: 'user_kabir_06',
      uid: 'vynk.k2b8p7',
      name: 'Kabir Singh',
      email: 'kabir@vynk.social',
      avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=300&auto=format&fit=crop&q=80',
      coverUrl: 'https://images.unsplash.com/photo-1547447134-cd3f5c716030?w=1200&auto=format&fit=crop&q=80',
      bio: 'Skater, street style & videography 🛹',
      isVerified: 0,
      interests: ['Adventure', 'Movies', 'Music']
    }
  ];

  for (const u of usersData) {
    query.run(`
      INSERT OR REPLACE INTO users (id, uid, name, email, password_hash, avatar_url, cover_url, bio, is_verified)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [u.id, u.uid, u.name, u.email, passwordHash, u.avatarUrl, u.coverUrl, u.bio, u.isVerified]);

    for (const interest of u.interests) {
      query.run('INSERT OR IGNORE INTO user_interests (id, user_id, interest) VALUES (?, ?, ?)', [
        uuidv4(),
        u.id,
        interest
      ]);
    }
  }

  // 2. Follow Connections
  const followsList = [
    ['user_tanush_01', 'user_aarav_02'],
    ['user_tanush_01', 'user_riya_03'],
    ['user_tanush_01', 'user_arjun_04'],
    ['user_aarav_02', 'user_tanush_01'],
    ['user_riya_03', 'user_tanush_01'],
    ['user_sneha_05', 'user_tanush_01'],
    ['user_kabir_06', 'user_tanush_01'],
    ['user_tanush_01', 'user_sneha_05'],
  ];

  for (const [f1, f2] of followsList) {
    query.run('INSERT OR IGNORE INTO follows (id, follower_id, following_id) VALUES (?, ?, ?)', [
      uuidv4(),
      f1,
      f2
    ]);
  }

  // 3. Seed Posts & Short Videos (Vibes)
  const postsData = [
    {
      id: 'post_mountain_01',
      authorId: 'user_aarav_02',
      caption: 'Somewhere between the clouds and peace. 🏔️',
      mood: 'travel',
      audience: 'public',
      isVideo: 0,
      tags: JSON.stringify(['#Travel', '#Mountains', '#Peace', '#Vynk']),
      media: [
        {
          url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1080&auto=format&fit=crop&q=85',
          type: 'image',
          aspectRatio: 1.25,
          altText: 'Hiker seated peacefully on high mountain peak overlooking sunset clouds'
        }
      ],
      reactions: { love: 2400, inspire: 412, wow: 180 },
      comments: [
        { authorId: 'user_tanush_01', content: 'Incredible shot! What elevation was this taken at?' },
        { authorId: 'user_riya_03', content: 'The colors in the sky are surreal 😍✨' },
        { authorId: 'user_sneha_05', content: 'Breathtaking serenity. Definitely adding this to my travel list!' }
      ]
    },
    {
      id: 'post_tech_02',
      authorId: 'user_tanush_01',
      caption: 'Turning coffee and curiosity into code. 💻⚡ Late night builds and clean architecture.',
      mood: 'tech',
      audience: 'public',
      isVideo: 0,
      tags: JSON.stringify(['#Tech', '#AI', '#Coding', '#Vynk']),
      media: [
        {
          url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1080&auto=format&fit=crop&q=85',
          type: 'image',
          aspectRatio: 1.33,
          altText: 'Futuristic glowing developer workstation and code editor'
        }
      ],
      reactions: { inspire: 340, learn: 189, love: 125, relatable: 210 },
      comments: [
        { authorId: 'user_arjun_04', content: 'Dark mode aesthetics on point! What stack are you using?' },
        { authorId: 'user_aarav_02', content: 'Love the glow vibe 🚀' }
      ]
    },
    // Screen 7: Short Video (Vynk Vibes) Skater at sunset!
    {
      id: 'post_skate_vibe_01',
      authorId: 'user_kabir_06',
      caption: 'Good vibes, better moves. ✨ #Skate #Vynk #Sunset',
      mood: 'adventure',
      audience: 'public',
      isVideo: 1,
      audioTitle: 'Original Audio - Sunset Flow',
      viewsCount: 124000,
      tags: JSON.stringify(['#Skate', '#Vynk', '#Sunset', '#Adventure']),
      media: [
        {
          url: 'https://images.unsplash.com/photo-1520045892732-304bc3ac5d8e?w=1080&auto=format&fit=crop&q=85',
          type: 'video',
          aspectRatio: 0.5625, // 9:16 vertical
          duration: 25,
          altText: 'Skateboarder doing a kickflip into the golden sunset'
        }
      ],
      reactions: { love: 12400, inspire: 320, wow: 850 },
      comments: [
        { authorId: 'user_tanush_01', content: 'That catch was buttery smooth 🛹🔥' },
        { authorId: 'user_arjun_04', content: 'Sunset lighting is insane in this clip!' }
      ]
    },
    {
      id: 'post_tech_vibe_02',
      authorId: 'user_arjun_04',
      caption: 'Building real-time WebSockets with zero lag 💻⚡ Late night lab session.',
      mood: 'tech',
      audience: 'public',
      isVideo: 1,
      audioTitle: 'Synthwave Dreams 🌌',
      viewsCount: 88500,
      tags: JSON.stringify(['#Tech', '#Code', '#Builder', '#Vynk']),
      media: [
        {
          url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1080&auto=format&fit=crop&q=85',
          type: 'video',
          aspectRatio: 0.5625,
          duration: 18,
          altText: 'Fast motion terminal and code architecture demo'
        }
      ],
      reactions: { inspire: 940, learn: 620, wow: 410 },
      comments: [
        { authorId: 'user_tanush_01', content: 'Clean architecture! Loving the stack.' }
      ]
    },
    {
      id: 'post_fitness_04',
      authorId: 'user_sneha_05',
      caption: 'Small steps every single day lead to massive leaps. ⚡ Morning mobility & 5k run complete!',
      mood: 'motivated',
      audience: 'public',
      isVideo: 0,
      tags: JSON.stringify(['#Motivated', '#Fitness', '#Discipline', '#Vynk']),
      media: [
        {
          url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=1080&auto=format&fit=crop&q=85',
          type: 'image',
          aspectRatio: 1.25,
          altText: 'Morning sunrise athlete stretching outdoor'
        }
      ],
      reactions: { inspire: 680, love: 290, wow: 150 },
      comments: [
        { authorId: 'user_riya_03', content: 'Inspiring as always Sneha! Need this energy today 💪' }
      ]
    },
    {
      id: 'post_collab_goa_01',
      authorId: 'user_tanush_01',
      caption: 'GOA 2026 🌴🌊 5 days, 4 friends, endless memories. Sunset beach sessions and late night conversations.',
      mood: 'travel',
      audience: 'public',
      isVideo: 0,
      isCollab: 1,
      collabTitle: 'GOA 2026',
      collaborators: ['user_aarav_02', 'user_riya_03', 'user_kabir_06'],
      tags: JSON.stringify(['#Goa2026', '#Travel', '#Friendship', '#Vynk', '#Memories']),
      media: [
        {
          url: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=1080&auto=format&fit=crop&q=85',
          type: 'image',
          aspectRatio: 1.33,
          altText: 'Goa beach sunset with palm trees and group of friends'
        },
        {
          url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1080&auto=format&fit=crop&q=85',
          type: 'image',
          aspectRatio: 1.33,
          altText: 'Vibrant tropical coast of Goa'
        }
      ],
      reactions: { love: 1840, inspire: 620, wow: 410, relatable: 350 },
      comments: [
        { authorId: 'user_aarav_02', content: 'Best trip ever! We need to make this an annual reunion.' },
        { authorId: 'user_riya_03', content: 'The photos turned out unbelievable! So glad we made this shared moment 💖' },
        { authorId: 'user_kabir_06', content: 'Still dreaming about that beach shack fish curry 🍛' }
      ]
    },
    {
      id: 'post_design_05',
      authorId: 'user_riya_03',
      caption: 'Experiments in glassmorphic lighting and pastel palettes. 🎨 What do you think of this balance?',
      mood: 'creative',
      audience: 'public',
      isVideo: 0,
      tags: JSON.stringify(['#Creative', '#Design', '#Vynk', '#Art']),
      media: [
        {
          url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1080&auto=format&fit=crop&q=85',
          type: 'image',
          aspectRatio: 1.33,
          altText: 'Abstract fluid gradient art in violet, magenta and cyan'
        }
      ],
      reactions: { love: 890, inspire: 430, wow: 310 },
      comments: [
        { authorId: 'user_tanush_01', content: 'The depth and lighting gradients are top-notch!' }
      ]
    }
  ];

  for (const p of postsData) {
    query.run(`
      INSERT INTO posts (id, author_id, caption, mood, audience, tags, is_video, audio_title, views_count, is_collab, collab_title)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      p.id,
      p.authorId,
      p.caption,
      p.mood,
      p.audience,
      p.tags,
      p.isVideo || 0,
      p.audioTitle || 'Original Audio',
      p.viewsCount || 0,
      p.isCollab || 0,
      p.collabTitle || null
    ]);

    // Insert collaborators if any
    if (p.collaborators && Array.isArray(p.collaborators)) {
      for (const collabId of p.collaborators) {
        query.run(`
          INSERT OR IGNORE INTO post_collaborators (id, post_id, user_id, role)
          VALUES (?, ?, ?, 'co-author')
        `, [uuidv4(), p.id, collabId]);
      }
    }

    for (let i = 0; i < p.media.length; i++) {
      const m = p.media[i];
      query.run(`
        INSERT INTO post_media (id, post_id, media_url, media_type, aspect_ratio, alt_text, order_index)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [uuidv4(), p.id, m.url, m.type, m.aspectRatio, m.altText, i]);
    }

    for (const [reactionType, count] of Object.entries(p.reactions)) {
      for (let k = 0; k < Math.min(count, 5); k++) {
        const dummyUser = usersData[k % usersData.length].id;
        try {
          query.run('INSERT INTO reactions (id, post_id, user_id, reaction_type) VALUES (?, ?, ?, ?)', [
            uuidv4(),
            p.id,
            dummyUser,
            reactionType
          ]);
        } catch {}
      }
    }

    for (const c of p.comments) {
      query.run('INSERT INTO comments (id, post_id, author_id, content) VALUES (?, ?, ?, ?)', [
        uuidv4(),
        p.id,
        c.authorId,
        c.content
      ]);
    }
  }

  // 4. Seed Stories with Story Threads
  const storyParentId = 'story_riya_parent_01';
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  // Root Story (Matches Screen 8)
  query.run(`
    INSERT INTO stories (id, author_id, media_url, media_type, caption, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [
    storyParentId,
    'user_riya_03',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
    'image',
    'Good Vibes Only ✨',
    expiresAt
  ]);

  // Story Thread Reply 1 (Sneha adds her moment to Riya's story!)
  query.run(`
    INSERT INTO stories (id, author_id, media_url, media_type, caption, parent_story_id, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    'story_sneha_thread_02',
    'user_sneha_05',
    'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&auto=format&fit=crop&q=80',
    'image',
    'Hiking the sunrise trail right now 🌿',
    storyParentId,
    expiresAt
  ]);

  // Story Thread Reply 2 (Arjun adds to the story chain!)
  query.run(`
    INSERT INTO stories (id, author_id, media_url, media_type, caption, parent_story_id, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    'story_arjun_thread_03',
    'user_arjun_04',
    'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=80',
    'image',
    'Fueling the build with fresh roast ☕',
    storyParentId,
    expiresAt
  ]);

  // Kabir's story
  query.run(`
    INSERT INTO stories (id, author_id, media_url, media_type, caption, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [
    uuidv4(),
    'user_kabir_06',
    'https://images.unsplash.com/photo-1520045892732-304bc3ac5d8e?w=800&auto=format&fit=crop&q=80',
    'image',
    'Golden hour street cruise 🛹',
    expiresAt
  ]);

  // 5. Seed Conversations & Messages (Matching Screen 9 exactly!)
  // Conv 1: Riya Mehta (Direct)
  const conv1Id = 'conv_riya_direct';
  query.run(`INSERT INTO conversations (id, type, name, last_message_at) VALUES (?, 'direct', 'Riya Mehta', CURRENT_TIMESTAMP)`, [conv1Id]);
  query.run(`INSERT INTO conversation_members (id, conversation_id, user_id, last_read_at) VALUES (?, ?, 'user_tanush_01', datetime('now', '-10 minutes'))`, [uuidv4(), conv1Id]);
  query.run(`INSERT INTO conversation_members (id, conversation_id, user_id) VALUES (?, ?, 'user_riya_03')`, [uuidv4(), conv1Id]);

  query.run(`
    INSERT INTO messages (id, conversation_id, sender_id, content, created_at)
    VALUES (?, ?, 'user_riya_03', 'Hey Tanush! Are we still on for tomorrow?', datetime('now', '-5 minutes'))
  `, [uuidv4(), conv1Id]);

  query.run(`
    INSERT INTO messages (id, conversation_id, sender_id, content, created_at)
    VALUES (?, ?, 'user_riya_03', 'Wanted to show you the new design components!', datetime('now', '-4 minutes'))
  `, [uuidv4(), conv1Id]);

  // Conv 2: Arjun Verma (Direct)
  const conv2Id = 'conv_arjun_direct';
  query.run(`INSERT INTO conversations (id, type, name, last_message_at) VALUES (?, 'direct', 'Arjun Verma', datetime('now', '-12 minutes'))`, [conv2Id]);
  query.run(`INSERT INTO conversation_members (id, conversation_id, user_id) VALUES (?, ?, 'user_tanush_01')`, [uuidv4(), conv2Id]);
  query.run(`INSERT INTO conversation_members (id, conversation_id, user_id) VALUES (?, ?, 'user_arjun_04')`, [uuidv4(), conv2Id]);

  query.run(`
    INSERT INTO messages (id, conversation_id, sender_id, content, media_url, media_type, created_at)
    VALUES (?, ?, 'user_arjun_04', 'Check out the new benchmark results 🚀', 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600', 'image', datetime('now', '-12 minutes'))
  `, [uuidv4(), conv2Id]);

  // Conv 3: College Squad (Group)
  const conv3Id = 'conv_college_group';
  query.run(`INSERT INTO conversations (id, type, name, last_message_at) VALUES (?, 'group', 'College Squad', datetime('now', '-1 hour'))`, [conv3Id]);
  query.run(`INSERT INTO conversation_members (id, conversation_id, user_id) VALUES (?, ?, 'user_tanush_01')`, [uuidv4(), conv3Id]);
  query.run(`INSERT INTO conversation_members (id, conversation_id, user_id) VALUES (?, ?, 'user_kabir_06')`, [uuidv4(), conv3Id]);
  query.run(`INSERT INTO conversation_members (id, conversation_id, user_id) VALUES (?, ?, 'user_aarav_02')`, [uuidv4(), conv3Id]);

  query.run(`
    INSERT INTO messages (id, conversation_id, sender_id, content, created_at)
    VALUES (?, ?, 'user_kabir_06', 'This looks amazing! Who is bringing the camera?', datetime('now', '-1 hour'))
  `, [uuidv4(), conv3Id]);

  // Conv 4: Travel Buddies (Group)
  const conv4Id = 'conv_travel_group';
  query.run(`INSERT INTO conversations (id, type, name, last_message_at) VALUES (?, 'group', 'Travel Buddies', datetime('now', '-2 hours'))`, [conv4Id]);
  query.run(`INSERT INTO conversation_members (id, conversation_id, user_id) VALUES (?, ?, 'user_tanush_01')`, [uuidv4(), conv4Id]);
  query.run(`INSERT INTO conversation_members (id, conversation_id, user_id) VALUES (?, ?, 'user_sneha_05')`, [uuidv4(), conv4Id]);

  query.run(`
    INSERT INTO messages (id, conversation_id, sender_id, content, created_at)
    VALUES (?, ?, 'user_sneha_05', 'Next trip destination finalized? ✈️', datetime('now', '-2 hours'))
  `, [uuidv4(), conv4Id]);

  // Conv 5: Tech Talks (Group)
  const conv5Id = 'conv_tech_group';
  query.run(`INSERT INTO conversations (id, type, name, last_message_at) VALUES (?, 'group', 'Tech Talks', datetime('now', '-4 hours'))`, [conv5Id]);
  query.run(`INSERT INTO conversation_members (id, conversation_id, user_id) VALUES (?, ?, 'user_tanush_01')`, [uuidv4(), conv5Id]);
  query.run(`INSERT INTO conversation_members (id, conversation_id, user_id) VALUES (?, ?, 'user_arjun_04')`, [uuidv4(), conv5Id]);

  query.run(`
    INSERT INTO messages (id, conversation_id, sender_id, content, created_at)
    VALUES (?, ?, 'user_tanush_01', 'This is super useful! Thanks for the tip.', datetime('now', '-4 hours'))
  `, [uuidv4(), conv5Id]);

  // 6. Seed Shared Space Items for Conversations
  query.run(`
    INSERT INTO shared_space_items (id, conversation_id, creator_id, item_type, title, content, media_url)
    VALUES (?, ?, 'user_riya_03', 'photo', 'Design Moodboard 2026', 'Color balance inspiration', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800')
  `, [uuidv4(), conv1Id]);

  query.run(`
    INSERT INTO shared_space_items (id, conversation_id, creator_id, item_type, title, content)
    VALUES (?, ?, 'user_tanush_01', 'note', 'Meeting Agenda', '1. Discuss new UID QR card style\n2. Finalize Wave reactions layout')
  `, [uuidv4(), conv1Id]);

  query.run(`
    INSERT INTO shared_space_items (id, conversation_id, creator_id, item_type, title, content, media_url)
    VALUES (?, ?, 'user_sneha_05', 'memory', 'Goa Trip Sunrise', 'Beach hike memories 🌅', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800')
  `, [uuidv4(), conv4Id]);

  // 7. Seed Notifications
  const notifications = [
    {
      actorId: 'user_aarav_02',
      type: 'reaction',
      content: 'Aarav Sharma felt inspired ✦ by your moment'
    },
    {
      actorId: 'user_riya_03',
      type: 'comment',
      content: 'Riya Mehta commented: "The colors in the sky are surreal 😍✨"'
    },
    {
      actorId: 'user_sneha_05',
      type: 'story_thread',
      content: 'Sneha Kapoor added a new moment to your Story Thread!'
    },
    {
      actorId: 'user_kabir_06',
      type: 'follow',
      content: 'Kabir Singh started following your moments'
    }
  ];

  for (const n of notifications) {
    query.run(`
      INSERT INTO notifications (id, user_id, actor_id, type, content)
      VALUES (?, 'user_tanush_01', ?, ?, ?)
    `, [uuidv4(), n.actorId, n.type, n.content]);
  }

  // =========================================================================
  // 8. Seed Phase 3: Moment Capsules & Timeline Items
  // =========================================================================
  const cap1Id = 'capsule_goa_01';
  query.run(`
    INSERT INTO capsules (
      id, user_id, title, description, cover_url, category, privacy, music_title, location_name, start_date, end_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    cap1Id,
    'user_tanush_01',
    'Goa Trip 2026',
    '5 days of sun, salty air, scooter adventures and laughter with the crew.',
    'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=1000&auto=format&fit=crop&q=85',
    'Travel',
    'public',
    'Tropical Sunset Chill 🌴',
    'Vagator & Anjuna, Goa',
    '2026-02-14',
    '2026-02-19'
  ]);

  // Collaborators on Goa Trip
  query.run(`INSERT INTO capsule_collaborators (id, capsule_id, user_id, role) VALUES (?, ?, ?, 'collaborator')`, [uuidv4(), cap1Id, 'user_aarav_02']);
  query.run(`INSERT INTO capsule_collaborators (id, capsule_id, user_id, role) VALUES (?, ?, ?, 'collaborator')`, [uuidv4(), cap1Id, 'user_riya_03']);
  query.run(`INSERT INTO capsule_collaborators (id, capsule_id, user_id, role) VALUES (?, ?, ?, 'collaborator')`, [uuidv4(), cap1Id, 'user_kabir_06']);

  // Timeline Items for Goa Capsule
  const cap1Items = [
    {
      type: 'photo',
      url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
      caption: 'Day 1: Arrived right in time for the golden hour over Anjuna beach 🌊',
      location: 'Anjuna Beach',
      date: '2026-02-14T17:45:00Z',
    },
    {
      type: 'video',
      url: 'https://images.unsplash.com/photo-1520045892732-304bc3ac5d8e?w=800',
      caption: 'Day 2: Renting retro scooters and cruising through old Latin Quarter lanes 🛵',
      location: 'Fontainhas, Panjim',
      date: '2026-02-15T11:20:00Z',
    },
    {
      type: 'note',
      url: null,
      caption: 'Cafe Note: Best iced matcha and sourdough avocado toast at Artjuna Garden Cafe. We spent 3 hours here talking about startup dreams! ☕🌿',
      location: 'Artjuna Cafe',
      date: '2026-02-16T13:00:00Z',
    },
    {
      type: 'photo',
      url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800',
      caption: 'Day 4: Secret cliff trail overlooking the Arabian Sea at sunset. Unforgettable vibes.',
      location: 'Vagator Cliffs',
      date: '2026-02-18T18:15:00Z',
    }
  ];

  for (let i = 0; i < cap1Items.length; i++) {
    const it = cap1Items[i];
    query.run(`
      INSERT INTO capsule_items (
        id, capsule_id, user_id, item_type, media_url, caption, location_name, date_moment, order_index
      ) VALUES (?, ?, 'user_tanush_01', ?, ?, ?, ?, ?, ?)
    `, [uuidv4(), cap1Id, it.type, it.url, it.caption, it.location, it.date, i]);
  }

  // Capsule 2: College First Year
  const cap2Id = 'capsule_college_02';
  query.run(`
    INSERT INTO capsules (
      id, user_id, title, description, cover_url, category, privacy, location_name, start_date, end_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    cap2Id,
    'user_tanush_01',
    'College First Year',
    'Hostel late nights, our first hackathons, and friendships for life.',
    'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1000&auto=format&fit=crop&q=85',
    'College',
    'public',
    'Campus Quad',
    '2025-08-01',
    '2026-05-20'
  ]);

  query.run(`INSERT INTO capsule_collaborators (id, capsule_id, user_id, role) VALUES (?, ?, ?, 'collaborator')`, [uuidv4(), cap2Id, 'user_arjun_04']);

  const cap2Items = [
    {
      type: 'photo',
      url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800',
      caption: 'Orientation Day: Total strangers who had no idea we would become best friends 🎓',
      location: 'Main Auditorium',
      date: '2025-08-05T10:00:00Z',
    },
    {
      type: 'photo',
      url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800',
      caption: 'Hackathon Weekend: 36 hours of nonstop code and energy drinks 💻⚡',
      location: 'CS Lab 3',
      date: '2025-11-12T03:15:00Z',
    }
  ];

  for (let i = 0; i < cap2Items.length; i++) {
    const it = cap2Items[i];
    query.run(`
      INSERT INTO capsule_items (
        id, capsule_id, user_id, item_type, media_url, caption, location_name, date_moment, order_index
      ) VALUES (?, ?, 'user_tanush_01', ?, ?, ?, ?, ?, ?)
    `, [uuidv4(), cap2Id, it.type, it.url, it.caption, it.location, it.date, i]);
  }

  // Capsule 3: Best Memories 2026
  const cap3Id = 'capsule_memories_03';
  query.run(`
    INSERT INTO capsules (
      id, user_id, title, description, cover_url, category, privacy, music_title, location_name
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    cap3Id,
    'user_tanush_01',
    'Best Memories 2026',
    'A living permanent capsule capturing peaks, creative breakthroughs and peaceful sunsets.',
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1000&auto=format&fit=crop&q=85',
    'Memories',
    'public',
    'Dusk Radiance ✨',
    'Everywhere'
  ]);

  query.run(`
    INSERT INTO capsule_items (
      id, capsule_id, user_id, item_type, media_url, caption, location_name, date_moment, order_index
    ) VALUES (?, ?, 'user_tanush_01', 'photo', 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800', 'Climbing above the mist at 6:30 AM', 'Western Ghats', '2026-03-01T06:30:00Z', 0)
  `, [uuidv4(), cap3Id]);

  // =========================================================================
  // 9. Seed Phase 3: Social Rooms & Discussions with Polls
  // =========================================================================
  // Room 1: AI & Technology
  const r1Id = 'room_ai_tech_01';
  query.run(`
    INSERT INTO rooms (id, creator_id, name, description, topic, avatar_url, banner_url, is_permanent, members_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1420)
  `, [
    r1Id,
    'user_aarav_02',
    'AI & Technology',
    'Exploring local language models, autonomous agents, neural architectures and the future of creative computing.',
    'AI & Technology',
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200',
    'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200'
  ]);

  // Add members
  query.run(`INSERT INTO room_members (id, room_id, user_id, role) VALUES (?, ?, 'user_tanush_01', 'member')`, [uuidv4(), r1Id]);
  query.run(`INSERT INTO room_members (id, room_id, user_id, role) VALUES (?, ?, 'user_arjun_04', 'moderator')`, [uuidv4(), r1Id]);
  query.run(`INSERT INTO room_members (id, room_id, user_id, role) VALUES (?, ?, 'user_aarav_02', 'creator')`, [uuidv4(), r1Id]);

  // Room 1 Messages: Discussion & Interactive Poll
  query.run(`
    INSERT INTO room_messages (id, room_id, sender_id, content, created_at)
    VALUES (?, ?, 'user_aarav_02', 'Welcome everyone! What is everyone building this week? Any interesting edge AI setups?', datetime('now', '-2 hours'))
  `, [uuidv4(), r1Id]);

  query.run(`
    INSERT INTO room_messages (id, room_id, sender_id, content, created_at)
    VALUES (?, ?, 'user_tanush_01', 'Working on real-time offline recommendations using client-side embeddings. Zero latency and total privacy!', datetime('now', '-1 hour'))
  `, [uuidv4(), r1Id]);

  // Poll Message in Room 1
  const pollMsgId = 'poll_msg_01';
  const pollJson = JSON.stringify({
    question: 'Which paradigm will drive the biggest breakthrough in 2026-2027?',
    options: [
      { text: 'Local Small Language Models (SLMs)', count: 48 },
      { text: 'Autonomous Multi-Agent Teams', count: 72 },
      { text: 'Neuro-Symbolic Reasoning', count: 31 },
      { text: 'On-Device Neuromorphic Chips', count: 25 }
    ]
  });

  query.run(`
    INSERT INTO room_messages (id, room_id, sender_id, content, media_type, poll_data, created_at)
    VALUES (?, ?, 'user_arjun_04', 'Quick community poll:', 'poll', ?, datetime('now', '-30 minutes'))
  `, [pollMsgId, r1Id, pollJson]);

  // Seed sample votes
  query.run(`INSERT INTO room_poll_votes (id, message_id, user_id, option_index) VALUES (?, ?, 'user_tanush_01', 1)`, [uuidv4(), pollMsgId]);
  query.run(`INSERT INTO room_poll_votes (id, message_id, user_id, option_index) VALUES (?, ?, 'user_aarav_02', 0)`, [uuidv4(), pollMsgId]);
  query.run(`INSERT INTO room_poll_votes (id, message_id, user_id, option_index) VALUES (?, ?, 'user_riya_03', 1)`, [uuidv4(), pollMsgId]);

  // Room 2: Gaming Zone
  const r2Id = 'room_gaming_02';
  query.run(`
    INSERT INTO rooms (id, creator_id, name, description, topic, avatar_url, banner_url, is_permanent, members_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, 890)
  `, [
    r2Id,
    'user_kabir_06',
    'Gaming & Esports Hub',
    'Setup showcases, clip highlights, indie game hidden gems, and weekend matchmaking.',
    'Gaming',
    'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200',
    'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1200'
  ]);
  query.run(`INSERT INTO room_members (id, room_id, user_id) VALUES (?, ?, 'user_tanush_01')`, [uuidv4(), r2Id]);

  // Room 3: Photography & Visuals
  const r3Id = 'room_photo_03';
  query.run(`
    INSERT INTO rooms (id, creator_id, name, description, topic, avatar_url, banner_url, is_permanent, members_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, 650)
  `, [
    r3Id,
    'user_riya_03',
    'Photography & Visual Art',
    'Golden hour framing, street candids, color theory, analog film aesthetics and lens discussions.',
    'Photography',
    'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=200',
    'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=1200'
  ]);
  query.run(`INSERT INTO room_members (id, room_id, user_id) VALUES (?, ?, 'user_tanush_01')`, [uuidv4(), r3Id]);

  // Room 4: College Life & Tech
  const r4Id = 'room_college_04';
  query.run(`
    INSERT INTO rooms (id, creator_id, name, description, topic, avatar_url, banner_url, is_permanent, members_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1120)
  `, [
    r4Id,
    'user_arjun_04',
    'College Life & Campus Tech',
    'Internship advice, hackathon roadmaps, dorm life hacks and exam prep support.',
    'College Life',
    'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=200',
    'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1200'
  ]);

  // Room 5: Travel & Nomads
  const r5Id = 'room_travel_05';
  query.run(`
    INSERT INTO rooms (id, creator_id, name, description, topic, avatar_url, banner_url, is_permanent, members_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, 980)
  `, [
    r5Id,
    'user_aarav_02',
    'Travel & Nomads',
    'Backpacking itineraries, mountain trails, hidden waterfalls, and budget travel hacks.',
    'Travel',
    'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=200',
    'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200'
  ]);

  // =========================================================================
  // 10. Seed Phase 3: User Achievements & Badges
  // =========================================================================
  const achievements = [
    {
      id: uuidv4(),
      userId: 'user_tanush_01',
      badgeId: 'community_builder',
      title: 'Community Builder',
      description: 'Active participant in topic rooms & shared spaces',
      icon: '🏛️'
    },
    {
      id: uuidv4(),
      userId: 'user_tanush_01',
      badgeId: 'explorer',
      title: 'Mindful Explorer',
      description: 'Discovered moments across 4+ different moods',
      icon: '🧭'
    },
    {
      id: uuidv4(),
      userId: 'user_tanush_01',
      badgeId: 'helpful_creator',
      title: 'Inspiring Creator',
      description: 'Generated 100+ inspired waves ✦ from the community',
      icon: '✨'
    },
    {
      id: uuidv4(),
      userId: 'user_tanush_01',
      badgeId: 'early_creator',
      title: 'Founding Member',
      description: 'Early adopter of Vynk social platform',
      icon: '💎'
    }
  ];

  for (const ach of achievements) {
    query.run(`
      INSERT OR IGNORE INTO user_achievements (id, user_id, badge_id, title, description, icon)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [ach.id, ach.userId, ach.badgeId, ach.title, ach.description, ach.icon]);
  }

  console.log('Database seeded successfully with Phase 1, Phase 2 & Phase 3 data!');
}

if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  runSeed().catch(console.error);
}
