module.exports = {
  apps: [
    {
      name: 'micromind-farmer',
      script: 'npx',
      args: 'tsx private/scripts/divine.ts',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production',
      },
      restart_delay: 10000, // Wait 10s before restart
      max_restarts: 10,
      watch: false,
      ignore_watch: ['node_modules', 'private/scripts/state'],
      error_file: './private/scripts/state/farmer-error.log',
      out_file: './private/scripts/state/farmer-out.log',
      merge_logs: true,
      autorestart: true,
    }
  ]
};
