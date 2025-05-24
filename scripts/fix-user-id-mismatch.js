#!/usr/bin/env node

/**
 * Fix the user ID mismatch between Supabase Auth and database
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../apps/web-portal/.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const TEST_EMAIL = 'paid-user-test@example.com';
const OLD_DB_ID = '11111111-1111-1111-1111-111111111111';

async function fixUserIdMismatch() {
  console.log('🔧 Fixing user ID mismatch...\n');

  try {
    // 1. Get the correct Auth ID
    console.log('1️⃣ Getting Supabase Auth user ID...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error fetching auth users:', authError.message);
      return;
    }

    const testAuthUser = authUsers.users.find(user => user.email === TEST_EMAIL);
    if (!testAuthUser) {
      console.error('❌ Auth user not found');
      return;
    }

    const correctAuthId = testAuthUser.id;
    console.log('✅ Found correct Auth ID:', correctAuthId);

    // 2. Update the users table
    console.log('\n2️⃣ Updating users table...');
    const { error: updateUserError } = await supabase
      .from('users')
      .update({ id: correctAuthId })
      .eq('id', OLD_DB_ID);

    if (updateUserError) {
      console.error('❌ Error updating users table:', updateUserError.message);
      
      // Try alternative approach: delete old and insert new
      console.log('🔄 Trying alternative approach...');
      
      // First get the old user data
      const { data: oldUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', OLD_DB_ID)
        .single();

      if (fetchError) {
        console.error('❌ Error fetching old user:', fetchError.message);
        return;
      }

      // Delete old user
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', OLD_DB_ID);

      if (deleteError) {
        console.error('❌ Error deleting old user:', deleteError.message);
        return;
      }

      // Insert new user with correct ID
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          ...oldUser,
          id: correctAuthId
        });

      if (insertError) {
        console.error('❌ Error inserting new user:', insertError.message);
        return;
      }

      console.log('✅ Successfully recreated user with correct ID');
    } else {
      console.log('✅ Successfully updated user ID');
    }

    // 3. Update subscriptions table
    console.log('\n3️⃣ Updating subscriptions table...');
    const { error: updateSubError } = await supabase
      .from('subscriptions')
      .update({ user_id: correctAuthId })
      .eq('user_id', OLD_DB_ID);

    if (updateSubError) {
      console.error('❌ Error updating subscriptions:', updateSubError.message);
      return;
    }
    console.log('✅ Successfully updated subscriptions');

    // 4. Update any other related tables
    console.log('\n4️⃣ Updating related tables...');
    
    // Update user_profiles if it exists
    const { error: updateProfileError } = await supabase
      .from('user_profiles')
      .update({ user_id: correctAuthId })
      .eq('user_id', OLD_DB_ID);

    if (updateProfileError && !updateProfileError.message.includes('relation "user_profiles" does not exist')) {
      console.error('❌ Error updating user_profiles:', updateProfileError.message);
    } else {
      console.log('✅ Updated user_profiles (if exists)');
    }

    // Update call_transcripts if any exist
    const { error: updateTranscriptsError } = await supabase
      .from('call_transcripts')
      .update({ user_id: correctAuthId })
      .eq('user_id', OLD_DB_ID);

    if (updateTranscriptsError && !updateTranscriptsError.message.includes('relation "call_transcripts" does not exist')) {
      console.error('❌ Error updating call_transcripts:', updateTranscriptsError.message);
    } else {
      console.log('✅ Updated call_transcripts (if exists)');
    }

    // 5. Verify the fix
    console.log('\n5️⃣ Verifying the fix...');
    const { data: userData, error: verifyError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        username,
        subscription_status,
        profile_picture_url,
        subscriptions (
          status,
          plans (name)
        )
      `)
      .eq('id', correctAuthId)
      .single();

    if (verifyError) {
      console.error('❌ Verification failed:', verifyError.message);
      return;
    }

    console.log('✅ Verification successful!');
    console.log('   📧 Email:', userData.email);
    console.log('   🆔 ID:', userData.id);
    console.log('   👤 Name:', userData.full_name);
    console.log('   💳 Subscription:', userData.subscription_status);
    if (userData.subscriptions && userData.subscriptions.length > 0) {
      console.log('   📋 Plan:', userData.subscriptions[0].plans.name);
      console.log('   📊 Status:', userData.subscriptions[0].status);
    }

    console.log('\n🎉 User ID mismatch fixed successfully!');
    console.log('   The /api/v1/auth/me endpoint should now work correctly.');

  } catch (err) {
    console.error('❌ Script failed:', err.message);
  }
}

// Run the fix script
fixUserIdMismatch();
