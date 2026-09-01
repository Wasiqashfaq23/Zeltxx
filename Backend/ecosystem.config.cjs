// PM2 app file for the Zeltxx backend.
// On the VPS, from /var/www/zeltxx/backend:
//   pm2 start ecosystem.config.cjs --env production
//   pm2 save && pm2 startup
//
// Fork mode on purpose: Socket.IO presence/rooms and the rate limiter live in
// process memory, so a single instance is required for correctness. The deploy
// workflow restarts this process as `zeltxx-backend`.
module.exports = {
  apps: [
    {
      name: 'zeltxx-backend',
      script: 'index.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
}