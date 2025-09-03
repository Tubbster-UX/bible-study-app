import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/utils/supabase'
import { useEffect, useRef, useState } from 'react'
import { FlatList, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, Text, TextInput, View } from 'react-native'

type Message = {
  id: number
  author_id: string
  body: string | null
  created_at: string
}

export default function ChatScreen() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const flatRef = useRef<FlatList<Message> | null>(null)
  const lastSeenRef = useRef<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const broadcastChannelRef = useRef<any | null>(null)
  // Hardcoded group id to send messages to and listen for
  const GROUP_ID = '8ba140c1-b57f-4967-b2a9-c2812bab8a72'

  useEffect(() => {
    let mounted = true

    async function load() {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('group_id', GROUP_ID)
        .order('created_at', { ascending: true })
        .limit(100)
      if (error) {
        console.log('load messages error', error)
        return
      }
      if (!mounted) return
      setMessages(data ?? [])
      // set last seen to newest message timestamp
      if (data && data.length) lastSeenRef.current = data[data.length - 1].created_at
      else lastSeenRef.current = new Date().toISOString()
      // scroll to bottom after initial load
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 100)
    }

    load()

  // Subscribe to realtime INSERTs for this group only and log events
    const channel = supabase.channel(`messages:${GROUP_ID}`).on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `group_id=eq.${GROUP_ID}` },
      (payload) => {
        console.log('realtime payload', payload)
        const msg = payload.new as Message
        // avoid duplicates: if message already exists by id, skip
        setMessages((prev) => {
          if (prev.some((m) => String(m.id) === String(msg.id))) return prev
          return [...prev, msg]
        })
        // update last seen timestamp
        if (msg.created_at) lastSeenRef.current = msg.created_at
        // scroll to bottom on new message
        setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 50)
      }
    )

    // Also create a client-side broadcast channel for instant client-to-client messages
    // This is helpful when postgres_changes events don't reach the client reliably.
    const broadcastChannel = supabase.channel(`broadcast:messages:${GROUP_ID}`, {
      config: { broadcast: { self: true } },
    })

    broadcastChannel.on('broadcast', { event: 'message' }, ({ payload }) => {
      console.log('broadcast payload', payload)
      const msg = payload?.message as Message
      if (!msg) return
      setMessages((prev) => {
        if (prev.some((m) => String(m.id) === String(msg.id))) return prev
        return [...prev, msg]
      })
      if (msg.created_at) lastSeenRef.current = msg.created_at
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 50)
    })

    ;(async () => {
      try {
        // subscribe both channels; ignore errors individually so one failing doesn't block the other
        // @ts-ignore
        const sub1 = await channel.subscribe()
        console.log('postgres subscribe result for messages channel:', GROUP_ID, sub1)
      } catch (err) {
        console.log('postgres subscribe error', err)
      }
      try {
        // @ts-ignore
        const sub2 = await broadcastChannel.subscribe()
        console.log('broadcast subscribe result for messages channel:', GROUP_ID, sub2)
        broadcastChannelRef.current = broadcastChannel
      } catch (err) {
        console.log('broadcast subscribe error', err)
      }
    })()

    // subscribe() is async; await it so we can log success/error for debugging
    ;(async () => {
      try {
        // @ts-ignore - runtime call; shape can vary between client versions
        const sub = await channel.subscribe()
        console.log('realtime subscribe result for messages channel:', GROUP_ID, sub)
      } catch (err) {
        console.log('realtime subscribe error', err)
      }
    })()

    console.log('attempted to subscribe to realtime channel messages:', GROUP_ID)

    // polling fallback: check for new messages every 5s and append any that are newer than lastSeen
    pollRef.current = setInterval(async () => {
      if (!mounted) return
      const since = lastSeenRef.current
      if (!since) return
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('group_id', GROUP_ID)
          .gt('created_at', since)
          .order('created_at', { ascending: true })
        if (error) {
          // don't spam logs for transient errors
          console.log('poll messages error', error)
          return
        }
        if (data && data.length) {
          setMessages((prev) => {
            // append only new ids
            const existingIds = new Set(prev.map((p) => String(p.id)))
            const toAdd = data.filter((d) => !existingIds.has(String(d.id)))
            if (!toAdd.length) return prev
            return [...prev, ...toAdd]
          })
          lastSeenRef.current = data[data.length - 1].created_at
          setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 50)
        }
      } catch (err) {
        // ignore
      }
    }, 5000)

    return () => {
      mounted = false
      try {
        channel.unsubscribe()
      } catch (e) {
        // ignore unsubscribe errors during unmount
      }
      try {
        broadcastChannelRef.current?.unsubscribe()
      } catch (e) {
        // ignore
      }
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [])

  async function sendMessage() {
    if (!user || !text.trim()) return
    const content = text.trim()
    setText('')
  try {
    // try to return the inserted row so we can optimistically append it even if realtime doesn't deliver
    const res = await supabase
      .from('messages')
      .insert({ group_id: GROUP_ID, author_id: user.id, body: content })
      .select()
      .single()

    console.log('insert response', res)
    if (res.error) {
      console.log('send error', res.error)
      return
    }

    // if the server returns the inserted row, append it immediately (fallback when realtime doesn't arrive)
    if (res.data) {
      setMessages((prev) => [...prev, res.data as Message])
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 50)
      try {
        // also broadcast the inserted message to other clients for instant delivery
        broadcastChannelRef.current?.send({ type: 'broadcast', event: 'message', payload: { message: res.data } })
      } catch (e) {
        // ignore broadcast errors
      }
    }
  } catch (err) {
    console.log('unexpected send error', err)
  }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} // or 'padding' for Android if 'resize' is handled externally
      className='flex-1'
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0} // Adjust offset for iOS if needed
    >
      <SafeAreaView className="flex-1 p-3">
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <View className={`py-2 ${item.author_id === user?.id ? 'items-end' : 'items-start'}`}>
              <View className={`max-w-3/4 px-3 py-2 rounded ${item.author_id === user?.id ? 'bg-blue-600' : 'bg-gray-200'}`}>
                <Text className={`${item.author_id === user?.id ? 'text-white' : 'text-black'}`}>{item.body}</Text>
                <Text className="text-xs text-gray-500 mt-1">{new Date(item.created_at).toLocaleTimeString()}</Text>
              </View>
            </View>
          )}
        />

        <View className="flex-row items-center mt-4">
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Type a message"
            className="flex-1 border border-gray-300 rounded px-3 py-2 mr-2"
          />
          <Pressable onPress={sendMessage} className="bg-blue-600 px-4 py-2 rounded">
            <Text className="text-white">Send</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  )
}