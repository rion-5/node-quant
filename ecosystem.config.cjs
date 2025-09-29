// ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'node-quant',
      // PM2가 실행할 명령어를 직접 지정합니다.
      script: 'npm', 
      args: 'run start', // 'npm' 뒤에 오는 인수로 'run start'를 전달합니다.
      // interpreter는 필요 없거나 'node'로 설정해도 됩니다.
      
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