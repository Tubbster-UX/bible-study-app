import React, { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

// Add this interface definition
interface MessageBubbleProps {
    user: {
        id: string;
        name: string;
    };
    body: string | null;
    created_at: string;
    isOwn: boolean;
    onReact?: (emoji: string) => void;
    availableEmojis?: string[];
    pinned?: boolean;
    onPin?: () => void;
    onReply?: () => void;
    onDelete?: () => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
    body,
    created_at,
    isOwn,
    user,
    onReact,
    availableEmojis = ['👍', '❤️', '😂', '🙏'],
    pinned,
    onPin,
    onReply,
    onDelete
}: MessageBubbleProps) => {
    // ...existing code...
    const [showActions, setShowActions] = useState(false);
    return (
        <Pressable
            onLongPress={() => setShowActions(true)}
            className={`flex-row items-end mb-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
            style={{ alignSelf: isOwn ? 'flex-end' : 'flex-start', maxWidth: '80%' }}
        >
            {!isOwn && (
                <View className="mr-2">
                    {/* Simple avatar circle with initials */}
                    <View className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center">
                        <Text className="text-white font-bold">
                            {user.name ? user.name[0].toUpperCase() : '?'}
                        </Text>
                    </View>
                </View>
            )}
            <View
                className={`px-4 py-2 rounded-lg shadow ${isOwn ? 'bg-blue-600' : 'bg-white border border-gray-300'}`}
                style={{ minWidth: 80 }}
            >
                {!isOwn && (
                    <Text className="text-xs font-semibold text-gray-700 mb-1">{user.name}</Text>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text className={isOwn ? 'text-white' : 'text-gray-900'} style={{ fontSize: 16, flexShrink: 1 }}>
                        {body}
                    </Text>
                    <Text className="text-xs text-gray-400 ml-2" style={{}}>
                        {getRelativeTime(created_at)}
                    </Text>
                </View>
            </View>
            {/* Actions Modal */}
            <Modal
                visible={showActions}
                transparent
                animationType="fade"
                onRequestClose={() => setShowActions(false)}
            >
                <Pressable style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)' }} onPress={() => setShowActions(false)}>
                    <View style={{ backgroundColor: '#23272f', borderRadius: 32, padding: 20, elevation: 8, flexDirection: 'column', alignItems: 'center', minWidth: 260 }}>
                        {/* Emoji bar */}
                        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 18 }}>
                            {availableEmojis.map(emoji => (
                                <Pressable
                                    key={emoji}
                                    onPress={() => { onReact?.(emoji); setShowActions(false); }}
                                    style={{ marginHorizontal: 10, padding: 14, borderRadius: 24, backgroundColor: '#2d323c', elevation: 2 }}
                                    android_ripple={{ color: '#444' }}
                                >
                                    <Text style={{ fontSize: 32 }}>{emoji}</Text>
                                </Pressable>
                            ))}
                        </View>
                        {/* Contextual menu */}
                        <View style={{ width: '100%' }}>
                            {onReply && (
                                <Pressable onPress={() => { onReply(); setShowActions(false); }} style={{ paddingVertical: 10, flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={{ color: '#fff', fontSize: 17 }}>↩️ Reply</Text>
                                </Pressable>
                            )}
                            {onPin && (
                                <Pressable onPress={() => { onPin(); setShowActions(false); }} style={{ paddingVertical: 10, flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={{ color: '#fff', fontSize: 17 }}>{pinned ? '📌 Unpin' : '📍 Pin'}</Text>
                                </Pressable>
                            )}
                            {onDelete && (
                                <Pressable onPress={() => { onDelete(); setShowActions(false); }} style={{ paddingVertical: 10, flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={{ color: '#fff', fontSize: 17 }}>🗑️ Delete</Text>
                                </Pressable>
                            )}
                            <Pressable onPress={() => setShowActions(false)} style={{ paddingVertical: 10, flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={{ color: '#fff', fontSize: 17 }}>Cancel</Text>
                            </Pressable>
                        </View>
                    </View>
                </Pressable>
            </Modal>
        </Pressable>
    );
}
function getRelativeTime(dateString: string): string {
    const now = Date.now();
    const then = new Date(dateString).getTime();
    const diff = Math.max(0, Math.floor((now - then) / 1000));
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
}