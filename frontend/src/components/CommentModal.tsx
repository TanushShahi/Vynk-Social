import React, { useState, useEffect } from 'react';
import { X, Send, Heart, CornerDownRight } from 'lucide-react';
import { Comment } from '../types/index.js';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';

interface CommentModalProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
  onCommentAdded?: () => void;
}

export const CommentModal: React.FC<CommentModalProps> = ({
  postId,
  isOpen,
  onClose,
  onCommentAdded
}) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadComments();
    }
  }, [isOpen, postId]);

  const loadComments = async () => {
    try {
      const res = await api.getComments(postId);
      setComments(res.comments);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await api.addComment(postId, content.trim(), replyingTo?.id);
      setContent('');
      setReplyingTo(null);
      await loadComments();
      onCommentAdded?.();
    } catch (err) {
      console.error('Failed to post comment', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = async (commentId: string) => {
    try {
      await api.likeComment(commentId);
      loadComments();
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full sm:max-w-lg bg-[#0d1022] border border-white/10 rounded-t-3xl sm:rounded-3xl max-h-[85vh] h-[600px] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
          <h3 className="font-bold text-base text-white">Comments</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X size={18} />
          </button>
        </div>

        {/* Comment List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {comments.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 py-10">
              <span className="text-3xl mb-2">💬</span>
              <p className="text-sm">No comments yet. Start the conversation!</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="space-y-3">
                <div className="flex items-start gap-3">
                  <img
                    src={comment.author.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                    alt={comment.author.name}
                    className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{comment.author.name}</span>
                      <span className="text-[11px] text-slate-400">@{comment.author.uid}</span>
                    </div>
                    <p className="text-xs text-slate-200 mt-1 leading-relaxed">{comment.content}</p>
                    <div className="flex items-center gap-4 mt-1.5 text-[11px] text-slate-400">
                      <button
                        onClick={() => setReplyingTo(comment)}
                        className="hover:text-purple-400 font-semibold"
                      >
                        Reply
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => handleLike(comment.id)}
                    className={`flex flex-col items-center justify-center gap-0.5 text-xs p-1 ${
                      comment.isLiked ? 'text-pink-500' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Heart size={14} fill={comment.isLiked ? 'currentColor' : 'none'} />
                    {comment.likesCount > 0 && <span className="text-[10px]">{comment.likesCount}</span>}
                  </button>
                </div>

                {/* Nested Replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="ml-10 space-y-2 border-l border-white/10 pl-3">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="flex items-start gap-2.5">
                        <img
                          src={reply.author.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                          alt={reply.author.name}
                          className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-white">{reply.author.name}</span>
                            <span className="text-[10px] text-slate-400">@{reply.author.uid}</span>
                          </div>
                          <p className="text-xs text-slate-300 mt-0.5">{reply.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Reply To Banner */}
        {replyingTo && (
          <div className="px-4 py-1.5 bg-purple-950/40 border-t border-purple-500/20 flex items-center justify-between text-xs text-purple-300">
            <span className="flex items-center gap-1">
              <CornerDownRight size={13} />
              Replying to @{replyingTo.author.uid}
            </span>
            <button onClick={() => setReplyingTo(null)} className="text-slate-400 hover:text-white">
              <X size={13} />
            </button>
          </div>
        )}

        {/* Input Bar */}
        <form onSubmit={handleSubmit} className="p-3 bg-[#0a0d1b] border-t border-white/[0.08] flex items-center gap-2">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={user ? (replyingTo ? `Reply to @${replyingTo.author.uid}...` : 'Add a thoughtful comment...') : 'Sign in to comment'}
            disabled={!user || isSubmitting}
            className="flex-1 px-4 py-2.5 rounded-full bg-white/[0.06] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
          <button
            type="submit"
            disabled={!user || !content.trim() || isSubmitting}
            className="w-9 h-9 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center text-white disabled:opacity-40 shadow-sm"
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
};
