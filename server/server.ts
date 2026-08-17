import app from './app';
import { config } from './config';
import { testConnection } from './config/database';
import { ensureDefaultAdmin } from './services/authService';
import { ensureDefaultStaff } from './services/usersService';
import { logDriveStatus } from './services/googleDriveService';

async function bootstrap() {
  const dbOk = await testConnection();
  if (!dbOk) {
    console.error('❌ MySQL connection failed. Check DB credentials in .env');
    console.error('   Run schema: mysql -u root < database/schema.sql');
    // Still start server so health endpoint works during setup
  } else {
    console.log('✅ MySQL connected');
    try {
      await ensureDefaultAdmin();
      await ensureDefaultStaff();
      console.log('✅ Default admin ready (admin@komalsmakeovers.com / Admin@123)');
      console.log('✅ Default staff ready (staff@komalsmakeovers.com / Staff@123)');
      await logDriveStatus();
    } catch (err) {
      console.warn('⚠️  Could not ensure default users:', (err as Error).message);
    }
  }

  app.listen(config.port, () => {
    console.log(`🚀 Komal's Makeovers API running on http://localhost:${config.port}`);
    console.log(`   API prefix: ${config.apiPrefix}`);
    console.log(`   Environment: ${config.env}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
