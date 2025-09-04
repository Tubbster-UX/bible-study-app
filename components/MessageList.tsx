import { supabase } from '@/utils/supabase';
import React, { RefObject, useEffect, useState } from 'react';
import { FlatList, View } from 'react-native';
import { MessageBubble } from './MessageBubble';
import { MessageReactions } from './MessageReactions';

interface Message {
  id: string;               // uuid
  author_id: string;
  body: string | null;
  created_at: string;
}

interface Profile {
  id: string;
  display_name: string;
}

interface MessageListProps {
  messages: Message[];
  userId: string | undefined;
  flatRef: RefObject<FlatList<Message>>;
}

type ReactionRow = {
  message_id: string;
  user_id: string;
  emoji: string;
};

export const MessageList: React.FC<MessageListProps> = ({ messages, userId, flatRef }) => {
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [reactionsMap, setReactionsMap] = useState<Record<string, ReactionRow[]>>({});
  const [pins, setPins] = useState<Record<string, boolean>>({});

  // TODO: inject this from props/context if possible
  const GROUP_ID = '8ba140c1-b57f-4967-b2a9-c2812bab8a72';

  // Fetch pins for all visible messages
  useEffect(() => {
    (async () => {
      try {
        if (!messages.length) return;
        const messageIds = messages.map((m) => m.id);
        const { data, error } = await supabase
          .from('message_pins')
          .select('message_id')
          .in('message_id', messageIds)
          .eq('group_id', GROUP_ID);

        if (error) {
          console.log('Error fetching pins:', error);
          return;
        }

        const pinMap: Record<string, boolean> = {};
        (data ?? []).forEach((row: { message_id: string }) => {
          pinMap[row.message_id] = true;
        });
        setPins(pinMap);
      } catch (e) {
        console.log('Unexpected error fetching pins:', e);
      }
    })();
  }, [messages]);

  async function handlePin(messageId: string) {
    if (!userId) return;
    try {
      if (pins[messageId]) {
        // Unpin
        const { error } = await supabase
          .from('message_pins')
          .delete()
          .eq('group_id', GROUP_ID)
          .eq('message_id', messageId);
        if (error) console.log('Error unpinning:', error);
      } else {
        // Pin
        const { error } = await supabase
          .from('message_pins')
          .insert({ group_id: GROUP_ID, message_id: messageId, pinned_by: userId });
        if (error) console.log('Error pinning:', error);
      }

      // Refetch pin state just for this message
      const { data } = await supabase
        .from('message_pins')
        .select('message_id')
        .eq('group_id', GROUP_ID)
        .eq('message_id', messageId);

      setPins((prev) => ({ ...prev, [messageId]: !!(data && data.length) }));
    } catch (e) {
      console.log('Unexpected error toggling pin:', e);
    }
  }

  // Fetch author display names for messages shown
  useEffect(() => {
    (async () => {
      try {
        const authorIds = Array.from(new Set(messages.map((m) => m.author_id)));
        if (authorIds.length === 0) return;

        const { data, error } = await supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', authorIds);

        if (error) {
          console.log('Error fetching profiles:', error);
          return;
        }

        const profileMap: Record<string, string> = {};
        (data ?? []).forEach((profile: Profile) => {
          profileMap[profile.id] = profile.display_name;
        });
        setProfiles(profileMap);
      } catch (e) {
        console.log('Unexpected error fetching profiles:', e);
      }
    })();
  }, [messages]);

  // Fetch reactions for visible messages
  useEffect(() => {
    (async () => {
      try {
        if (!messages.length) return;
        const messageIds = messages.map((m) => m.id);

        const { data, error } = await supabase
          .from('message_reactions')
          .select('message_id, user_id, emoji')
          .in('message_id', messageIds);

        if (error) {
          console.log('Error fetching reactions:', error);
          return;
        }

        const map: Record<string, ReactionRow[]> = {};
        (data ?? []).forEach((r: ReactionRow) => {
          if (!map[r.message_id]) map[r.message_id] = [];
          map[r.message_id].push(r);
        });
        setReactionsMap(map);
      } catch (e) {
        console.log('Unexpected error fetching reactions:', e);
      }
    })();
  }, [messages]);

  // React / unreact
  async function handleReact(messageId: string, emoji: string) {
    if (!userId) return;
    try {
      const reactions = reactionsMap[messageId] || [];
      const alreadyReacted = reactions.some((r) => r.user_id === userId && r.emoji === emoji);

      if (alreadyReacted) {
        const { error } = await supabase
          .from('message_reactions')
          .delete()
          .eq('message_id', messageId)
          .eq('user_id', userId)
          .eq('emoji', emoji);
        if (error) console.log('Error removing reaction:', error);
      } else {
        const { error } = await supabase
          .from('message_reactions')
          .insert({ message_id: messageId, user_id: userId, emoji });
        if (error) console.log('Error adding reaction:', error);
      }

      // Refresh reactions for this message only
      const { data } = await supabase
        .from('message_reactions')
        .select('message_id, user_id, emoji')
        .eq('message_id', messageId);

      setReactionsMap((prev) => ({ ...prev, [messageId]: (data as ReactionRow[]) ?? [] }));
    } catch (e) {
      console.log('Unexpected error toggling reaction:', e);
    }
  }

  return (
    <FlatList
      ref={flatRef}
      data={messages}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => {
        const reactionsArr = reactionsMap[item.id] || [];
        const availableEmojis = ['👍', '❤️', '😂', '🙏'];

        const reactions = availableEmojis.map((emoji) => {
          const filtered = reactionsArr.filter((r) => r.emoji === emoji);
          return {
            emoji,
            count: filtered.length,
            reacted: filtered.some((r) => r.user_id === userId),
          };
        });

        const isOwn = item.author_id === userId;

        return (
          <View className={`py-2 ${isOwn ? 'items-end' : 'items-start'}`}>
            <MessageBubble
              body={item.body}
              created_at={item.created_at}
              isOwn={isOwn}
              user={{ id: item.author_id, name: profiles[item.author_id] || 'User' }}
              onReact={(emoji) => handleReact(item.id, emoji)}
              availableEmojis={availableEmojis}
              pinned={!!pins[item.id]}
              onPin={() => handlePin(item.id)}
            />
            <MessageReactions
              reactions={reactions}
              onReact={(emoji) => handleReact(item.id, emoji)}
              availableEmojis={availableEmojis}
            />
          </View>
        );
      }}
    />
  );
};
