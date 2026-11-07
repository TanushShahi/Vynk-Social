import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { Conversation, Message, SharedSpaceItem, UserProfile } from '../../../shared/types.js';
import { buildUserProfile } from './userController.js';

export const messageController = {
  // Get all conversations for current user (matching Screen 9)
  getConversations: async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
      const userId = req.user.id;

      const convRows = query.all(`
        SELECT c.*, cm.last_read_at
        FROM conversations c
        JOIN conversation_members cm ON c.id = cm.conversation_id
        WHERE cm.user_id = ?
        ORDER BY c.last_message_at DESC
      `, [userId]);

      const conversations: Conversation[] = convRows.map(c => {
        // Last message
        const lastMsg = query.get(`
          SELECT m.*, u.name as sender_name
          FROM messages m
          JOIN users u ON m.sender_id = u.id
          WHERE m.conversation_id = ?
          ORDER BY m.created_at DESC LIMIT 1
        `, [c.id]);

        // Unread messages count
        const unreadCount = (query.get(`
          SELECT COUNT(*) as count
          FROM messages
          WHERE conversation_id = ? AND sender_id != ? AND created_at > ?
        `, [c.id, userId, c.last_read_at || '1970-01-01']) as any)?.count || 0;

        // Participants
        const memberRows = query.all(`
          SELECT u.*
          FROM users u
          JOIN conversation_members cm ON u.id = cm.user_id
          WHERE cm.conversation_id = ?
        `, [c.id]);

        const participants: UserProfile[] = memberRows.map(u => buildUserProfile(u, userId));

        // Shared space item count
        const sharedCount = (query.get('SELECT COUNT(*) as count FROM shared_space_items WHERE conversation_id = ?', [c.id]) as any)?.count || 0;

        let displayName = c.name;
        let displayAvatar = c.avatar_url;

        // For direct chats, show the other person's name and avatar
        if (c.type === 'direct') {
          const other = participants.find(p => p.id !== userId) || participants[0];
          if (other) {
            displayName = other.name;
            displayAvatar = other.avatarUrl;
          }
        }

        let lastMessageText = 'No messages yet';
        if (lastMsg) {
          if (c.type === 'group' && lastMsg.sender_id !== userId) {
            lastMessageText = `${lastMsg.sender_name.split(' ')[0]}: ${lastMsg.content || 'Sent media'}`;
          } else {
            lastMessageText = lastMsg.sender_id === userId ? `You: ${lastMsg.content}` : lastMsg.content;
          }
        }

        return {
          id: c.id,
          type: c.type as 'direct' | 'group',
          name: displayName,
          avatarUrl: displayAvatar,
          lastMessage: lastMessageText,
          lastMessageAt: c.last_message_at,
          unreadCount,
          participants,
          sharedSpaceItemsCount: sharedCount,
        };
      });

      return res.json({ conversations });
    } catch (err) {
      console.error('getConversations error:', err);
      return res.status(500).json({ error: 'Failed to retrieve conversations.' });
    }
  },

  // Get or Create Direct Conversation with Participant
  getOrCreateConversation: async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
      const { participantId } = req.body;
      if (!participantId) return res.status(400).json({ error: 'Participant ID is required.' });

      // Check block restrictions (AUDIT 2)
      const isBlocked = query.get(`
        SELECT id FROM blocks 
        WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)
      `, [req.user.id, participantId, participantId, req.user.id]);

      if (isBlocked) {
        return res.status(403).json({ error: 'Cannot start conversation with this user due to privacy/blocking settings.' });
      }

      // Check if a direct conversation already exists between these 2 users
      const existingConv = query.get(`
        SELECT cm1.conversation_id
        FROM conversation_members cm1
        JOIN conversation_members cm2 ON cm1.conversation_id = cm2.conversation_id
        JOIN conversations c ON c.id = cm1.conversation_id
        WHERE c.type = 'direct' AND cm1.user_id = ? AND cm2.user_id = ?
      `, [req.user.id, participantId]);

      if (existingConv) {
        return res.json({ conversation: { id: existingConv.conversation_id } });
      }

      const convId = uuidv4();
      query.transaction(() => {
        query.run(`
          INSERT INTO conversations (id, type, name, created_at, last_message_at)
          VALUES (?, 'direct', '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [convId]);

        query.run(`
          INSERT INTO conversation_members (id, conversation_id, user_id)
          VALUES (?, ?, ?), (?, ?, ?)
        `, [uuidv4(), convId, req.user!.id, uuidv4(), convId, participantId]);
      });

      return res.json({ conversation: { id: convId } });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to create or get conversation.' });
    }
  },

  // Get messages in a conversation
  getMessages: async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
      const { id: conversationId } = req.params;
      const userId = req.user.id;

      // Update user's last_read_at
      query.run(`
        UPDATE conversation_members
        SET last_read_at = CURRENT_TIMESTAMP
        WHERE conversation_id = ? AND user_id = ?
      `, [conversationId, userId]);

      const msgRows = query.all(`
        SELECT m.*, u.uid as sender_uid, u.name as sender_name, u.avatar_url as sender_avatar
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.conversation_id = ?
        ORDER BY m.created_at ASC
      `, [conversationId]);

      const messages: Message[] = msgRows.map(m => {
        // Fetch reactions
        const reactionRows = query.all(`
          SELECT mr.reaction, mr.user_id, u.name as user_name
          FROM message_reactions mr
          JOIN users u ON mr.user_id = u.id
          WHERE mr.message_id = ?
        `, [m.id]);

        return {
          id: m.id,
          conversationId: m.conversation_id,
          senderId: m.sender_id,
          sender: {
            id: m.sender_id,
            uid: m.sender_uid,
            name: m.sender_name,
            avatarUrl: m.sender_avatar,
          },
          content: m.content,
          mediaUrl: m.media_url,
          mediaType: m.media_type,
          replyToId: m.reply_to_id,
          reactions: reactionRows.map(r => ({
            reaction: r.reaction,
            userId: r.user_id,
            userName: r.user_name,
          })),
          createdAt: m.created_at,
        };
      });

      return res.json({ messages });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve messages.' });
    }
  },

  // Send a message
  sendMessage: async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
      const { id: conversationId } = req.params;
      const { content, mediaUrl, mediaType, replyToId } = req.body;

      if (!content && !mediaUrl) {
        return res.status(400).json({ error: 'Message must have content or media.' });
      }

      // Block restrictions check (BUG 4)
      const otherMembers = query.all('SELECT user_id FROM conversation_members WHERE conversation_id = ? AND user_id != ?', [conversationId, req.user.id]);
      for (const m of otherMembers) {
        const isBlocked = query.get('SELECT id FROM blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)', [
          req.user.id, m.user_id, m.user_id, req.user.id
        ]);
        if (isBlocked) {
          return res.status(403).json({ error: 'Cannot send message: interaction is restricted due to a block between participants.' });
        }
      }

      const messageId = uuidv4();

      query.run(`
        INSERT INTO messages (id, conversation_id, sender_id, content, media_url, media_type, reply_to_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [messageId, conversationId, req.user.id, content || '', mediaUrl || null, mediaType || null, replyToId || null]);

      // Update conversation's last_message_at
      query.run('UPDATE conversations SET last_message_at = CURRENT_TIMESTAMP WHERE id = ?', [conversationId]);

      // Fetch member IDs to notify
      const members = query.all('SELECT user_id FROM conversation_members WHERE conversation_id = ? AND user_id != ?', [conversationId, req.user.id]);
      for (const m of members) {
        query.run(`
          INSERT INTO notifications (id, user_id, actor_id, type, entity_id, content)
          VALUES (?, ?, ?, 'message', ?, ?)
        `, [uuidv4(), m.user_id, req.user.id, conversationId, `${req.user.name}: ${content || 'Sent media'}`]);
      }

      const senderRow = query.get('SELECT id, uid, name, avatar_url FROM users WHERE id = ?', [req.user.id]);
      const message: Message = {
        id: messageId,
        conversationId,
        senderId: req.user.id,
        sender: {
          id: senderRow.id,
          uid: senderRow.uid,
          name: senderRow.name,
          avatarUrl: senderRow.avatar_url,
        },
        content: content || '',
        mediaUrl: mediaUrl || undefined,
        mediaType: mediaType || undefined,
        replyToId: replyToId || null,
        reactions: [],
        createdAt: new Date().toISOString(),
      };

      return res.status(201).json({ message });
    } catch (err) {
      console.error('sendMessage error:', err);
      return res.status(500).json({ error: 'Failed to send message.' });
    }
  },

  // React to a message
  reactMessage: async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
      const { messageId } = req.params;
      const reaction = req.body.reaction || req.body.emoji;
      const userId = req.user.id;

      if (!reaction) {
        return res.status(400).json({ error: 'Reaction is required.' });
      }

      const existing = query.get('SELECT id FROM message_reactions WHERE message_id = ? AND user_id = ? AND reaction = ?', [messageId, userId, reaction]);
      if (existing) {
        query.run('DELETE FROM message_reactions WHERE id = ?', [existing.id]);
      } else {
        query.run('INSERT INTO message_reactions (id, message_id, user_id, reaction) VALUES (?, ?, ?, ?)', [
          uuidv4(),
          messageId,
          userId,
          reaction
        ]);
      }

      const reactions = query.all(`
        SELECT mr.reaction, mr.user_id, u.name as user_name
        FROM message_reactions mr
        JOIN users u ON mr.user_id = u.id
        WHERE mr.message_id = ?
      `, [messageId]);

      return res.json({ reactions });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to react to message.' });
    }
  },

  // Get Shared Space items for a conversation (Original Feature)
  getSharedSpace: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id: conversationId } = req.params;
      const rows = query.all(`
        SELECT s.*, u.name as creator_name
        FROM shared_space_items s
        JOIN users u ON s.creator_id = u.id
        WHERE s.conversation_id = ?
        ORDER BY s.created_at DESC
      `, [conversationId]);

      const items: SharedSpaceItem[] = rows.map(r => ({
        id: r.id,
        conversationId: r.conversation_id,
        creatorId: r.creator_id,
        creatorName: r.creator_name,
        itemType: r.item_type,
        title: r.title,
        content: r.content,
        mediaUrl: r.media_url,
        createdAt: r.created_at,
      }));

      return res.json({ items });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve shared space.' });
    }
  },

  // Add item to Shared Space
  addSharedSpaceItem: async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
      const { id: conversationId } = req.params;
      const { itemType = 'note', title, content, mediaUrl } = req.body;

      const itemId = uuidv4();
      query.run(`
        INSERT INTO shared_space_items (id, conversation_id, creator_id, item_type, title, content, media_url)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [itemId, conversationId, req.user.id, itemType, title || null, content || null, mediaUrl || null]);

      const item: SharedSpaceItem = {
        id: itemId,
        conversationId,
        creatorId: req.user.id,
        creatorName: req.user.name,
        itemType,
        title,
        content,
        mediaUrl,
        createdAt: new Date().toISOString(),
      };

      return res.status(201).json({ item });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to add shared space item.' });
    }
  }
};
