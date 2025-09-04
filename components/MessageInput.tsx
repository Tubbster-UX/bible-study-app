import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

interface MessageInputProps {
  text: string;
  setText: (t: string) => void;
  onSend: () => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({ text, setText, onSend }) => (
  <View className="flex-row items-center mt-4 px-2">
    <View className="flex-1 mr-2">
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Type a message..."
        className="border border-gray-300 rounded-full px-4 py-3 bg-white shadow"
        style={{ fontSize: 16 }}
        returnKeyType="send"
        onSubmitEditing={onSend}
      />
    </View>
    <Pressable
      onPress={onSend}
      className="bg-blue-600 rounded-full px-5 py-3 shadow flex-row items-center"
      style={{ elevation: 2 }}
    >
      <Text className="text-white font-semibold" style={{ fontSize: 16 }}>Send</Text>
    </Pressable>
  </View>
);
