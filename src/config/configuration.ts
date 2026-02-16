export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/bot-seller',
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
