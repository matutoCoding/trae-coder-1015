import React, { useState } from 'react'
import {
  Card,
  Row,
  Col,
  Tag,
  Button,
  Space,
  Typography,
  Statistic,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Divider,
  Alert,
  Empty,
  Popconfirm,
  message,
  Descriptions,
  Tabs,
  Tooltip
} from 'antd'
import {
  FolderOpenOutlined,
  PlusOutlined,
  LoadOutlined,
  EditOutlined,
  DeleteOutlined,
  ExportOutlined,
  ImportOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  InfoCircleOutlined
} from '@ant-design/icons'
import { useAppStore } from '@/store/useAppStore'
import { SolutionLibraryItem } from '@/store/types'
import { MATERIALS } from '@/utils/mainspringPhysics'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { Option } = Select

const SolutionLibraryPage: React.FC = () => {
  const {
    solutionLibrary,
    loadSolutionFromLibrary,
    addSolutionItem,
    updateSolutionItem,
    deleteSolutionItem,
    exportSolutionToJson,
    importSolutionFromJson,
    selectedSolutionId,
    torqueAnalysis,
    currentMainspring
  } = useAppStore()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSolution, setEditingSolution] = useState<SolutionLibraryItem | null>(null)
  const [form] = Form.useForm()
  const [detailSolution, setDetailSolution] = useState<SolutionLibraryItem | null>(null)
  const [activeTab, setActiveTab] = useState('all')

  const categories = [
    { key: 'all', label: '全部', color: 'default' },
    { key: 'standard', label: '标准动储 (36-48h)', color: 'blue' },
    { key: 'long', label: '长动力 (72-100h)', color: 'green' },
    { key: 'ultra-long', label: '超长动力 (120h+)', color: 'purple' },
    { key: 'special', label: '特殊配置', color: 'orange' }
  ]

  const filteredSolutions = solutionLibrary.filter(
    s => activeTab === 'all' || s.category === activeTab
  )

  const handleAdd = () => {
    if (!torqueAnalysis) {
      message.warning('请先在发条录入页面计算力矩曲线')
      return
    }
    setEditingSolution(null)
    form.resetFields()
    form.setFieldsValue({
      name: '',
      category: 'standard',
      powerReserveLevel: `${Math.round(torqueAnalysis.powerReserveHours)}h`,
      targetPowerReserve: Math.round(torqueAnalysis.powerReserveHours),
      material: 'Nivaflex',
      recommendedMovements: '',
      notes: ''
    })
    setIsModalOpen(true)
  }

  const handleEdit = (solution: SolutionLibraryItem) => {
    setEditingSolution(solution)
    form.setFieldsValue({
      name: solution.name,
      category: solution.category,
      powerReserveLevel: solution.powerReserveLevel,
      targetPowerReserve: solution.targetPowerReserve,
      material: solution.material,
      recommendedMovements: solution.recommendedMovements.join(', '),
      notes: solution.notes
    })
    setIsModalOpen(true)
  }

  const handleSave = () => {
    form.validateFields().then((values) => {
      const movementList = values.recommendedMovements
        ? values.recommendedMovements.split(',').map((s: string) => s.trim()).filter(Boolean)
        : []

      if (editingSolution) {
        updateSolutionItem(editingSolution.id, {
          ...values,
          recommendedMovements: movementList
        })
        message.success('方案更新成功')
      } else {
        if (torqueAnalysis && currentMainspring) {
          addSolutionItem({
            name: values.name,
            category: values.category,
            powerReserveLevel: values.powerReserveLevel,
            targetPowerReserve: values.targetPowerReserve,
            mainspringParams: currentMainspring,
            expectedPerformance: {
              maxTorque: torqueAnalysis.maxTorque,
              minTorque: torqueAnalysis.minTorque,
              averageTorque: torqueAnalysis.averageTorque,
              torqueDropPercentage: torqueAnalysis.torqueDropPercentage,
              powerReserveHours: torqueAnalysis.powerReserveHours
            },
            barrelSpecs: {
              innerDiameter: currentMainspring.barrelInnerDiameter,
              arborDiameter: currentMainspring.arborDiameter,
              width: currentMainspring.width
            },
            recommendedMovements: movementList,
            material: values.material,
            notes: values.notes,
            isCustom: true
          })
          message.success('方案添加成功')
        }
      }
      setIsModalOpen(false)
    })
  }

  const handleDelete = (id: string) => {
    deleteSolutionItem(id)
    message.success('方案删除成功')
    if (detailSolution?.id === id) {
      setDetailSolution(null)
    }
  }

  const handleLoad = (solution: SolutionLibraryItem) => {
    loadSolutionFromLibrary(solution.id)
    message.success(`已加载方案: ${solution.name}`)
  }

  const handleExport = async (solution: SolutionLibraryItem) => {
    const result = await exportSolutionToJson(solution.id)
    if (result.success && result.filePath) {
      message.success(`方案已导出: ${result.filePath}`)
    } else if (result.error) {
      message.error('导出失败: ' + result.error)
    }
  }

  const validateSolutionData = (data: unknown): { valid: boolean; error?: string } => {
    const isFiniteNumber = (v: unknown): v is number =>
      typeof v === 'number' && !Number.isNaN(v) && Number.isFinite(v)
    const isNonEmptyString = (v: unknown): v is string =>
      typeof v === 'string' && v.trim().length > 0

    if (!data || typeof data !== 'object') {
      return { valid: false, error: '文件内容不是有效的 JSON 对象' }
    }
    const obj = data as Record<string, unknown>

    if (!isNonEmptyString(obj.name)) {
      return { valid: false, error: '字段 name 必须是非空字符串' }
    }
    if (!isNonEmptyString(obj.category)) {
      return { valid: false, error: '字段 category 必须是非空字符串' }
    }

    const requiredTop = ['mainspringParams', 'expectedPerformance', 'barrelSpecs']
    for (const k of requiredTop) {
      if (!(k in obj) || obj[k] === null || typeof obj[k] !== 'object') {
        return { valid: false, error: `缺少必需对象字段: ${k}` }
      }
    }

    const mp = obj.mainspringParams as Record<string, unknown>
    const requiredMpNumbers = [
      { key: 'thickness', min: 1e-6, max: 0.01 },
      { key: 'length', min: 1e-3, max: 5 },
      { key: 'width', min: 1e-4, max: 0.1 },
      { key: 'barrelInnerDiameter', min: 1e-3, max: 0.1 },
      { key: 'arborDiameter', min: 1e-4, max: 0.05 }
    ]
    for (const { key, min, max } of requiredMpNumbers) {
      const v = mp[key]
      if (!isFiniteNumber(v)) {
        return { valid: false, error: `发条参数 ${key} 必须是有效数值（当前为 ${typeof v}）` }
      }
      if (v <= min || v >= max) {
        return { valid: false, error: `发条参数 ${key} = ${v} 超出合理范围` }
      }
    }
    if (!mp.material || typeof mp.material !== 'object') {
      return { valid: false, error: '发条参数缺少 material 信息' }
    }
    const mat = mp.material as Record<string, unknown>
    if (!isNonEmptyString(mat.name)) {
      return { valid: false, error: '发条 material.name 必须是非空字符串' }
    }

    const ep = obj.expectedPerformance as Record<string, unknown>
    const requiredEpNumbers = [
      { key: 'maxTorque', min: 0, max: 1000 },
      { key: 'minTorque', min: 0, max: 1000 },
      { key: 'averageTorque', min: 0, max: 1000 },
      { key: 'torqueDropPercentage', min: 0, max: 100 },
      { key: 'powerReserveHours', min: 1, max: 5000 }
    ]
    for (const { key, min, max } of requiredEpNumbers) {
      const v = ep[key]
      if (!isFiniteNumber(v)) {
        return { valid: false, error: `性能参数 ${key} 必须是有效数值（当前为 ${typeof v}）` }
      }
      if (v < min || v > max) {
        return { valid: false, error: `性能参数 ${key} = ${v} 超出合理范围` }
      }
    }

    const bs = obj.barrelSpecs as Record<string, unknown>
    const requiredBsNumbers = [
      { key: 'innerDiameter', min: 1e-3, max: 0.1 },
      { key: 'arborDiameter', min: 1e-4, max: 0.05 },
      { key: 'width', min: 1e-4, max: 0.1 }
    ]
    for (const { key, min, max } of requiredBsNumbers) {
      const v = bs[key]
      if (!isFiniteNumber(v)) {
        return { valid: false, error: `条盒参数 ${key} 必须是有效数值（当前为 ${typeof v}）` }
      }
      if (v < min || v > max) {
        return { valid: false, error: `条盒参数 ${key} = ${v} 超出合理范围` }
      }
    }

    return { valid: true }
  }

  const handleImport = async () => {
    const doImport = (data: unknown) => {
      const validation = validateSolutionData(data)
      if (!validation.valid) {
        message.error('导入失败: ' + validation.error)
        return
      }
      const result = importSolutionFromJson(data)
      if (result.success) {
        message.success('方案导入成功')
      } else {
        message.error('导入失败: ' + (result.error || '未知错误'))
      }
    }

    if (window.electronAPI) {
      const filePath = await window.electronAPI.showOpenDialog()
      if (filePath) {
        const loadResult = await window.electronAPI.loadJson(filePath)
        if (loadResult.success && loadResult.data) {
          doImport(loadResult.data)
        } else {
          message.error('导入失败: ' + loadResult.error)
        }
      }
    } else {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json'
      input.onchange = (e: Event) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (file) {
          const reader = new FileReader()
          reader.onload = (event) => {
            try {
              const data = JSON.parse(event.target?.result as string)
              doImport(data)
            } catch {
              message.error('文件格式错误，请检查 JSON 语法')
            }
          }
          reader.readAsText(file)
        }
      }
      input.click()
    }
  }

  const getCategoryTag = (category: string) => {
    const cat = categories.find(c => c.key === category)
    return <Tag color={cat?.color as any}>{cat?.label || category}</Tag>
  }

  const formatThickness = (v: number) => (v * 1e3).toFixed(2)
  const formatLength = (v: number) => (v * 1e3).toFixed(1)
  const formatDiameter = (v: number) => (v * 1e3).toFixed(2)

  const renderSolutionCard = (solution: SolutionLibraryItem) => (
    <Card
      key={solution.id}
      size="small"
      className={`h-full cursor-pointer transition-all hover:shadow-lg ${
        solution.id === selectedSolutionId ? 'ring-2 ring-blue-500' : ''
      }`}
      onClick={() => setDetailSolution(solution)}
      extra={
        <Space size="small">
          {solution.isCustom && <Tag color="gold">自定义</Tag>}
          {getCategoryTag(solution.category)}
        </Space>
      }
      title={
        <Space>
          <FolderOpenOutlined className="text-blue-500" />
          <span className="font-medium">{solution.name}</span>
        </Space>
      }
    >
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <Text type="secondary">目标动储:</Text>
          <Text strong className="text-blue-600">
            <ClockCircleOutlined className="mr-1" />
            {solution.targetPowerReserve} 小时
          </Text>
        </div>
        <div className="flex justify-between text-sm">
          <Text type="secondary">发条规格:</Text>
          <Text strong>
            {formatThickness(solution.mainspringParams.thickness)}×
            {formatLength(solution.mainspringParams.length)}×
            {formatDiameter(solution.mainspringParams.width)} mm
          </Text>
        </div>
        <div className="flex justify-between text-sm">
          <Text type="secondary">条盒内径:</Text>
          <Text strong>{formatDiameter(solution.barrelSpecs.innerDiameter)} mm</Text>
        </div>
        <div className="flex justify-between text-sm">
          <Text type="secondary">材料:</Text>
          <Text strong>{solution.material}</Text>
        </div>
        <div className="flex justify-between text-sm">
          <Text type="secondary">力矩衰减:</Text>
          <Text
            strong
            className={
              solution.expectedPerformance.torqueDropPercentage > 50 ? 'text-red-500' :
              solution.expectedPerformance.torqueDropPercentage > 35 ? 'text-yellow-500' : 'text-green-500'
            }
          >
            {solution.expectedPerformance.torqueDropPercentage.toFixed(1)}%
          </Text>
        </div>

        <Divider className="my-2" />

        <Space className="w-full" size="small">
          <Button
            size="small"
            type="primary"
            icon={<LoadOutlined />}
            onClick={(e) => {
              e.stopPropagation()
              handleLoad(solution)
            }}
            block
          >
            加载
          </Button>
          {solution.isCustom && (
            <>
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={(e) => {
                  e.stopPropagation()
                  handleEdit(solution)
                }}
              >
                编辑
              </Button>
              <Popconfirm
                title="确定删除此方案？"
                onConfirm={(e) => {
                  e?.stopPropagation()
                  handleDelete(solution.id)
                }}
                okText="确定"
                cancelText="取消"
              >
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={(e) => e.stopPropagation()}
                >
                  删除
                </Button>
              </Popconfirm>
            </>
          )}
          <Button
            size="small"
            icon={<ExportOutlined />}
            onClick={(e) => {
              e.stopPropagation()
              handleExport(solution)
            }}
          >
            导出
          </Button>
        </Space>
      </div>
    </Card>
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <Title level={3} className="!mb-0">
          <DatabaseOutlined className="mr-2" />
          发条配置方案库
        </Title>
        <Space>
          <Button
            icon={<ImportOutlined />}
            onClick={handleImport}
            size="large"
          >
            导入方案
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            size="large"
          >
            新建方案
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]} className="mb-4">
        <Col span={6}>
          <Statistic
            title="方案总数"
            value={solutionLibrary.length}
            suffix="套"
            prefix={<FolderOpenOutlined />}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="标准动储"
            value={solutionLibrary.filter(s => s.category === 'standard').length}
            suffix="套"
            valueStyle={{ color: '#1890ff' }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="长动力方案"
            value={solutionLibrary.filter(s => s.category === 'long' || s.category === 'ultra-long').length}
            suffix="套"
            valueStyle={{ color: '#52c41a' }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="自定义方案"
            value={solutionLibrary.filter(s => s.isCustom).length}
            suffix="套"
            valueStyle={{ color: '#faad14' }}
          />
        </Col>
      </Row>

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={categories.map(cat => ({
            key: cat.key,
            label: (
              <Space>
                {cat.label}
                <Tag color={cat.color as any}>
                  {cat.key === 'all'
                    ? solutionLibrary.length
                    : solutionLibrary.filter(s => s.category === cat.key).length}
                </Tag>
              </Space>
            )
          }))}
        />

        {filteredSolutions.length === 0 ? (
          <Empty
            description={
              <div className="text-center py-8">
                <FolderOpenOutlined style={{ fontSize: 48 }} className="text-gray-300 mb-4" />
                <p className="text-gray-500">暂无此类方案</p>
              </div>
            }
          />
        ) : (
          <Row gutter={[16, 16]}>
            {filteredSolutions.map(solution => (
              <Col xs={24} sm={12} md={8} lg={6} key={solution.id}>
                {renderSolutionCard(solution)}
              </Col>
            ))}
          </Row>
        )}
      </Card>

      {detailSolution && (
        <Card
          title={
            <Space>
              方案详情: {detailSolution.name}
              <Button size="small" onClick={() => setDetailSolution(null)}>
                关闭
              </Button>
            </Space>
          }
          extra={
            <Space>
              <Button icon={<LoadOutlined />} onClick={() => handleLoad(detailSolution)}>
                加载此方案
              </Button>
              {detailSolution.isCustom && (
                <Button icon={<EditOutlined />} onClick={() => handleEdit(detailSolution)}>
                  编辑
                </Button>
              )}
              <Button icon={<ExportOutlined />} onClick={() => handleExport(detailSolution)}>
                导出
              </Button>
            </Space>
          }
        >
          <Descriptions bordered column={2}>
            <Descriptions.Item label="方案名称">{detailSolution.name}</Descriptions.Item>
            <Descriptions.Item label="动储等级">
              {getCategoryTag(detailSolution.category)}
              <Tag color="blue">{detailSolution.powerReserveLevel}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="发条材料">{detailSolution.material}</Descriptions.Item>
            <Descriptions.Item label="目标动力储备">{detailSolution.targetPowerReserve} 小时</Descriptions.Item>
          </Descriptions>

          <Divider orientation="left">发条规格</Divider>
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <Statistic
                title="料厚"
                value={formatThickness(detailSolution.mainspringParams.thickness)}
                suffix="mm"
                precision={0}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="长度"
                value={formatLength(detailSolution.mainspringParams.length)}
                suffix="mm"
                precision={0}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="宽度"
                value={formatDiameter(detailSolution.mainspringParams.width)}
                suffix="mm"
                precision={0}
              />
            </Col>
          </Row>

          <Divider orientation="left">条盒规格</Divider>
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <Statistic
                title="条盒内径"
                value={formatDiameter(detailSolution.barrelSpecs.innerDiameter)}
                suffix="mm"
                precision={0}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="条轴直径"
                value={formatDiameter(detailSolution.barrelSpecs.arborDiameter)}
                suffix="mm"
                precision={0}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="条盒宽度"
                value={formatDiameter(detailSolution.barrelSpecs.width)}
                suffix="mm"
                precision={0}
              />
            </Col>
          </Row>

          <Divider orientation="left">预期性能</Divider>
          <Row gutter={[16, 16]}>
            <Col span={6}>
              <Statistic
                title="满弦力矩"
                value={detailSolution.expectedPerformance.maxTorque * 1000}
                precision={2}
                suffix="mN·m"
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="末端力矩"
                value={detailSolution.expectedPerformance.minTorque * 1000}
                precision={2}
                suffix="mN·m"
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="平均力矩"
                value={detailSolution.expectedPerformance.averageTorque * 1000}
                precision={2}
                suffix="mN·m"
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="力矩衰减"
                value={detailSolution.expectedPerformance.torqueDropPercentage}
                precision={1}
                suffix="%"
                valueStyle={{
                  color: detailSolution.expectedPerformance.torqueDropPercentage > 50 ? '#f5222d' :
                         detailSolution.expectedPerformance.torqueDropPercentage > 35 ? '#faad14' : '#52c41a'
                }}
              />
            </Col>
          </Row>

          {detailSolution.recommendedMovements.length > 0 && (
            <>
              <Divider orientation="left">推荐适用机芯</Divider>
              <div className="flex flex-wrap gap-2">
                {detailSolution.recommendedMovements.map((movement, idx) => (
                  <Tag key={idx} color="blue" className="text-sm px-3 py-1">
                    {movement}
                  </Tag>
                ))}
              </div>
            </>
          )}

          {detailSolution.notes && (
            <>
              <Divider orientation="left">备注说明</Divider>
              <div className="text-gray-600 bg-gray-50 p-4 rounded">
                {detailSolution.notes}
              </div>
            </>
          )}

          <Divider orientation="left">方案信息</Divider>
          <div className="text-sm text-gray-500">
            <Row gutter={16}>
              <Col span={12}>
                创建时间: {dayjs(detailSolution.createdAt).format('YYYY-MM-DD HH:mm:ss')}
              </Col>
              <Col span={12}>
                更新时间: {dayjs(detailSolution.updatedAt).format('YYYY-MM-DD HH:mm:ss')}
              </Col>
            </Row>
          </div>
        </Card>
      )}

      <Card title="方案库使用说明" type="inner">
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Alert
              message="预设方案"
              description={
                <ul className="text-sm text-gray-600 space-y-1 mt-2">
                  <li>• 系统预置了5套经典发条配置方案</li>
                  <li>• 涵盖标准动储到月相动力等多种规格</li>
                  <li>• 预设方案不可删除，但可加载后修改另存</li>
                  <li>• 所有参数均经过理论验证，可直接参考使用</li>
                </ul>
              }
              type="info"
              showIcon
            />
          </Col>
          <Col span={12}>
            <Alert
              message="自定义方案"
              description={
                <ul className="text-sm text-gray-600 space-y-1 mt-2">
                  <li>• 在发条录入页面完成计算后可保存为新方案</li>
                  <li>• 支持方案的导入导出，便于团队共享</li>
                  <li>• 可记录适用机芯型号和设计备注</li>
                  <li>• 建议按动储等级分类管理方案</li>
                </ul>
              }
              type="success"
              showIcon
            />
          </Col>
        </Row>
      </Card>

      <Modal
        title={editingSolution ? '编辑方案' : '新建方案'}
        open={isModalOpen}
        onOk={handleSave}
        onCancel={() => setIsModalOpen(false)}
        width={600}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="方案名称"
            name="name"
            rules={[{ required: true, message: '请输入方案名称' }]}
          >
            <Input placeholder="例如：三针自动机芯标准配置" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="方案分类"
                name="category"
                rules={[{ required: true, message: '请选择分类' }]}
              >
                <Select>
                  <Option value="standard">标准动储 (36-48小时)</Option>
                  <Option value="long">长动力 (72-100小时)</Option>
                  <Option value="ultra-long">超长动力 (120小时以上)</Option>
                  <Option value="special">特殊配置</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="动储等级标识"
                name="powerReserveLevel"
                rules={[{ required: true, message: '请输入动储等级' }]}
              >
                <Input placeholder="例如：72h、120h、7d" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label={
                  <Space>
                    目标动力储备
                    <Tooltip title="设计目标的动力储备时长">
                      <InfoCircleOutlined className="text-gray-400" />
                    </Tooltip>
                  </Space>
                }
                name="targetPowerReserve"
                rules={[{ required: true, message: '请输入目标动储' }]}
              >
                <InputNumber min={24} max={1000} addonAfter="小时" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="发条材料"
                name="material"
                rules={[{ required: true, message: '请选择材料' }]}
              >
                <Select>
                  {Object.entries(MATERIALS).map(([key, mat]) => (
                    <Option key={key} value={key}>{mat.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="适用机芯型号"
            name="recommendedMovements"
            extra="多个型号用逗号分隔"
          >
            <Input placeholder="例如：ETA 2824-2, SW 200" />
          </Form.Item>

          <Form.Item label="备注说明" name="notes">
            <Input.TextArea
              rows={3}
              placeholder="记录设计思路、特殊说明、适用场景等..."
            />
          </Form.Item>

          {currentMainspring && torqueAnalysis && (
            <Alert
              message={
                <Space>
                  将保存当前发条配置
                  {torqueAnalysis.geometry.hasStackingRisk && (
                    <Tag color="warning" style={{ marginLeft: 8 }}>
                      注意：当前配置存在堆叠风险
                    </Tag>
                  )}
                </Space>
              }
              description={
                <div className="text-xs">
                  <p>
                    发条: {formatThickness(currentMainspring.thickness)}mm × {formatLength(currentMainspring.length)}mm × {formatDiameter(currentMainspring.width)}mm
                  </p>
                  <p>
                    条盒: 内径 {formatDiameter(currentMainspring.barrelInnerDiameter)}mm, 轴径 {formatDiameter(currentMainspring.arborDiameter)}mm
                  </p>
                  <p>
                    材料: {currentMainspring.material.name}
                  </p>
                  <p>
                    估算动储: {Math.round(torqueAnalysis.powerReserveHours)} 小时
                    {torqueAnalysis.geometry.hasStackingRisk && (
                      <span className="text-orange-600 ml-2">
                        （注：因堆叠风险实际可用动储可能缩短）
                      </span>
                    )}
                  </p>
                </div>
              }
              type={torqueAnalysis.geometry.hasStackingRisk ? 'warning' : 'info'}
              showIcon
            />
          )}
        </Form>
      </Modal>
    </div>
  )
}

export default SolutionLibraryPage
