#!/usr/bin/env node

/**
 * Fix the subscription link after user ID update
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

async function fixSubscriptionLink() {
  console.log('🔧 Fixing subscription link...\n');

  try {
    // 1. Get the user ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', TEST_EMAIL)
      .single();

    if (userError) {
      console.error('❌ Error fetching user:', userError.message);
      return;
    }

    console.log('✅ Found user ID:', user.id);

    // 2. Get Pro plan ID
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('plan_id')
      .eq('name', 'Pro')
      .single();

    if (planError) {
      console.error('❌ Error fetching Pro plan:', planError.message);
      return;
    }

    console.log('✅ Found Pro plan ID:', plan.plan_id);

    // 3. Create or update subscription
    const { error: subError } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: user.id,
        plan_id: plan.plan_id,
        stripe_subscription_id: 'sub_test_premium_user_123',
        status: 'active',
        current_period_start: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        current_period_end: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
      }, {
        onConflict: 'stripe_subscription_id'
      });

    if (subError) {
      console.error('❌ Error creating subscription:', subError.message);
      return;
    }

    console.log('✅ Subscription created/updated successfully');

    // 4. Verify the subscription
    const { data: subscription, error: verifyError } = await supabase
      .from('subscriptions')
      .select(`
        *,
        plans (name, price_monthly)
      `)
      .eq('user_id', user.id)
      .single();

    if (verifyError) {
      console.error('❌ Error verifying subscription:', verifyError.message);
      return;
    }

    console.log('✅ Subscription verified:');
    console.log('   📋 Plan:', subscription.plans.name);
    console.log('   📊 Status:', subscription.status);
    console.log('   💰 Price: $' + subscription.plans.price_monthly + '/month');

    console.log('\n🎉 Subscription link fixed successfully!');

  } catch (err) {
    console.error('❌ Script failed:', err.message);
  }
}

// Run the fix script
fixSubscriptionLink();
