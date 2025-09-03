import '@/global.css'
import { supabase } from '@/utils/supabase'
import React, { useState } from 'react'
import { Alert, AppState, Pressable, Text, TextInput, View } from 'react-native'

// Tells Supabase Auth to continuously refresh the session automatically if
// the app is in the foreground. When this is added, you will continue to receive
// `onAuthStateChange` events with the `TOKEN_REFRESHED` or `SIGNED_OUT` event
// if the user's session is terminated. This should only be registered once.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh()
  } else {
    supabase.auth.stopAutoRefresh()
  }
})

export default function Auth() {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [code, setCode] = useState('')
  // Allow selecting a country code so user can type local number only.
  const [countryCode, setCountryCode] = useState('1')
  const [showCountryList, setShowCountryList] = useState(false)
  // Keep the exact E.164 phone used to send the last code so verification
  // uses the same value (avoids mismatch if user edits the input).
  const [sentPhone, setSentPhone] = useState('')
  // step: 'enter-email' -> show email input; 'enter-code' -> show 4-digit code input
  const [step, setStep] = useState<'enter-email' | 'enter-code'>('enter-email')

  const sendDisabled = loading || !phone
  const verifyDisabled = loading || code.length !== 6

  // Send a one-time 4-digit code to the provided email. Supabase will create
  // the user if they don't already exist. We're using the OTP/email flow.
  // Assumption: `supabase.auth.signInWithOtp` sends a numeric OTP to email
  // and `supabase.auth.verifyOtp` verifies the code. If your Supabase project
  // expects different params, adjust accordingly.
  async function sendCode() {
    setLoading(true)
    // Build E.164 phone number from selected country code + local number
    const cleanedLocal = phone.replace(/[^0-9]/g, '')
    const fullPhone = `${countryCode}${cleanedLocal}`
  const { data, error } = await supabase.auth.signInWithOtp({ phone: fullPhone })

    if (error) {
      Alert.alert(error.message)
      console.log(error)
    } else {
      // remember the exact phone we used
      setSentPhone(fullPhone)
      setStep('enter-code')
      Alert.alert('Code sent', `Please check ${fullPhone} for the 6-digit SMS code.`)
    }

    setLoading(false)
  }

  // Verify the 4-digit code. Assumes `verifyOtp` exists on the client.
  async function verifyCode() {
    setLoading(true)
  const token = code.trim()
    if (token.length !== 6) {
      Alert.alert('Please enter the 6-digit code')
      setLoading(false)
      return
    }

    // `type: 'email'` is a reasonable default for email OTP verification in
    // many Supabase client versions; change if your SDK expects a different value.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (!sentPhone) {
      Alert.alert('Please request a code first')
      setLoading(false)
      return
    }

    // Verify using the exact phone number we sent the code to.
  const { data, error } = await supabase.auth.verifyOtp({ phone: sentPhone, token, type: 'sms' })

    if (error) {
      Alert.alert(error.message)
    } else {
      Alert.alert('Signed in', 'Authentication successful.')
      // Optionally reset UI or navigate away; keeping the user on-screen for now.
  setStep('enter-email')
  setCode('')
  setPhone('')
    }

    setLoading(false)
  }

  return (
    <View className="mt-10 p-3">
      {step === 'enter-email' && (
        <>
          <View className="py-1 w-full mt-5 flex-row items-center">
            <Pressable
              onPress={() => setShowCountryList((s) => !s)}
              className="px-3 py-2 border border-gray-300 rounded mr-2"
            >
              <Text>{countryCode}</Text>
            </Pressable>
            <TextInput
              onChangeText={(text) => setPhone(text)}
              value={phone}
              placeholder="555 555 5555"
              keyboardType="phone-pad"
              autoCapitalize={'none'}
              className="flex-1 border border-gray-300 rounded px-3 py-2"
            />
          </View>
          {showCountryList && (
            <View className="mt-2">
              <Pressable onPress={() => { setCountryCode('1'); setShowCountryList(false) }} className="py-2">
                <Text>🇺🇸 +1</Text>
              </Pressable>
              <Pressable onPress={() => { setCountryCode('44'); setShowCountryList(false) }} className="py-2">
                <Text>🇬🇧 +44</Text>
              </Pressable>
              <Pressable onPress={() => { setCountryCode('91'); setShowCountryList(false) }} className="py-2">
                <Text>🇮🇳 +91</Text>
              </Pressable>
            </View>
          )}
          <View className="py-1 w-full mt-5">
            <Pressable
              onPress={() => sendCode()}
              disabled={sendDisabled}
              className={`${sendDisabled ? 'bg-gray-300' : 'bg-blue-600'} rounded`}
            >
              <Text className="text-white text-center py-2">Send code</Text>
            </Pressable>
          </View>
        </>
      )}

      {step === 'enter-code' && (
        <>
          <View className="py-1 w-full mt-5">
            <TextInput
              onChangeText={(text) => setCode(text.replace(/[^0-9]/g, ''))}
              value={code}
              placeholder="Enter 6-digit code"
              keyboardType="numeric"
              maxLength={6}
              autoCapitalize={'none'}
              className="border border-gray-300 rounded px-3 py-2"
            />
          </View>
          <View className="py-1 w-full mt-5">
            <Pressable
              onPress={() => verifyCode()}
              disabled={verifyDisabled}
              className={`${verifyDisabled ? 'bg-gray-300' : 'bg-green-600'} rounded`}
            >
              <Text className="text-white text-center py-2">Verify code</Text>
            </Pressable>
          </View>
          <View className="py-1 w-full">
            <Pressable onPress={() => sendCode()} disabled={loading} className={`${loading ? 'bg-gray-200' : 'bg-transparent'}`}>
              <Text className={`text-center py-2 ${loading ? 'text-gray-500' : 'text-blue-600'}`}>Resend code</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  )
}
