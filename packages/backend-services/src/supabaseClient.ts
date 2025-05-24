import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL as string
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY as string

export const supabase = createClient(supabaseUrl, supabaseServiceKey)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey) 