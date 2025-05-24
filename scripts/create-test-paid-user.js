#!/usr/bin/env node

/**
 * Script to create a test paid user account for desktop app authentication testing
 *
 * This script:
 * 1. Runs the subscription tables migration
 * 2. Creates a Supabase Auth user
 * 3. Sets up the user with paid subscription status
 * 4. Provides login credentials for testing
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../apps/web-portal/.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

if (!supabaseUrl) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL not found in environment variables');
  process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const TEST_USER = {
  email: 'paid-user-test@example.com',
  password: 'TestPaid123!',
  id: '11111111-1111-1111-1111-111111111111',
  fullName: 'Premium Test User',
  username: 'premium_tester'
};

async function runMigration() {
  console.log('📊 Checking subscription tables...');

  try {
    // Check if plans table exists
    const { data, error } = await supabase
      .from('plans')
      .select('name')
      .limit(1);

    if (error) {
      console.log('⚠️  Subscription tables not found. Please run: npx supabase db reset');
      return false;
    } else {
      console.log('✅ Subscription tables found');
      return true;
    }
  } catch (err) {
    console.log('⚠️  Could not check subscription tables');
    return false;
  }
}

async function createAuthUser() {
  console.log('👤 Creating Supabase Auth user...');

  try {
    // First, try to delete the user if it exists
    const { error: deleteError } = await supabase.auth.admin.deleteUser(TEST_USER.id);
    if (deleteError && !deleteError.message.includes('User not found')) {
      console.log('⚠️  Could not delete existing user:', deleteError.message);
    }

    // Create the auth user
    const { data, error } = await supabase.auth.admin.createUser({
      email: TEST_USER.email,
      password: TEST_USER.password,
      email_confirm: true,
      user_metadata: {
        full_name: TEST_USER.fullName,
        username: TEST_USER.username
      }
    });

    if (error) {
      if (error.message.includes('already registered')) {
        console.log('✅ Auth user already exists');
        return true;
      }
      throw error;
    }

    console.log('✅ Auth user created successfully');
    return true;
  } catch (err) {
    console.error('❌ Failed to create auth user:', err.message);
    return false;
  }
}

async function setupUserData() {
  console.log('💾 Setting up user data and subscription...');

  try {
    // Insert user data
    const { error: userError } = await supabase
      .from('users')
      .upsert({
        id: TEST_USER.id,
        email: TEST_USER.email,
        full_name: TEST_USER.fullName,
        username: TEST_USER.username,
        company: 'Test Premium Corp',
        subscription_status: 'paid',
        profile_picture_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
      });

    if (userError) {
      console.error('❌ Failed to create user:', userError.message);
      return false;
    }

    // Get Pro plan ID
    const { data: planData, error: planError } = await supabase
      .from('plans')
      .select('plan_id')
      .eq('name', 'Pro')
      .single();

    if (planError) {
      console.error('❌ Failed to get Pro plan:', planError.message);
      return false;
    }

    // Create subscription
    const { error: subError } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: TEST_USER.id,
        plan_id: planData.plan_id,
        stripe_subscription_id: 'sub_test_premium_user_123',
        status: 'active',
        current_period_start: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        current_period_end: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
      });

    if (subError) {
      console.error('❌ Failed to create subscription:', subError.message);
      return false;
    }

    console.log('✅ User data and subscription setup completed');
    return true;
  } catch (err) {
    console.error('❌ Failed to setup user data:', err.message);
    return false;
  }
}

async function verifySetup() {
  console.log('🔍 Verifying setup...');

  try {
    const { data, error } = await supabase
      .from('users')
      .select(`
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
      .eq('email', TEST_USER.email)
      .single();

    if (error) {
      console.error('❌ Failed to verify setup:', error.message);
      return false;
    }

    console.log('✅ Setup verification successful:');
    console.log('   📧 Email:', data.email);
    console.log('   👤 Name:', data.full_name);
    console.log('   🏷️  Username:', data.username);
    console.log('   💳 Subscription:', data.subscription_status);
    console.log('   📸 Profile Picture:', data.profile_picture_url ? '✅ Set' : '❌ Not set');

    if (data.subscriptions && data.subscriptions.length > 0) {
      console.log('   📋 Plan:', data.subscriptions[0].plans.name);
      console.log('   📊 Status:', data.subscriptions[0].status);
    }

    return true;
  } catch (err) {
    console.error('❌ Failed to verify setup:', err.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Creating test paid user account...\n');

  try {
    // Step 1: Check migration
    const migrationSuccess = await runMigration();
    if (!migrationSuccess) {
      process.exit(1);
    }

    // Step 2: Create auth user
    const authSuccess = await createAuthUser();
    if (!authSuccess) {
      process.exit(1);
    }

    // Step 3: Setup user data
    const dataSuccess = await setupUserData();
    if (!dataSuccess) {
      process.exit(1);
    }

    // Step 4: Verify setup
    const verifySuccess = await verifySetup();
    if (!verifySuccess) {
      process.exit(1);
    }

    console.log('\n🎉 Test paid user account created successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('   📧 Email:', TEST_USER.email);
    console.log('   🔑 Password:', TEST_USER.password);
    console.log('\n🧪 Testing Instructions:');
    console.log('   1. Visit: http://localhost:3000/login?source=desktop');
    console.log('   2. Login with the credentials above');
    console.log('   3. Verify paid user UI elements appear');
    console.log('   4. Test desktop app authentication flow');

  } catch (err) {
    console.error('❌ Script failed:', err.message);
    process.exit(1);
  }
}

// Run the script
main();
