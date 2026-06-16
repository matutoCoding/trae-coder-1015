import React, { useState } from 'react'
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Tag,
  Typography,
  Row,
  Col,
  Statistic,
  Alert,
  Divider,
  List,
  Descriptions,
  Empty,
  Popconfirm,
  message
} from 'antd'
import {
  DatabaseOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  LoadOutlined,
  ClockCircleOutlined,
  ExperimentOutlined,
  LineChartOutlined
} from '@ant-design/icons'
import { useAppStore } from '@/store/useAppStore'
import { MovementRecord } from '@/store/types'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { Option } = Select

const ArchivePage: React.FC = () => {
  const {
    movementRecords,
    torqueAnalysis,
    currentMainspring,
    addMovementRecord,
    updateMovementRecord,
    deleteMovementRecord,
    loadMovementFromArchive,
    selectedMovementId
  } = useAppStore()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<MovementRecord | null>(null)
  const [form] = Form.useForm()
  const [detailRecord, setDetailRecord] = useState<MovementRecord | null>(null)

  const handleAdd = () => {
    if (!currentMainspring || !torqueAnalysis) {
      message.warning('请先在发条录入页面计算力矩曲线')
      return
    }
    setEditingRecord(null)
    form.resetFields()
    form.setFieldsValue({
      name: '',
      model: '',
      manufacturer: '',
      caliber: '',
      measuredPowerReserve: Math.round(torqueAnalysis.powerReserveHours),
      notes: ''
    })
    setIsModalOpen(true)
  }

  const handleEdit = (record: MovementRecord) => {
    setEditingRecord(record)
    form.setFieldsValue({
      name: record.name,
      model: record.model,
      manufacturer: record.manufacturer,
      caliber: record.caliber,
      measuredPowerReserve: record.measuredPowerReserve,
      notes: record.notes
    })
    setIsModalOpen(true)
  }

  const handleSave = () => {
    form.validateFields().then((values) => {
      if (editingRecord) {
        updateMovementRecord(editingRecord.id, {
          ...values,
          measuredPowerReserve: values.measuredPowerReserve
        })
        message.success('记录更新成功')
      } else {
        if (currentMainspring && torqueAnalysis) {
          addMovementRecord({
            name: values.name,
            model: values.model,
            manufacturer: values.manufacturer,
            caliber: values.caliber,
            mainspringParams: currentMainspring,
            torqueAnalysis: torqueAnalysis,
            measuredPowerReserve: values.measuredPowerReserve,
            measuredTiming: [],
            temperatureData: [],
            notes: values.notes
          })
          message.success('记录保存成功')
        }
      }
      setIsModalOpen(false)
    })
  }

  const handleDelete = (id: string) => {
    deleteMovementRecord(id)
    message.success('记录删除成功')
    if (detailRecord?.id === id) {
      setDetailRecord(null)
    }
  }

  const handleLoad = (record: MovementRecord) => {
    loadMovementFromArchive(record.id)
    message.success(`已加载 "${record.name}" 的配置`)
  }

  const columns = [
    {
      title: '机芯名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: MovementRecord) => (
        <a onClick={() => setDetailRecord(record)} className="font-medium">
          {text}
        </a>
      )
    },
    {
      title: '型号',
      dataIndex: 'model',
      key: 'model'
    },
    {
      title: '生产商',
      dataIndex: 'manufacturer',
      key: 'manufacturer'
    },
    {
      title: '机芯编号',
      dataIndex: 'caliber',
      key: 'caliber'
    },
    {
      title: '发条材料',
      key: 'material',
      render: (_: unknown, record: MovementRecord) => record.mainspringParams.material.name
    },
    {
      title: '估算动储',
      key: 'calculatedReserve',
      render: (_: unknown, record: MovementRecord) => (
        <Space>
          <ClockCircleOutlined className="text-blue-500" />
          <span>{Math.round(record.torqueAnalysis.powerReserveHours)} h</span>
        </Space>
      )
    },
    {
      title: '实测动储',
      dataIndex: 'measuredPowerReserve',
      key: 'measuredPowerReserve',
      render: (value: number | undefined) => value ? (
        <Space>
          <ExperimentOutlined className="text-green-500" />
          <span>{value} h</span>
        </Space>
      ) : <Text type="secondary">未测试</Text>
    },
    {
      title: '力矩衰减',
      key: 'decay',
      render: (_: unknown, record: MovementRecord) => {
        const decay = record.torqueAnalysis.torqueDropPercentage
        return (
          <Tag color={decay > 50 ? 'red' : decay > 35 ? 'orange' : 'green'}>
            {decay.toFixed(1)}%
          </Tag>
        )
      }
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right' as const,
      width: 200,
      render: (_: unknown, record: MovementRecord) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<LoadOutlined />}
            onClick={() => handleLoad(record)}
          >
            加载
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除此记录？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <Title level={3} className="!mb-0">
          <DatabaseOutlined className="mr-2" />
          动力储备档案
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAdd}
          size="large"
        >
          新建档案
        </Button>
      </div>

      {movementRecords.length === 0 ? (
        <Empty
          description={
            <div className="text-center">
              <DatabaseOutlined style={{ fontSize: 48 }} className="text-gray-300 mb-4" />
              <p className="text-gray-500 mb-2">暂无机芯档案</p>
              <p className="text-gray-400 text-sm">
                在发条录入页面完成参数计算后，点击"新建档案"保存当前配置
              </p>
            </div>
          }
        />
      ) : (
        <>
          <Row gutter={[16, 16]} className="mb-4">
            <Col span={6}>
              <Statistic
                title="档案总数"
                value={movementRecords.length}
                suffix="款"
                prefix={<DatabaseOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="平均估算动储"
                value={
                  movementRecords.reduce((sum, r) => sum + r.torqueAnalysis.powerReserveHours, 0) /
                  movementRecords.length
                }
                precision={0}
                suffix="小时"
                prefix={<ClockCircleOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="有实测数据"
                value={movementRecords.filter(r => r.measuredPowerReserve).length}
                suffix="款"
                prefix={<ExperimentOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="平均力矩衰减"
                value={
                  movementRecords.reduce((sum, r) => sum + r.torqueAnalysis.torqueDropPercentage, 0) /
                  movementRecords.length
                }
                precision={1}
                suffix="%"
                prefix={<LineChartOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Col>
          </Row>

          <Card>
            <Table
              dataSource={movementRecords}
              columns={columns}
              rowKey="id"
              scroll={{ x: 1200 }}
              rowClassName={(record) =>
                record.id === selectedMovementId ? 'bg-blue-50' : ''
              }
            />
          </Card>
        </>
      )}

      {detailRecord && (
        <Card
          title={
            <Space>
              详细信息: {detailRecord.name}
              <Button
                size="small"
                onClick={() => setDetailRecord(null)}
              >
                关闭
              </Button>
            </Space>
          }
          extra={
            <Space>
              <Button icon={<LoadOutlined />} onClick={() => handleLoad(detailRecord)}>
                加载此配置
              </Button>
              <Button icon={<EditOutlined />} onClick={() => handleEdit(detailRecord)}>
                编辑
              </Button>
            </Space>
          }
        >
          <Descriptions bordered column={2}>
            <Descriptions.Item label="机芯名称">{detailRecord.name}</Descriptions.Item>
            <Descriptions.Item label="型号">{detailRecord.model || '-'}</Descriptions.Item>
            <Descriptions.Item label="生产商">{detailRecord.manufacturer || '-'}</Descriptions.Item>
            <Descriptions.Item label="机芯编号">{detailRecord.caliber || '-'}</Descriptions.Item>
            <Descriptions.Item label="发条材料">{detailRecord.mainspringParams.material.name}</Descriptions.Item>
            <Descriptions.Item label="分析温度">{20}°C</Descriptions.Item>
            <Descriptions.Item label="发条规格">
              厚 {(detailRecord.mainspringParams.thickness * 1e3).toFixed(2)} mm ×
              长 {(detailRecord.mainspringParams.length * 1e3).toFixed(1)} mm ×
              宽 {(detailRecord.mainspringParams.width * 1e3).toFixed(2)} mm
            </Descriptions.Item>
            <Descriptions.Item label="条盒规格">
              内径 {(detailRecord.mainspringParams.barrelInnerDiameter * 1e3).toFixed(2)} mm ×
              轴径 {(detailRecord.mainspringParams.arborDiameter * 1e3).toFixed(2)} mm
            </Descriptions.Item>
          </Descriptions>

          <Divider orientation="left">性能参数</Divider>
          <Row gutter={[16, 16]}>
            <Col span={6}>
              <Statistic
                title="满弦力矩"
                value={detailRecord.torqueAnalysis.maxTorque * 1000}
                precision={3}
                suffix="mN·m"
                valueStyle={{
                  color: detailRecord.torqueAnalysis.escapementImpactRisk ? '#f5222d' : '#1890ff'
                }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="末端力矩"
                value={detailRecord.torqueAnalysis.minTorque * 1000}
                precision={3}
                suffix="mN·m"
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="估算动储"
                value={Math.round(detailRecord.torqueAnalysis.powerReserveHours)}
                suffix="小时"
                valueStyle={{ color: '#722ed1' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="实测动储"
                value={detailRecord.measuredPowerReserve || 0}
                suffix="小时"
                valueStyle={{ color: detailRecord.measuredPowerReserve ? '#52c41a' : '#bfbfbf' }}
              />
            </Col>
          </Row>

          {detailRecord.torqueAnalysis.escapementImpactRisk && (
            <Alert
              message="擒纵冲击风险"
              description={detailRecord.torqueAnalysis.impactRiskDescription}
              type="error"
              showIcon
              className="mt-4"
            />
          )}

          {detailRecord.torqueAnalysis.geometry.hasStackingRisk && (
            <Alert
              message="卷绕堆叠风险"
              description={detailRecord.torqueAnalysis.geometry.stackingWarning}
              type="warning"
              showIcon
              className="mt-4"
            />
          )}

          {detailRecord.notes && (
            <>
              <Divider orientation="left">备注</Divider>
              <div className="text-gray-600 bg-gray-50 p-4 rounded">
                {detailRecord.notes}
              </div>
            </>
          )}

          {detailRecord.measuredTiming && detailRecord.measuredTiming.length > 0 && (
            <>
              <Divider orientation="left">实测走时数据</Divider>
              <List
                grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 3 }}
                dataSource={detailRecord.measuredTiming}
                renderItem={(item) => (
                  <List.Item>
                    <Card size="small">
                      <List.Item.Meta
                        title={item.position}
                        description={`${item.hours} 小时测试`}
                      />
                      <div className="text-sm mt-2 space-y-1">
                        <div className="flex justify-between">
                          <Text type="secondary">日差:</Text>
                          <Text
                            strong
                            className={
                              Math.abs(item.rate) < 5 ? 'text-green-500' :
                              Math.abs(item.rate) < 10 ? 'text-yellow-500' : 'text-red-500'
                            }
                          >
                            {item.rate > 0 ? '+' : ''}{item.rate.toFixed(1)} s/d
                          </Text>
                        </div>
                        <div className="flex justify-between">
                          <Text type="secondary">摆幅:</Text>
                          <Text strong>{item.amplitude}°</Text>
                        </div>
                        <div className="flex justify-between">
                          <Text type="secondary">偏振:</Text>
                          <Text
                            strong
                            className={item.beatError < 0.5 ? 'text-green-500' : 'text-yellow-500'}
                          >
                            {item.beatError.toFixed(2)} ms
                          </Text>
                        </div>
                      </div>
                    </Card>
                  </List.Item>
                )}
              />
            </>
          )}

          {detailRecord.temperatureData && detailRecord.temperatureData.length > 0 && (
            <>
              <Divider orientation="left">温度特性数据</Divider>
              <List
                grid={{ gutter: 16, xs: 1, sm: 2, md: 4, lg: 4 }}
                dataSource={detailRecord.temperatureData}
                renderItem={(item) => (
                  <List.Item>
                    <Card size="small">
                      <List.Item.Meta
                        title={`${item.temperature}°C`}
                      />
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <Text type="secondary">动储:</Text>
                          <Text strong>{item.measuredReserve} h</Text>
                        </div>
                        <div className="flex justify-between">
                          <Text type="secondary">日差:</Text>
                          <Text
                            strong
                            className={
                              Math.abs(item.measuredRate) < 5 ? 'text-green-500' :
                              Math.abs(item.measuredRate) < 10 ? 'text-yellow-500' : 'text-red-500'
                            }
                          >
                            {item.measuredRate > 0 ? '+' : ''}{item.measuredRate.toFixed(1)} s/d
                          </Text>
                        </div>
                      </div>
                    </Card>
                  </List.Item>
                )}
              />
            </>
          )}

          <Divider orientation="left">档案信息</Divider>
          <div className="text-sm text-gray-500">
            <p>创建时间: {dayjs(detailRecord.createdAt).format('YYYY-MM-DD HH:mm:ss')}</p>
            <p>更新时间: {dayjs(detailRecord.updatedAt).format('YYYY-MM-DD HH:mm:ss')}</p>
          </div>
        </Card>
      )}

      <Modal
        title={editingRecord ? '编辑机芯档案' : '新建机芯档案'}
        open={isModalOpen}
        onOk={handleSave}
        onCancel={() => setIsModalOpen(false)}
        width={600}
        okText="保存"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="机芯名称"
                name="name"
                rules={[{ required: true, message: '请输入机芯名称' }]}
              >
                <Input placeholder="例如：自动三针机芯" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="型号" name="model">
                <Input placeholder="例如：Cal. 3235" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="生产商" name="manufacturer">
                <Input placeholder="例如：Rolex" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="机芯编号" name="caliber">
                <Input placeholder="例如：No. 123456" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            label="实测动力储备"
            name="measuredPowerReserve"
            extra="如果已进行实际测试，请输入实测值"
          >
            <InputNumber min={1} max={1000} addonAfter="小时" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="备注" name="notes">
            <Input.TextArea
              rows={4}
              placeholder="记录测试条件、特殊说明等..."
            />
          </Form.Item>

          {currentMainspring && torqueAnalysis && (
            <Alert
              message="将保存以下配置"
              description={
                <div className="text-xs">
                  <p>发条: {(currentMainspring.thickness * 1e3).toFixed(2)}mm × {(currentMainspring.length * 1e3).toFixed(1)}mm × {(currentMainspring.width * 1e3).toFixed(2)}mm</p>
                  <p>条盒: 内径 {(currentMainspring.barrelInnerDiameter * 1e3).toFixed(2)}mm, 轴径 {(currentMainspring.arborDiameter * 1e3).toFixed(2)}mm</p>
                  <p>材料: {currentMainspring.material.name}</p>
                  <p>估算动储: {Math.round(torqueAnalysis.powerReserveHours)} 小时</p>
                </div>
              }
              type="info"
              showIcon
            />
          )}
        </Form>
      </Modal>
    </div>
  )
}

export default ArchivePage
