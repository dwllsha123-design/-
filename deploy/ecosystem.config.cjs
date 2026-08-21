module.exports = {
  apps: [
    {
      name: 'dar-api',
      cwd: './backend',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '450M',
      node_args: '--max-old-space-size=384',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
