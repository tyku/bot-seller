export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/bot-seller',
  },
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  
  encryption: {
    key: process.env.ENCRYPTION_KEY || 'dev-only-key-change-in-production',
  },
  
  gateway: {
    baseUrl: process.env.GATEWAY_BASE_URL || 'http://localhost:3000',
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: '24h',
  },
  
  resend: {
    apiKey: process.env.RESEND_API_KEY,
    from: process.env.RESEND_FROM || 'onboarding@resend.dev',
  },
  
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    botUsername: process.env.TELEGRAM_BOT_USERNAME || 'your_bot',
  },
});
