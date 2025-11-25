module.exports = {
  apps: [{
    name: 'groomypaws',
    script: './src/index.js',
    cwd: '/home/groomypaws/public_html/groomy-paws/server',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3002
    },
    // Load .env file from server directory
    env_file: '/home/groomypaws/public_html/groomy-paws/server/.env',
    // Alternative: explicitly set dotenv path
    node_args: '-r dotenv/config',
    error_file: '/home/groomypaws/.pm2/logs/groomypaws-error.log',
    out_file: '/home/groomypaws/.pm2/logs/groomypaws-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};
