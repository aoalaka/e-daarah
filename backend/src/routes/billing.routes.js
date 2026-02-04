import express from 'express';
import Stripe from 'stripe';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';

const router = express.Router();

// Initialize Stripe with API key from environment
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Price lookup keys (configured in Stripe dashboard)
const PRICE_LOOKUP_KEYS = {
  standard_monthly: 'standard_monthly',
  standard_annual: 'standard_annual',
  plus_monthly: 'plus_monthly',
  plus_annual: 'plus_annual'
};

// Plan limits for reference (enforced in plan-limits middleware)
const PLAN_LIMITS = {
  trial: { maxStudents: 75, maxTeachers: 5, maxClasses: 5, plan: 'trial' },
  standard: { maxStudents: 75, maxTeachers: 5, maxClasses: 5, plan: 'standard' },
  plus: { maxStudents: 300, maxTeachers: 20, maxClasses: 15, plan: 'plus' }
};

/**
 * GET /api/billing/status
 * Get current subscription status for the madrasah
 */
router.get('/status', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const madrasahId = req.madrasahId;

    const [madrasahs] = await pool.query(
      `SELECT id, name, pricing_plan, subscription_status, trial_ends_at,
              current_period_end, stripe_customer_id, stripe_subscription_id
       FROM madrasahs WHERE id = ? AND deleted_at IS NULL`,
      [madrasahId]
    );

    if (madrasahs.length === 0) {
      return res.status(404).json({ error: 'Madrasah not found' });
    }

    const madrasah = madrasahs[0];

    // Get usage counts
    const [[studentCount]] = await pool.query(
      'SELECT COUNT(*) as count FROM students WHERE madrasah_id = ? AND deleted_at IS NULL',
      [madrasahId]
    );
    const [[teacherCount]] = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE madrasah_id = ? AND role = "teacher" AND deleted_at IS NULL',
      [madrasahId]
    );
    const [[classCount]] = await pool.query(
      'SELECT COUNT(*) as count FROM classes WHERE madrasah_id = ? AND deleted_at IS NULL',
      [madrasahId]
    );

    const limits = PLAN_LIMITS[madrasah.pricing_plan] || PLAN_LIMITS.trial;

    res.json({
      plan: madrasah.pricing_plan,
      status: madrasah.subscription_status,
      trialEndsAt: madrasah.trial_ends_at,
      currentPeriodEnd: madrasah.current_period_end,
      hasStripeSubscription: !!madrasah.stripe_subscription_id,
      usage: {
        students: { current: studentCount.count, limit: limits.maxStudents },
        teachers: { current: teacherCount.count, limit: limits.maxTeachers },
        classes: { current: classCount.count, limit: limits.maxClasses }
      },
      limits
    });
  } catch (error) {
    console.error('Error fetching billing status:', error);
    res.status(500).json({ error: 'Failed to fetch billing status' });
  }
});

/**
 * POST /api/billing/create-checkout
 * Create a Stripe Checkout session for subscription
 */
router.post('/create-checkout', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { priceKey, successUrl, cancelUrl } = req.body;

    // Validate price key
    if (!PRICE_LOOKUP_KEYS[priceKey]) {
      return res.status(400).json({ error: 'Invalid price key' });
    }

    // Get madrasah details
    const [madrasahs] = await pool.query(
      'SELECT id, name, email, stripe_customer_id FROM madrasahs WHERE id = ? AND deleted_at IS NULL',
      [madrasahId]
    );

    if (madrasahs.length === 0) {
      return res.status(404).json({ error: 'Madrasah not found' });
    }

    const madrasah = madrasahs[0];

    // Get or create Stripe customer
    let customerId = madrasah.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: madrasah.email || req.user.email,
        name: madrasah.name,
        metadata: {
          madrasah_id: madrasahId.toString()
        }
      });
      customerId = customer.id;

      // Save customer ID to database
      await pool.query(
        'UPDATE madrasahs SET stripe_customer_id = ? WHERE id = ?',
        [customerId, madrasahId]
      );
    }

    // Look up the price by lookup key
    const prices = await stripe.prices.list({
      lookup_keys: [priceKey],
      active: true,
      limit: 1
    });

    if (prices.data.length === 0) {
      return res.status(400).json({ error: 'Price not found' });
    }

    const price = prices.data[0];

    // Determine plan from price key
    const plan = priceKey.startsWith('plus') ? 'plus' : 'standard';

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price: price.id,
          quantity: 1
        }
      ],
      success_url: successUrl || `${process.env.FRONTEND_URL}/admin/settings?billing=success`,
      cancel_url: cancelUrl || `${process.env.FRONTEND_URL}/admin/settings?billing=canceled`,
      metadata: {
        madrasah_id: madrasahId.toString(),
        plan: plan
      },
      subscription_data: {
        metadata: {
          madrasah_id: madrasahId.toString(),
          plan: plan
        }
      },
      allow_promotion_codes: true // Enable coupon codes
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

/**
 * POST /api/billing/customer-portal
 * Create a Stripe Customer Portal session for managing subscription
 */
