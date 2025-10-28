/**
 * PM2 Ecosystem Configuration for Neo4j Communication
 *
 * This configuration file defines how PM2 should run the Neo4j Communication frontend
 * in production mode. It includes settings for auto-restart, logging,
 * and environment variables.
 *
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 start ecosystem.config.js --env production
 *   pm2 reload ecosystem.config.js
 *   pm2 delete ecosystem.config.js
 */

module.exports = {
  apps: [
    {
      name: 'neo4j-communication-frontend',
      script: 'npm',
      args: 'start',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',

      // Auto-restart configuration
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',

      // Restart delay and attempts
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,

      // Logging
      error_file: '~/.pm2/logs/neo4j-communication-frontend-error.log',
      out_file: '~/.pm2/logs/neo4j-communication-frontend-out.log',
      log_file: '~/.pm2/logs/neo4j-communication-frontend-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Environment variables
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },

      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
