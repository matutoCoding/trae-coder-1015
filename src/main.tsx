import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider, App as AntdApp } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import 'antd/dist/reset.css'
import './index.css'
import MainLayout from './components/MainLayout'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 6,
          fontSize: 14,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        },
        components: {
          Layout: {
            headerBg: '#ffffff',
            siderBg: '#ffffff'
          }
        }
      }}
    >
      <AntdApp>
        <MainLayout />
      </AntdApp>
    </ConfigProvider>
  </React.StrictMode>
)