router.post('/customer-portal', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { returnUrl } = req.body;

    // Get madrasah's Stripe customer ID
    const [madrasahs] = await pool.query(
      'SELECT stripe_customer_id FROM madrasahs WHERE id = ? AND deleted_at IS NULL',
      [madrasahId]
    );

    if (madrasahs.length === 0 || !madrasahs[0].stripe_customer_id) {
      return res.status(400).json({ error: 'No billing account found. Please subscribe first.' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: madrasahs[0].stripe_customer_id,
      return_url: returnUrl || `${process.env.FRONTEND_URL}/admin/settings`
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(500).json({ error: 'Failed to create billing portal session' });
  }
});

/**
 * POST /api/billing/webhook
 * Handle Stripe webhook events
 * NOTE: This route should NOT use authenticateToken - Stripe calls it directly
 * NOTE: Raw body parsing is handled in server.js before JSON middleware
 */
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        await handleCheckoutComplete(session);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object;
        await handleInvoicePaid(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        await handlePaymentFailed(invoice);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

// Webhook handlers

async function handleCheckoutComplete(session) {
  const madrasahId = session.metadata?.madrasah_id;
  const plan = session.metadata?.plan || 'standard';

  if (!madrasahId) {
    console.error('No madrasah_id in checkout session metadata');
    return;
  }

  // Get subscription details
  const subscription = await stripe.subscriptions.retrieve(session.subscription);

  await pool.query(
    `UPDATE madrasahs SET
      stripe_subscription_id = ?,
      pricing_plan = ?,
      subscription_status = 'active',
      current_period_end = FROM_UNIXTIME(?)
     WHERE id = ?`,
    [subscription.id, plan, subscription.current_period_end, madrasahId]
  );

  console.log(`Checkout complete for madrasah ${madrasahId}, plan: ${plan}`);
}

async function handleInvoicePaid(invoice) {
  const customerId = invoice.customer;

  // Find madrasah by customer ID
  const [madrasahs] = await pool.query(
    'SELECT id FROM madrasahs WHERE stripe_customer_id = ?',
    [customerId]
  );

  if (madrasahs.length === 0) {
    console.error('No madrasah found for customer:', customerId);
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(invoice.subscription);

  await pool.query(
    `UPDATE madrasahs SET
      subscription_status = 'active',
      current_period_end = FROM_UNIXTIME(?)
     WHERE id = ?`,
    [subscription.current_period_end, madrasahs[0].id]
  );

  console.log(`Invoice paid for madrasah ${madrasahs[0].id}`);
}

async function handlePaymentFailed(invoice) {
  const customerId = invoice.customer;

  const [madrasahs] = await pool.query(
    'SELECT id FROM madrasahs WHERE stripe_customer_id = ?',
    [customerId]
  );

  if (madrasahs.length === 0) return;

  await pool.query(
    'UPDATE madrasahs SET subscription_status = "past_due" WHERE id = ?',
    [madrasahs[0].id]
  );

  console.log(`Payment failed for madrasah ${madrasahs[0].id}`);
}

async function handleSubscriptionUpdated(subscription) {
  const madrasahId = subscription.metadata?.madrasah_id;

  if (!madrasahId) {
    // Try to find by customer ID
    const [madrasahs] = await pool.query(
      'SELECT id FROM madrasahs WHERE stripe_customer_id = ?',
      [subscription.customer]
    );
    if (madrasahs.length === 0) return;

    const status = subscription.status === 'active' ? 'active' :
                   subscription.status === 'past_due' ? 'past_due' :
                   subscription.status === 'canceled' ? 'canceled' : 'trialing';

    await pool.query(
      `UPDATE madrasahs SET
        subscription_status = ?,
        current_period_end = FROM_UNIXTIME(?)
       WHERE id = ?`,
      [status, subscription.current_period_end, madrasahs[0].id]
    );
    return;
  }

  const plan = subscription.metadata?.plan || 'standard';
  const status = subscription.status === 'active' ? 'active' :
                 subscription.status === 'past_due' ? 'past_due' :
                 subscription.status === 'canceled' ? 'canceled' : 'trialing';

  await pool.query(
    `UPDATE madrasahs SET
      pricing_plan = ?,
      subscription_status = ?,
      current_period_end = FROM_UNIXTIME(?)
     WHERE id = ?`,
    [plan, status, subscription.current_period_end, madrasahId]
  );

  console.log(`Subscription updated for madrasah ${madrasahId}`);
}

async function handleSubscriptionDeleted(subscription) {
  const customerId = subscription.customer;

  const [madrasahs] = await pool.query(
    'SELECT id FROM madrasahs WHERE stripe_customer_id = ?',
    [customerId]
  );

  if (madrasahs.length === 0) return;

  // Downgrade to expired/canceled - keep data but restrict access
  await pool.query(
    `UPDATE madrasahs SET
      subscription_status = 'canceled',
      stripe_subscription_id = NULL
     WHERE id = ?`,
    [madrasahs[0].id]
  );

  console.log(`Subscription canceled for madrasah ${madrasahs[0].id}`);
}

/**
 * GET /api/billing/prices
 * Get available prices (public endpoint for pricing page)
 */
router.get('/prices', async (req, res) => {
  try {
    const prices = await stripe.prices.list({
      lookup_keys: Object.values(PRICE_LOOKUP_KEYS),
      active: true,
      expand: ['data.product']
    });

    const formattedPrices = prices.data.map(price => ({
      id: price.id,
      lookupKey: price.lookup_key,
      nickname: price.nickname,
      unitAmount: price.unit_amount,
      currency: price.currency,
      interval: price.recurring?.interval,
      product: {
        id: price.product.id,
        name: price.product.name,
        description: price.product.description
      }
    }));

    res.json(formattedPrices);
  } catch (error) {
    console.error('Error fetching prices:', error);
    res.status(500).json({ error: 'Failed to fetch prices' });
  }
});

export default router;
