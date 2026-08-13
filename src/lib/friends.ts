import { supabase } from "./supabase";

export type FriendRow = {
  user_id: string;
  username: string;
  avatar_url: string | null;
  avatar_moderated: boolean;
  xp: number;
  completed_count: number;
  streak: number;
  stride_score: number;
  xp_this_week: number;
  tier: string;
};

export type Friendship = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  partner_id?: string;
  partner_username?: string;
  partner_avatar?: string | null;
  partner_avatar_moderated?: boolean;
  direction?: "incoming" | "outgoing";
};

export type FriendProfile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  avatar_moderated: boolean;
  bio: string | null;
  xp: number;
  streak: number;
  stride_score: number;
  tier: string;
  completed_count: number;
  achievements: string[];
  stats: Record<string, number>;
  share_stats_with_friends: boolean;
};

async function fetchPartnerProfiles(rows: any[], myId: string): Promise<Friendship[]> {
  const partnerIds = rows.map((r) => (r.requester_id === myId ? r.addressee_id : r.requester_id));
  if (partnerIds.length === 0) return rows.map((r) => ({ ...r, direction: r.requester_id === myId ? "outgoing" : "incoming" } as Friendship));

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, avatar_moderated")
    .in("id", partnerIds);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  return rows.map((r) => {
    const partnerId = r.requester_id === myId ? r.addressee_id : r.requester_id;
    const profile = profileMap.get(partnerId);
    return {
      ...r,
      direction: r.requester_id === myId ? "outgoing" : "incoming",
      partner_id: partnerId,
      partner_username: profile?.username,
      partner_avatar: profile?.avatar_url ?? null,
      partner_avatar_moderated: profile?.avatar_moderated ?? false,
    } as Friendship;
  });
}

export async function searchUsers(query: string): Promise<{ id: string; username: string; avatar_url: string | null; avatar_moderated: boolean }[]> {
  if (!query.trim()) return [];
  const { data: { session } } = await supabase.auth.getSession();
  const myId = session?.user.id;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, avatar_moderated")
    .ilike("username", `%${query.trim()}%`)
    .eq("status", "active")
    .neq("id", myId ?? "")
    .limit(10);
  if (error || !data) return [];
  return data;
}

export async function getFriendships(): Promise<{ incoming: Friendship[]; outgoing: Friendship[]; accepted: Friendship[] }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { incoming: [], outgoing: [], accepted: [] };
  const myId = session.user.id;

  const { data, error } = await supabase
    .from("friendships")
    .select("*")
    .or(`requester_id.eq.${myId},addressee_id.eq.${myId}`);
  if (error || !data) return { incoming: [], outgoing: [], accepted: [] };

  const rows = await fetchPartnerProfiles(data, myId);
  return {
    incoming: rows.filter((r) => r.direction === "incoming" && r.status === "pending"),
    outgoing: rows.filter((r) => r.direction === "outgoing" && r.status === "pending"),
    accepted: rows.filter((r) => r.status === "accepted"),
  };
}

export async function sendFriendRequest(addresseeId: string): Promise<boolean> {
  const { error } = await supabase.from("friendships").insert({ addressee_id: addresseeId });
  return !error;
}

export async function acceptFriendRequest(id: string): Promise<boolean> {
  const { error } = await supabase.from("friendships").update({ status: "accepted", updated_at: new Date().toISOString() }).eq("id", id);
  return !error;
}

export async function declineFriendRequest(id: string): Promise<boolean> {
  const { error } = await supabase.from("friendships").delete().eq("id", id);
  return !error;
}

export async function removeFriend(id: string): Promise<boolean> {
  const { error } = await supabase.from("friendships").delete().eq("id", id);
  return !error;
}

