// ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'node-quant',
      // script: 'build/index.js', // 또는 'build', 아래 참고
      // cwd: './', // 프로젝트 루트 기준
      // interpreter: 'node',
      script: 'start',
      interpreter: 'npm',
      env: {
        NODE_ENV: 'development',
        PORT: 5173
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
