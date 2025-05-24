#!/usr/bin/env node

/**
 * Debug script to check user authentication and database sync
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

async function debugUserAuth() {
  console.log('🔍 Debugging user authentication...\n');

  try {
    // 1. Check Supabase Auth users
    console.log('1️⃣ Checking Supabase Auth users...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error fetching auth users:', authError.message);
      return;
    }

    const testAuthUser = authUsers.users.find(user => user.email === TEST_EMAIL);
    if (testAuthUser) {
      console.log('✅ Found auth user:');
      console.log('   📧 Email:', testAuthUser.email);
      console.log('   🆔 Auth ID:', testAuthUser.id);
      console.log('   📅 Created:', testAuthUser.created_at);
      console.log('   📊 Metadata:', JSON.stringify(testAuthUser.user_metadata, null, 2));
    } else {
      console.log('❌ Auth user not found');
    }

    // 2. Check database users table
    console.log('\n2️⃣ Checking database users table...');
    const { data: dbUsers, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('email', TEST_EMAIL);

    if (dbError) {
      console.error('❌ Error fetching database users:', dbError.message);
      return;
    }

    if (dbUsers && dbUsers.length > 0) {
      const dbUser = dbUsers[0];
      console.log('✅ Found database user:');
      console.log('   📧 Email:', dbUser.email);
      console.log('   🆔 DB ID:', dbUser.id);
      console.log('   👤 Name:', dbUser.full_name);
      console.log('   🏷️  Username:', dbUser.username);
      console.log('   💳 Subscription:', dbUser.subscription_status);
      console.log('   📸 Profile Pic:', dbUser.profile_picture_url ? '✅ Set' : '❌ Not set');

      // 3. Check ID mismatch
      if (testAuthUser && testAuthUser.id !== dbUser.id) {
        console.log('\n⚠️  ID MISMATCH DETECTED!');
        console.log('   🔑 Auth ID:', testAuthUser.id);
        console.log('   🗄️  DB ID:', dbUser.id);
        console.log('   🔧 This is the root cause of the API error!');
      } else if (testAuthUser) {
        console.log('\n✅ IDs match correctly');
      }
    } else {
      console.log('❌ Database user not found');
    }

    // 4. Check subscriptions
    if (dbUsers && dbUsers.length > 0) {
      console.log('\n3️⃣ Checking subscriptions...');
      const { data: subscriptions, error: subError } = await supabase
        .from('subscriptions')
        .select(`
          *,
          plans (name, price_monthly)
        `)
        .eq('user_id', dbUsers[0].id);

      if (subError) {
        console.error('❌ Error fetching subscriptions:', subError.message);
      } else if (subscriptions && subscriptions.length > 0) {
        console.log('✅ Found subscriptions:');
        subscriptions.forEach(sub => {
          console.log(`   📋 Plan: ${sub.plans.name}`);
          console.log(`   📊 Status: ${sub.status}`);
          console.log(`   💰 Price: $${sub.plans.price_monthly}/month`);
        });
      } else {
        console.log('❌ No subscriptions found');
      }
    }

    // 5. Test the API endpoint simulation
    if (testAuthUser) {
      console.log('\n4️⃣ Simulating API endpoint...');
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('username, full_name, profile_picture_url, subscription_status')
        .eq('id', testAuthUser.id)
        .single();

      if (userError) {
        console.log('❌ API simulation failed (this is the actual error):');
        console.log('   Error:', userError.message);
        console.log('   Code:', userError.code);
        console.log('   Details:', userError.details);
      } else {
        console.log('✅ API simulation successful:');
        console.log('   Data:', JSON.stringify(userData, null, 2));
      }
    }

  } catch (err) {
    console.error('❌ Script failed:', err.message);
  }
}

// Run the debug script
debugUserAuth();
