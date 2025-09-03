import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = 'https://vljkyovsjymasydlzuwz.supabase.co';
const supabaseAnonKey = 'sb_publishable_bBQbIQG9WnK_AcHKkNo7Cw_qATNMqhf';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
