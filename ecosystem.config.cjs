module.exports = {
  apps: [
    {
      name: 'provision-server',
      script: 'server/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      watch: false,
      instances: 1,
      autorestart: true,
    },
    {
      name: 'provision-flipp-refresh',
      script: 'server/connectors/flipp.js',
      cron_restart: '0 13 * * *',
      autorestart: false,
      watch: false,
    },
    {
      name: 'chicagoland-sweep',
      script: 'server/jobs/chicagoland-sweep.js',
      cron_restart: '0 6,14 * * *', // 6 AM + 2 PM CST
      watch: false,
      autorestart: false,
      env: { NODE_ENV: 'production', TZ: 'America/Chicago' },
    },
  ],
};
