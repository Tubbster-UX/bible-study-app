import React from 'react';
import { Pressable, Text, View } from 'react-native';

interface Reaction {
  emoji: string;
  count: number;
  reacted: boolean;
}

interface MessageReactionsProps {
  reactions: Reaction[];
  onReact: (emoji: string) => void;
  availableEmojis?: string[];
}

export const MessageReactions: React.FC<MessageReactionsProps> = ({ reactions, onReact, availableEmojis = ['👍', '❤️', '😂', '🙏'] }) => {
  const shownReactions = reactions.filter(r => r.count > 0);
  if (shownReactions.length === 0) return null;
  return (
    <View className="flex-row mt-2">
      {shownReactions.map((reaction) => (
        <Pressable
          key={reaction.emoji}
          onPress={() => onReact(reaction.emoji)}
          className={`flex-row items-center px-2 py-1 mr-2 rounded-full border ${reaction.reacted ? 'bg-blue-100 border-blue-400' : 'bg-gray-100 border-gray-300'}`}
        >
          <Text style={{ fontSize: 18 }}>{reaction.emoji}</Text>
          <Text className="ml-1 text-xs text-gray-700">{reaction.count}</Text>
        </Pressable>
      ))}
    </View>
  );
};