export async function getFriendProfile(userId: string): Promise<FriendProfile | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, avatar_moderated, bio, share_stats_with_friends")
    .eq("id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (!profile) return null;

  const { data: gameState } = await supabase
    .from("user_game_state")
    .select("xp, streak, stride_score, tier, completed_count, achievements, stats")
    .eq("user_id", userId)
    .maybeSingle();

  return {
    id: profile.id,
    username: profile.username,
    display_name: profile.display_name,
    avatar_url: profile.avatar_url,
    avatar_moderated: profile.avatar_moderated,
    bio: profile.bio,
    xp: gameState?.xp ?? 0,
    streak: gameState?.streak ?? 0,
    stride_score: gameState?.stride_score ?? 0,
    tier: gameState?.tier ?? "",
    completed_count: gameState?.completed_count ?? 0,
    achievements: gameState?.achievements ?? [],
    stats: gameState?.stats ?? {},
    share_stats_with_friends: profile.share_stats_with_friends ?? true,
  };
}

export async function getGlobalLeaderboard(limit = 100): Promise<FriendRow[]> {
  const { data, error } = await supabase.rpc("get_global_leaderboard", { limit_count: limit });
  if (error || !data) return [];
  return data as FriendRow[];
}

export async function getFriendsLeaderboard(friendIds: string[]): Promise<FriendRow[]> {
  if (friendIds.length === 0) return [];
  const { data, error } = await supabase.rpc("get_friends_leaderboard", { friend_ids: friendIds });
  if (error || !data) return [];
  return data as FriendRow[];
}

export async function getAcceptedFriendIds(): Promise<string[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];
  const myId = session.user.id;
  const { data, error } = await supabase
    .from("friendships")
    .select("requester_id, addressee_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${myId},addressee_id.eq.${myId}`);
  if (error || !data) return [];
  return data.map((r) => (r.requester_id === myId ? r.addressee_id : r.requester_id));
}

// ─── Direct Messages (Chat) ───

export type ChatMessage = {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
};

export type Conversation = {
  friend_id: string;
  friend_username: string;
  friend_avatar: string | null;
  friend_avatar_moderated: boolean;
  last_message: string;
  last_message_at: string;
  unread_count: number;
};

export async function sendMessage(recipientId: string, content: string): Promise<boolean> {
  const { error } = await supabase
    .from("direct_messages")
    .insert({ recipient_id: recipientId, content: content.trim() });
  return !error;
}

export async function fetchMessages(otherUserId: string, limit = 100): Promise<ChatMessage[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];
  const myId = session.user.id;
  const { data, error } = await supabase
    .from("direct_messages")
    .select("*")
    .or(`and(sender_id.eq.${myId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${myId})`)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error || !data) return [];
  return data as ChatMessage[];
}

export async function markMessagesRead(otherUserId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  const myId = session.user.id;
  await supabase
    .from("direct_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("sender_id", otherUserId)
    .eq("recipient_id", myId)
    .is("read_at", null);
}

export async function getConversations(): Promise<Conversation[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];
  const myId = session.user.id;

  const { data, error } = await supabase
    .from("direct_messages")
    .select("id, sender_id, recipient_id, content, created_at, read_at")
    .or(`sender_id.eq.${myId},recipient_id.eq.${myId}`)
    .order("created_at", { ascending: false });

  if (error || !data || data.length === 0) return [];

  const byFriend = new Map<string, { last_message: string; last_message_at: string; unread: number }>();
  for (const m of data) {
    const friendId = m.sender_id === myId ? m.recipient_id : m.sender_id;
    const existing = byFriend.get(friendId);
    const isUnread = m.recipient_id === myId && !m.read_at;
    if (!existing) {
      byFriend.set(friendId, { last_message: m.content, last_message_at: m.created_at, unread: isUnread ? 1 : 0 });
    } else {
      if (isUnread) existing.unread++;
    }
  }

  const friendIds = [...byFriend.keys()];
  if (friendIds.length === 0) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, avatar_moderated")
    .in("id", friendIds);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  return friendIds.map((id) => {
    const info = byFriend.get(id)!;
    const p = profileMap.get(id);
    return {
      friend_id: id,
      friend_username: p?.username ?? "User",
      friend_avatar: p?.avatar_url ?? null,
      friend_avatar_moderated: p?.avatar_moderated ?? false,
      last_message: info.last_message,
      last_message_at: info.last_message_at,
      unread_count: info.unread,
    };
  }).sort((a, b) => b.last_message_at.localeCompare(a.last_message_at));
}
