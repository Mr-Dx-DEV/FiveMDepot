/* FiveMDepot — Pricing tiers. Edit plan copy and Paddle price IDs here.
 * Price IDs belong to one Paddle environment: these are SANDBOX IDs. Replace them with your live
 * pri_… IDs when PADDLE_ENVIRONMENT is switched to 'production' in config.local.php. */

/**
 * @typedef {Object} Tier
 * @property {'Starter' | 'Pro' | 'Advanced'} name
 * @property {string} description
 * @property {string[]} features
 * @property {boolean} [featured]  highlighted card
 * @property {{ month: string, year: string }} priceId
 */

/** @type {Tier[]} */
window.PRICING_TIERS = [
  {
    name: 'Starter',
    description: 'Everything you need to get going.',
    features: ['1 workspace', 'Up to 3 team members', 'Email support'],
    priceId: { month: 'pri_01m4gznzzdq34sz7j6ds9y3429', year: 'pri_01m4gzp15saagb53s9wrm8c9ft' }
  },
  {
    name: 'Pro',
    description: 'For growing teams that need more room.',
    features: ['5 workspaces', 'Up to 20 team members', 'Priority support', 'Advanced analytics'],
    featured: true,
    priceId: { month: 'pri_01m4gzp1vv1f9xjhzmecd0zscm', year: 'pri_01m4gzp25pthjybnh1djmn1we8' }
  },
  {
    name: 'Advanced',
    description: 'For organizations running at scale.',
    features: ['Unlimited workspaces', 'Unlimited team members', 'Dedicated support', 'SSO & audit logs'],
    priceId: { month: 'pri_01m4gzp2t3k0az9rf06nv13g84', year: 'pri_01m4gzp33cc86y6vhnkfztm1jx' }
  }
];

window.PRICING_TRIAL_DAYS = 7;
