import React, { useEffect } from 'react'
import { Layout, Menu, Typography, Space, Badge, Tag } from 'antd'
import {
  CalculatorOutlined,
  LineChartOutlined,
  ThunderboltOutlined,
  DatabaseOutlined,
  FolderOpenOutlined,
  SettingOutlined,
  InfoCircleOutlined
} from '@ant-design/icons'
import { useAppStore } from '@/store/useAppStore'
import MainspringInputPage from '@/pages/MainspringInputPage'
import TorqueCurvePage from '@/pages/TorqueCurvePage'
import CompensationPage from '@/pages/CompensationPage'
import ArchivePage from '@/pages/ArchivePage'
import SolutionLibraryPage from '@/pages/SolutionLibraryPage'
import type { AppState } from '@/store/types'

const { Header, Sider, Content } = Layout
const { Title, Text } = Typography

interface MenuItem {
  key: AppState['currentPage']
  icon: React.ReactNode
  label: string
  badge?: number
}

const MainLayout: React.FC = () => {
  const {
    currentPage,
    setCurrentPage,
    movementRecords,
    solutionLibrary,
    torqueAnalysis,
    analyzeCurrentMainspring
  } = useAppStore()

  useEffect(() => {
    analyzeCurrentMainspring()
  }, [])

  const menuItems: MenuItem[] = [
    {
      key: 'input',
      icon: <CalculatorOutlined />,
      label: '发条录入'
    },
    {
      key: 'torque',
      icon: <LineChartOutlined />,
      label: '力矩曲线'
    },
    {
      key: 'compensation',
      icon: <ThunderboltOutlined />,
      label: '均力补偿'
    },
    {
      key: 'archive',
      icon: <DatabaseOutlined />,
      label: '动储档案',
      badge: movementRecords.length
    },
    {
      key: 'library',
      icon: <FolderOpenOutlined />,
      label: '方案库',
      badge: solutionLibrary.length
    }
  ]

  const renderContent = () => {
    switch (currentPage) {
      case 'input':
        return <MainspringInputPage />
      case 'torque':
        return <TorqueCurvePage />
      case 'compensation':
        return <CompensationPage />
      case 'archive':
        return <ArchivePage />
      case 'library':
        return <SolutionLibraryPage />
      default:
        return <MainspringInputPage />
    }
  }

  return (
    <Layout className="h-screen">
      <Header className="bg-white border-b px-6 flex items-center justify-between shadow-sm">
        <Space>
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center">
            <SettingOutlined className="text-white text-xl" />
          </div>
          <div>
            <Title level={4} className="!mb-0 !text-gray-800">
              发条动力储备分析系统
            </Title>
            <Text type="secondary" className="text-xs">
              Mainspring Power Reserve Analysis System v1.0
            </Text>
          </div>
        </Space>

        <Space size="large">
          {torqueAnalysis && (
            <Space size="small">
              <Tag color="blue">
                动储: {Math.round(torqueAnalysis.powerReserveHours)}h
              </Tag>
              <Tag
                color={
                  torqueAnalysis.torqueDropPercentage > 50 ? 'red' :
                  torqueAnalysis.torqueDropPercentage > 35 ? 'orange' : 'green'
                }
              >
                衰减: {torqueAnalysis.torqueDropPercentage.toFixed(0)}%
              </Tag>
              {torqueAnalysis.escapementImpactRisk && (
                <Badge status="error" text="力矩风险" />
              )}
              {torqueAnalysis.geometry.hasStackingRisk && (
                <Badge status="warning" text="堆叠风险" />
              )}
            </Space>
          )}
        </Space>
      </Header>

      <Layout>
        <Sider
          width={220}
          theme="light"
          className="border-r"
          breakpoint="lg"
          collapsedWidth="0"
        >
          <Menu
            mode="inline"
            selectedKeys={[currentPage]}
            onClick={({ key }) => setCurrentPage(key as AppState['currentPage'])}
            className="h-full border-r-0 pt-4"
            items={menuItems.map(item => ({
              key: item.key,
              icon: item.icon,
              label: (
                <Space className="w-full justify-between">
                  <span>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <Tag color="blue" size="small">{item.badge}</Tag>
                  )}
                </Space>
              )
            }))}
          />

          <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-gray-50">
            <div className="text-xs text-gray-500 space-y-1">
              <div className="flex items-center gap-2">
                <InfoCircleOutlined />
                <span>机械机芯设计辅助工具</span>
              </div>
              <div className="text-gray-400">
                © 2024 Watch Movement Design
              </div>
            </div>
          </div>
        </Sider>

        <Content className="overflow-auto bg-gray-50">
          {renderContent()}
        </Content>
      </Layout>
    </Layout>
  )
}

export default MainLayout
