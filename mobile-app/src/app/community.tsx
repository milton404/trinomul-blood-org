import { SymbolView } from 'expo-symbols';
import { Image } from 'expo-image';
import { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BloodDrop } from '@/components/blood-drop';
import { Brand } from '@/constants/brand';
import { Strings } from '@/constants/strings';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  fetchFeed,
  createPost,
  toggleLike,
  fetchComments,
  addComment,
  fetchCurrentUser,
  type FeedPost,
  type CommentData,
  type AuthUser,
} from '@/lib/api';

function formatRelativeTime(iso: string): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (isNaN(then)) return '';
  const diff = Date.now() - then;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [source, setSource] = useState<'api' | 'cache' | 'mock'>('api');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [composerText, setComposerText] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [activePost, setActivePost] = useState<FeedPost | null>(null);
  const [comments, setComments] = useState<CommentData[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  const loadPosts = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    try {
      const result = await fetchFeed('all', 30, 0);
      setPosts(result.posts);
      setSource(result.source);
    } catch {
      // keep existing posts
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
    fetchCurrentUser().then((r) => setUser(r.user));
  }, [loadPosts]);

  const handlePost = async () => {
    if (!composerText.trim() || isPosting) return;
    setIsPosting(true);
    try {
      await createPost({ content: composerText.trim() });
      setComposerText('');
      loadPosts(true);
    } catch (err: any) {
      alert(err?.message || 'Failed to post');
    } finally {
      setIsPosting(false);
    }
  };

  const handleLike = async (postId: number) => {
    const idx = posts.findIndex((p) => p.id === postId);
    if (idx === -1) return;
    const post = posts[idx];
    const optimistic = { ...post, likedByMe: !post.likedByMe, likeCount: post.likeCount + (post.likedByMe ? -1 : 1) };
    setPosts([...posts.slice(0, idx), optimistic, ...posts.slice(idx + 1)]);
    try {
      await toggleLike(postId);
    } catch {
      // revert on failure
      setPosts([...posts.slice(0, idx), post, ...posts.slice(idx + 1)]);
    }
  };

  const openComments = async (post: FeedPost) => {
    setActivePost(post);
    setCommentModalVisible(true);
    setLoadingComments(true);
    try {
      const cmts = await fetchComments(post.id);
      setComments(cmts);
    } catch {
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async () => {
    if (!activePost || !newComment.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      const res = await addComment(activePost.id, newComment.trim());
      setNewComment('');
      const cmts = await fetchComments(activePost.id);
      setComments(cmts);
      // increment comment count optimistically
      const idx = posts.findIndex((p) => p.id === activePost.id);
      if (idx !== -1) {
        const updated = { ...posts[idx], commentCount: posts[idx].commentCount + 1 };
        setPosts([...posts.slice(0, idx), updated, ...posts.slice(idx + 1)]);
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const renderItem = ({ item }: { item: FeedPost }) => (
    <FeedPostCard
      post={item}
      onLike={() => handleLike(item.id)}
      onComment={() => openComments(item)}
    />
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.three }]}>
        <View style={styles.headerTop}>
          <BloodDrop size={28} />
          <Text style={styles.headerTitle}>{Strings.communityTitle}</Text>
        </View>
        <Text style={styles.headerSubtitle}>{Strings.communitySubtitle}</Text>
      </View>

      {source !== 'api' && !isLoading && (
        <View style={styles.offlineBanner}>
          <SymbolView name={{ ios: 'wifi.slash', android: 'wifi_off', web: 'wifi_off' } as never} size={13} tintColor="#92400e" />
          <Text style={styles.offlineText}>
            {source === 'cache' ? Strings.offlineCached : Strings.offlineMode}
          </Text>
        </View>
      )}

      {user && (
        <View style={styles.composer}>
          <TextInput
            value={composerText}
            onChangeText={setComposerText}
            placeholder="Share something with the community…"
            placeholderTextColor="#94a3b8"
            style={styles.composerInput}
            multiline
            numberOfLines={2}
            textAlignVertical="top"
          />
          <Pressable
            onPress={handlePost}
            disabled={!composerText.trim() || isPosting}
            style={({ pressed }) => [
              styles.postBtn,
              (!composerText.trim() || isPosting) && styles.postBtnDisabled,
              pressed && styles.pressed,
            ]}>
            {isPosting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.postBtnText}>Post</Text>
            )}
          </Pressable>
        </View>
      )}

      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={Brand.red} />
          <Text style={styles.loadingText}>Loading feed…</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={{
            paddingHorizontal: Spacing.four,
            paddingTop: Spacing.three,
            paddingBottom: BottomTabInset + Spacing.six,
            gap: Spacing.three,
          }}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => loadPosts(true)} tintColor={Brand.red} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <SymbolView name={{ ios: 'bubble.left', android: 'chat_bubble_outline', web: 'chat' } as never} size={48} tintColor="#cbd5e1" />
              <Text style={styles.emptyTitle}>No posts yet</Text>
              <Text style={styles.emptyHint}>Be the first to share something</Text>
            </View>
          }
        />
      )}

      <Modal
        visible={commentModalVisible}
        animationType="slide"
        onRequestClose={() => setCommentModalVisible(false)}>
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: theme.background }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + Spacing.three }]}>
            <Pressable onPress={() => setCommentModalVisible(false)} hitSlop={8}>
              <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' } as never} size={22} tintColor="#475569" />
            </Pressable>
            <Text style={styles.modalTitle}>Comments</Text>
            <View style={{ width: 22 }} />
          </View>

          {loadingComments ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={Brand.red} />
            </View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(c) => String(c.id)}
              contentContainerStyle={{ padding: Spacing.four, gap: Spacing.three }}
              ListEmptyComponent={
                <Text style={styles.emptyHint}>No comments yet. Be the first!</Text>
              }
              renderItem={({ item }) => (
                <View style={styles.commentItem}>
                  <View style={styles.commentAvatar}>
                    <Text style={styles.commentAvatarText}>
                      {(item.authorName || 'U').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.commentBody}>
                    <View style={styles.commentHeader}>
                      <Text style={styles.commentAuthor}>{item.authorName}</Text>
                      <Text style={styles.commentTime}>{formatRelativeTime(item.createdAt)}</Text>
                    </View>
                    <Text style={styles.commentContent}>{item.content}</Text>
                  </View>
                </View>
              )}
            />
          )}

          <View style={[styles.commentInputBar, { paddingBottom: insets.bottom + Spacing.three }]}>
            <TextInput
              value={newComment}
              onChangeText={setNewComment}
              placeholder="Write a comment…"
              placeholderTextColor="#94a3b8"
              style={styles.commentInput}
              multiline
            />
            <Pressable
              onPress={handleAddComment}
              disabled={!newComment.trim() || submittingComment}
              style={({ pressed }) => [
                styles.commentSend,
                (!newComment.trim() || submittingComment) && styles.postBtnDisabled,
                pressed && styles.pressed,
              ]}>
              {submittingComment ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <SymbolView name={{ ios: 'arrow.up', android: 'send', web: 'send' } as never} size={18} tintColor="#fff" />
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function FeedPostCard({
  post,
  onLike,
  onComment,
}: {
  post: FeedPost;
  onLike: () => void;
  onComment: () => void;
}) {
  const hasImages = Array.isArray(post.images) && post.images.length > 0;

  return (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <View style={styles.postAvatar}>
          {post.authorAvatarUrl ? (
            <Image source={{ uri: post.authorAvatarUrl }} style={styles.postAvatarImg} contentFit="cover" />
          ) : (
            <Text style={styles.postAvatarText}>
              {(post.authorName || 'U').charAt(0).toUpperCase()}
            </Text>
          )}
        </View>
        <View style={styles.postMeta}>
          <Text style={styles.postAuthor}>{post.authorName}</Text>
          <View style={styles.postMetaRow}>
            <Text style={styles.postRole}>{post.authorRole}</Text>
            <Text style={styles.postDot}>·</Text>
            <Text style={styles.postTime}>{formatRelativeTime(post.createdAt)}</Text>
          </View>
        </View>
        {post.pinned && (
          <View style={styles.pinnedBadge}>
            <SymbolView name={{ ios: 'pin.fill', android: 'push_pin', web: 'push_pin' } as never} size={10} tintColor="#64748b" />
            <Text style={styles.pinnedText}>Pinned</Text>
          </View>
        )}
      </View>

      {post.content ? <Text style={styles.postContent}>{post.content}</Text> : null}

      {hasImages && (
        <View style={[styles.imageGrid, post.images!.length === 1 && styles.imageGridSingle]}>
          {post.images!.slice(0, 4).map((uri, i) => (
            <Image
              key={i}
              source={{ uri }}
              style={[
                styles.postImage,
                post.images!.length === 1 && styles.postImageSingle,
              ]}
              contentFit="cover"
            />
          ))}
        </View>
      )}

      <View style={styles.postActions}>
        <Pressable onPress={onLike} style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}>
          <SymbolView
            name={{ ios: post.likedByMe ? 'heart.fill' : 'heart', android: post.likedByMe ? 'favorite' : 'favorite_border', web: post.likedByMe ? 'favorite' : 'favorite_border' } as never}
            size={18}
            tintColor={post.likedByMe ? '#dc2626' : '#64748b'}
          />
          <Text style={[styles.actionText, post.likedByMe && { color: '#dc2626' }]}>{post.likeCount}</Text>
        </Pressable>
        <Pressable onPress={onComment} style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}>
          <SymbolView name={{ ios: 'bubble.left', android: 'chat_bubble_outline', web: 'chat_bubble_outline' } as never} size={18} tintColor="#64748b" />
          <Text style={styles.actionText}>{post.commentCount}</Text>
        </Pressable>
        <View style={styles.actionBtn}>
          <SymbolView name={{ ios: 'square.and.arrow.up', android: 'share', web: 'share' } as never} size={18} tintColor="#64748b" />
          <Text style={styles.actionText}>{post.shareCount}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: Brand.red,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
    gap: 4,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    flex: 1,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '500',
  },

  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef3c7',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  offlineText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
  },

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  composerInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1e293b',
    minHeight: 44,
    maxHeight: 100,
  },
  postBtn: {
    backgroundColor: Brand.red,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postBtnDisabled: {
    backgroundColor: '#cbd5e1',
  },
  postBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
    gap: Spacing.two,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748b',
  },
  emptyHint: {
    fontSize: 13,
    color: '#94a3b8',
  },

  postCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: Spacing.three,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Brand.red,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  postAvatarImg: {
    width: '100%',
    height: '100%',
  },
  postAvatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  postMeta: {
    flex: 1,
  },
  postAuthor: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  postMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  postRole: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  postDot: {
    color: '#cbd5e1',
    fontSize: 11,
  },
  postTime: {
    fontSize: 11,
    color: '#94a3b8',
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
  },
  pinnedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  postContent: {
    fontSize: 14,
    color: '#1e293b',
    lineHeight: 20,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  imageGridSingle: {
    flexWrap: 'nowrap',
  },
  postImage: {
    width: '49%',
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  postImageSingle: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  postActions: {
    flexDirection: 'row',
    gap: Spacing.four,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#f1f5f9',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
  },

  commentItem: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Brand.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentAvatarText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  commentBody: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  commentAuthor: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
  },
  commentTime: {
    fontSize: 10,
    color: '#94a3b8',
  },
  commentContent: {
    fontSize: 13,
    color: '#334155',
  },

  commentInputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1e293b',
    minHeight: 44,
    maxHeight: 100,
  },
  commentSend: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Brand.red,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pressed: {
    opacity: 0.85,
  },
});
