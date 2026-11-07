import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { SocialRoom, RoomMessage, PollData, PollOption } from '../../../shared/types.js';

export const roomController = {
  // Get all rooms (with optional filter by topic)
  getRooms: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const topic = req.query.topic as string | undefined;
      const currentUserId = req.user?.id;

      let sql = `
        SELECT r.*, u.uid as creator_uid, u.name as creator_name, u.avatar_url as creator_avatar
        FROM rooms r
        JOIN users u ON r.creator_id = u.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (topic && topic !== 'All') {
        sql += ' AND LOWER(r.topic) = LOWER(?)';
        params.push(topic);
      }

      sql += ' ORDER BY r.members_count DESC, r.created_at DESC';

      const rows = query.all(sql, params);

      const rooms: SocialRoom[] = rows.map(r => {
        let isMember = false;
        if (currentUserId) {
          isMember = !!query.get('SELECT id FROM room_members WHERE room_id = ? AND user_id = ?', [r.id, currentUserId]);
        }

        const lastMsg = query.get('SELECT content FROM room_messages WHERE room_id = ? ORDER BY created_at DESC LIMIT 1', [r.id]);

        return {
          id: r.id,
          creatorId: r.creator_id,
          creator: {
            id: r.creator_id,
            uid: r.creator_uid,
            name: r.creator_name,
            avatarUrl: r.creator_avatar,
          },
          name: r.name,
          description: r.description || '',
          topic: r.topic,
          avatarUrl: r.avatar_url,
          bannerUrl: r.banner_url,
          isPermanent: !!r.is_permanent,
          expiresAt: r.expires_at,
          membersCount: r.members_count,
          isMember,
          latestMessage: lastMsg?.content || 'No discussions yet',
          createdAt: r.created_at,
        };
      });

      return res.json({ rooms });
    } catch (err) {
      console.error('getRooms error:', err);
      return res.status(500).json({ error: 'Failed to retrieve social rooms.' });
    }
  },

  // Get single room details
  getRoomById: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const currentUserId = req.user?.id;

      const row = query.get(`
        SELECT r.*, u.uid as creator_uid, u.name as creator_name, u.avatar_url as creator_avatar
        FROM rooms r
        JOIN users u ON r.creator_id = u.id
        WHERE r.id = ?
      `, [id]);

      if (!row) {
        return res.status(404).json({ error: 'Room not found.' });
      }

      let isMember = false;
      if (currentUserId) {
        isMember = !!query.get('SELECT id FROM room_members WHERE room_id = ? AND user_id = ?', [row.id, currentUserId]);
      }

      const room: SocialRoom = {
        id: row.id,
        creatorId: row.creator_id,
        creator: {
          id: row.creator_id,
          uid: row.creator_uid,
          name: row.creator_name,
          avatarUrl: row.creator_avatar,
        },
        name: row.name,
        description: row.description || '',
        topic: row.topic,
        avatarUrl: row.avatar_url,
        bannerUrl: row.banner_url,
        isPermanent: !!row.is_permanent,
        expiresAt: row.expires_at,
        membersCount: row.members_count,
        isMember,
        createdAt: row.created_at,
      };

      return res.json({ room });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve room.' });
    }
  },

  // Create new Social Room
  createRoom: async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });

      const {
        name,
        description,
        topic = 'AI & Technology',
        avatarUrl,
        bannerUrl,
        isPermanent = true
      } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Room name is required.' });
      }

      const roomId = uuidv4();

      query.transaction(() => {
        query.run(`
          INSERT INTO rooms (id, creator_id, name, description, topic, avatar_url, banner_url, is_permanent, members_count)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
        `, [
          roomId,
          req.user!.id,
          name.trim(),
          description || '',
          topic,
          avatarUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200',
          bannerUrl || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200',
          isPermanent ? 1 : 0
        ]);

        // Add creator as member
        query.run(`
          INSERT INTO room_members (id, room_id, user_id, role)
          VALUES (?, ?, ?, 'creator')
        `, [uuidv4(), roomId, req.user!.id]);
      });

      const row = query.get(`
        SELECT r.*, u.uid as creator_uid, u.name as creator_name, u.avatar_url as creator_avatar
        FROM rooms r
        JOIN users u ON r.creator_id = u.id
        WHERE r.id = ?
      `, [roomId]);

      const room: SocialRoom = {
        id: row.id,
        creatorId: row.creator_id,
        creator: {
          id: row.creator_id,
          uid: row.creator_uid,
          name: row.creator_name,
          avatarUrl: row.creator_avatar,
        },
        name: row.name,
        description: row.description,
        topic: row.topic,
        avatarUrl: row.avatar_url,
        bannerUrl: row.banner_url,
        isPermanent: !!row.is_permanent,
        membersCount: 1,
        isMember: true,
        createdAt: row.created_at,
      };

      return res.status(201).json({ message: 'Social Room created!', room });
    } catch (err) {
      console.error('createRoom error:', err);
      return res.status(500).json({ error: 'Failed to create room.' });
    }
  },

  // Join or Leave Room
  toggleMembership: async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
      const { id: roomId } = req.params;
      const userId = req.user.id;

      const room = query.get('SELECT id, creator_id, name FROM rooms WHERE id = ?', [roomId]);
      if (!room) return res.status(404).json({ error: 'Room not found.' });

      const existing = query.get('SELECT id FROM room_members WHERE room_id = ? AND user_id = ?', [roomId, userId]);
      let isMember = false;

      if (existing) {
        // Leave room
        query.run('DELETE FROM room_members WHERE id = ?', [existing.id]);
        query.run('UPDATE rooms SET members_count = MAX(1, members_count - 1) WHERE id = ?', [roomId]);
        isMember = false;
      } else {
        // Check block restrictions with room creator (AUDIT 2)
        if (room.creator_id !== userId) {
          const isBlocked = query.get(`
            SELECT id FROM blocks 
            WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)
          `, [userId, room.creator_id, room.creator_id, userId]);
          if (isBlocked) {
            return res.status(403).json({ error: 'Cannot join room due to privacy/blocking settings.' });
          }
        }

        // Join room
        query.transaction(() => {
          query.run('INSERT INTO room_members (id, room_id, user_id, role) VALUES (?, ?, ?, ?)', [
            uuidv4(),
            roomId,
            userId,
            'member'
          ]);
          query.run('UPDATE rooms SET members_count = members_count + 1 WHERE id = ?', [roomId]);

          // Emit notification to room creator if not self
          if (room.creator_id !== userId) {
            query.run(`
              INSERT INTO notifications (id, user_id, actor_id, type, entity_id, content)
              VALUES (?, ?, ?, 'room_invite', ?, ?)
            `, [
              uuidv4(),
              room.creator_id,
              userId,
              roomId,
              `@${req.user!.uid || 'Someone'} joined your Social Room "${room.name}".`
            ]);
          }
        });
        isMember = true;
      }

      const updatedCount = (query.get('SELECT members_count FROM rooms WHERE id = ?', [roomId]) as any)?.members_count || 1;

      return res.json({ isMember, membersCount: updatedCount });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to update membership.' });
    }
  },

  // Get Room Messages (Discussions & Polls)
  getMessages: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id: roomId } = req.params;
      const currentUserId = req.user?.id;

      const rows = query.all(`
        SELECT rm.*, u.uid as sender_uid, u.name as sender_name, u.avatar_url as sender_avatar
        FROM room_messages rm
        JOIN users u ON rm.sender_id = u.id
        WHERE rm.room_id = ?
        ORDER BY rm.created_at ASC
      `, [roomId]);

      const messages: RoomMessage[] = rows.map(r => {
        let pollData: PollData | undefined;
        if (r.poll_data) {
          try {
            const parsed = JSON.parse(r.poll_data);
            // Count live votes
            const votes = query.all('SELECT option_index, COUNT(*) as count FROM room_poll_votes WHERE message_id = ? GROUP BY option_index', [r.id]);
            const voteMap: Record<number, number> = {};
            let total = 0;
            votes.forEach((v: any) => {
              voteMap[v.option_index] = v.count;
              total += v.count;
            });

            let userVote: number | null = null;
            if (currentUserId) {
              const myVote = query.get('SELECT option_index FROM room_poll_votes WHERE message_id = ? AND user_id = ?', [r.id, currentUserId]);
              if (myVote) userVote = myVote.option_index;
            }

            const options: PollOption[] = parsed.options.map((opt: any, idx: number) => ({
              text: typeof opt === 'string' ? opt : opt.text,
              votes: voteMap[idx] || 0
            }));

            pollData = {
              question: parsed.question,
              options,
              totalVotes: total,
              userVote
            };
          } catch {}
        }

        return {
          id: r.id,
          roomId: r.room_id,
          senderId: r.sender_id,
          sender: {
            id: r.sender_id,
            uid: r.sender_uid,
            name: r.sender_name,
            avatarUrl: r.sender_avatar,
          },
          content: r.content,
          mediaUrl: r.media_url,
          mediaType: r.media_type,
          pollData,
          createdAt: r.created_at,
        };
      });

      return res.json({ messages });
    } catch (err) {
      console.error('getMessages error:', err);
      return res.status(500).json({ error: 'Failed to retrieve room messages.' });
    }
  },

  // Send message or post a poll to room
  sendMessage: async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
      const { id: roomId } = req.params;
      const { content, mediaUrl, mediaType = 'text', pollData } = req.body;

      if (!content && !pollData) {
        return res.status(400).json({ error: 'Message content or poll is required.' });
      }

      const room = query.get('SELECT id, creator_id FROM rooms WHERE id = ?', [roomId]);
      if (!room) return res.status(404).json({ error: 'Room not found.' });

      if (room.creator_id !== req.user.id) {
        const isBlocked = query.get(`
          SELECT id FROM blocks 
          WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)
        `, [req.user.id, room.creator_id, room.creator_id, req.user.id]);
        if (isBlocked) {
          return res.status(403).json({ error: 'Cannot post message in this room due to privacy/blocking settings.' });
        }
      }

      const messageId = uuidv4();
      const pollJson = pollData ? JSON.stringify(pollData) : null;

      query.run(`
        INSERT INTO room_messages (id, room_id, sender_id, content, media_url, media_type, poll_data)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        messageId,
        roomId,
        req.user.id,
        content || (pollData ? pollData.question : ''),
        mediaUrl || null,
        pollData ? 'poll' : mediaType,
        pollJson
      ]);

      const senderRow = query.get('SELECT id, uid, name, avatar_url FROM users WHERE id = ?', [req.user.id]);
      const message: RoomMessage = {
        id: messageId,
        roomId,
        senderId: req.user.id,
        sender: {
          id: senderRow.id,
          uid: senderRow.uid,
          name: senderRow.name,
          avatarUrl: senderRow.avatar_url,
        },
        content: content || (pollData ? pollData.question : ''),
        mediaUrl,
        mediaType: pollData ? 'poll' : mediaType,
        pollData: pollData ? {
          question: pollData.question,
          options: pollData.options.map((o: any) => ({ text: typeof o === 'string' ? o : o.text, votes: 0 })),
          totalVotes: 0,
          userVote: null
        } : undefined,
        createdAt: new Date().toISOString(),
      };

      return res.status(201).json({ message });
    } catch (err) {
      console.error('sendMessage error:', err);
      return res.status(500).json({ error: 'Failed to send room message.' });
    }
  },

  // Vote on a Room Poll
  votePoll: async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
      const { messageId } = req.params;
      const { optionIndex } = req.body;
      const userId = req.user.id;

      if (typeof optionIndex !== 'number') {
        return res.status(400).json({ error: 'Invalid option index.' });
      }

      const existing = query.get('SELECT id FROM room_poll_votes WHERE message_id = ? AND user_id = ?', [messageId, userId]);
      if (existing) {
        query.run('UPDATE room_poll_votes SET option_index = ? WHERE id = ?', [optionIndex, existing.id]);
      } else {
        query.run('INSERT INTO room_poll_votes (id, message_id, user_id, option_index) VALUES (?, ?, ?, ?)', [
          uuidv4(),
          messageId,
          userId,
          optionIndex
        ]);
      }

      // Recompute poll counts
      const msg = query.get('SELECT poll_data FROM room_messages WHERE id = ?', [messageId]);
      if (!msg || !msg.poll_data) return res.status(404).json({ error: 'Poll not found.' });

      const parsed = JSON.parse(msg.poll_data);
      const votes = query.all('SELECT option_index, COUNT(*) as count FROM room_poll_votes WHERE message_id = ? GROUP BY option_index', [messageId]);
      const voteMap: Record<number, number> = {};
      let total = 0;
      votes.forEach((v: any) => {
        voteMap[v.option_index] = v.count;
        total += v.count;
      });

      const updatedPoll: PollData = {
        question: parsed.question,
        options: parsed.options.map((opt: any, idx: number) => ({
          text: typeof opt === 'string' ? opt : opt.text,
          votes: voteMap[idx] || 0
        })),
        totalVotes: total,
        userVote: optionIndex
      };

      return res.json({ pollData: updatedPoll });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to record vote.' });
    }
  }
};
