export const ENV = {
  MAILGUN_API_KEY: process.env.MAILGUN_API_KEY,
  MAILGUN_DOMAIN: process.env.MAILGUN_DOMAIN || 'jvs.org.uk',
  MAILGUN_FROM_EMAIL: process.env.MAILGUN_FROM_EMAIL || process.env.EMAIL_SENDER || 'noreply@jvs.org.uk',
  MAILGUN_BASE_URL: process.env.MAILGUN_BASE_URL || 'https://api.eu.mailgun.net', // EU region for GDPR
  CRON_SECRET: process.env.CRON_SECRET,
  EMAIL_SENDER: process.env.EMAIL_SENDER || 'noreply@jvs.org.uk',
};

export function assertEmailEnv() {
  if (!ENV.MAILGUN_API_KEY) {
    console.error('❌ [ENV] MAILGUN_API_KEY missing');
    console.error('❌ [ENV] Available env vars:', Object.keys(process.env).filter(key => key.includes('MAILGUN')));
    throw new Error('MAILGUN_API_KEY missing');
  }
  if (!ENV.MAILGUN_DOMAIN) {
    console.error('❌ [ENV] MAILGUN_DOMAIN missing');
    throw new Error('MAILGUN_DOMAIN missing');
  }
  if (!ENV.MAILGUN_FROM_EMAIL) {
    console.warn('⚠️ [ENV] MAILGUN_FROM_EMAIL not set; using fallback');
  }
  
  console.log('✅ [ENV] Email environment validated:', {
    apiKey: ENV.MAILGUN_API_KEY ? `${ENV.MAILGUN_API_KEY.slice(0, 6)}...${ENV.MAILGUN_API_KEY.slice(-4)}` : 'undefined',
    domain: ENV.MAILGUN_DOMAIN,
    baseUrl: ENV.MAILGUN_BASE_URL,
    fromEmail: ENV.MAILGUN_FROM_EMAIL
  });
}

export function getMaskedEnvInfo() {
  const mask = (v?: string) => v ? v.slice(0, 6) + "..." + v.slice(-4) : "undefined";
  
  return {
    MAILGUN_API_KEY: mask(process.env.MAILGUN_API_KEY),
    MAILGUN_DOMAIN: process.env.MAILGUN_DOMAIN,
    MAILGUN_BASE_URL: process.env.MAILGUN_BASE_URL || 'https://api.eu.mailgun.net',
    EMAIL_SENDER: process.env.EMAIL_SENDER,
    NODE_ENV: process.env.NODE_ENV
  };
}
