import { defineConfig } from 'vite'
import path from "path"
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // 目标地址
        changeOrigin: true, // 开启代理，改变请求的 origin 头信息
        rewrite: (path) => path.replace(/^\/api/, '') // 路径重写，移除路径中的 /api
      },
    }
  }
})
