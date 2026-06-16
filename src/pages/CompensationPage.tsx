import React, { useState, useMemo } from 'react'
import {
  Card,
  Row,
  Col,
  Form,
  InputNumber,
  Slider,
  Statistic,
  Alert,
  Typography,
  Space,
  Button,
  Divider,
  Tag,
  Switch,
  Radio,
  Tooltip
} from 'antd'
import {
  ThunderboltOutlined,
  ExperimentOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  LineChartOutlined,
  DownloadOutlined
} from '@ant-design/icons'
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine
} from 'recharts'
import { useAppStore } from '@/store/useAppStore'
import {
  calculateFuseeCompensation,
  FuseeParams,
  CompensationResult
} from '@/utils/mainspringPhysics'

const { Title, Text } = Typography
const { Group: RadioGroup, Button: RadioButton } = Radio

const CompensationPage: React.FC = () => {
  const { torqueAnalysis, currentMainspring, compensationResult, setCompensationResult, clearCompensationResult, analysisTemperature } = useAppStore()
  const [form] = Form.useForm()
  const [compensationType, setCompensationType] = useState<'fusee' | 'constantForce' | 'remontoire'>('fusee')
  const [showOriginal, setShowOriginal] = useState(true)
  const [showCompensated, setShowCompensated] = useState(true)
  const [lastCalcSignature, setLastCalcSignature] = useState<string | null>(null)

  const currentSignature = useMemo(() => {
    if (!currentMainspring) return null
    return [
      currentMainspring.thickness,
      currentMainspring.length,
      currentMainspring.width,
      currentMainspring.barrelInnerDiameter,
      currentMainspring.arborDiameter,
      currentMainspring.material.name,
      analysisTemperature
    ].join('|')
  }, [currentMainspring, analysisTemperature])

  const isStale = compensationResult !== null && lastCalcSignature !== null && lastCalcSignature !== currentSignature

  const handleCalculate = () => {
    if (!torqueAnalysis) return

    const values = form.getFieldsValue()
    const params: FuseeParams = {
      type: compensationType,
      stages: values.stages || 6,
      minRadius: values.minRadius * 1e-3,
      maxRadius: values.maxRadius * 1e-3,
      transmissionRatio: values.transmissionRatio || 1.0
    }

    const result = calculateFuseeCompensation(torqueAnalysis, params)
    setCompensationResult(result)
    setLastCalcSignature(currentSignature)
  }

  const handleClear = () => {
    clearCompensationResult()
    setLastCalcSignature(null)
  }

  const chartData = useMemo(() => {
    if (!compensationResult) return []

    return compensationResult.originalCurve.map((point, index) => {
      const progress = (index / (compensationResult.originalCurve.length - 1)) * 100
      const compensatedPoint = compensationResult.compensatedCurve[index]
      return {
        progress,
        originalTorque: point.torque * 1000,
        compensatedTorque: compensatedPoint ? compensatedPoint.torque * 1000 : null,
        turns: point.turns,
        isWarningZone: point.isWarningZone,
        isDangerZone: point.isDangerZone
      }
    })
  }, [compensationResult])

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ payload: any }>; label?: number }) => {
    if (active && payload && payload.length && label !== undefined) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-bold text-sm mb-1">放电进度: {label.toFixed(1)}%</p>
          <p className="text-sm text-blue-600">
            原始力矩: {data.originalTorque.toFixed(3)} mN·m
          </p>
          {data.compensatedTorque && (
            <p className="text-sm text-green-600">
              补偿后力矩: {data.compensatedTorque.toFixed(3)} mN·m
            </p>
          )}
          {data.compensatedTorque && (
            <p className="text-sm text-purple-600">
              改善幅度: {(((data.compensatedTorque - data.originalTorque) / data.originalTorque) * 100).toFixed(1)}%
            </p>
          )}
          <p className="text-sm text-gray-500">已放圈数: {data.turns.toFixed(1)} 圈</p>
        </div>
      )
    }
    return null
  }

  const exportComparisonData = () => {
    if (!compensationResult) return
    const csvContent = [
      ['进度(%)', '原始力矩(mN·m)', '补偿后力矩(mN·m)', '改善率(%)'].join(','),
      ...chartData.map(d => [
        d.progress.toFixed(2),
        d.originalTorque.toFixed(4),
        d.compensatedTorque ? d.compensatedTorque.toFixed(4) : '',
        d.compensatedTorque ? (((d.compensatedTorque - d.originalTorque) / d.originalTorque) * 100).toFixed(2) : ''
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `均力补偿对比_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
  }

  const getCompensationTypeName = (type: string) => {
    switch (type) {
      case 'fusee': return '宝塔轮 (Fusee)'
      case 'constantForce': return '均力轮 (Constant Force)'
      case 'remontoire': return '定力矩装置 (Remontoire)'
      default: return type
    }
  }

  return (
    <div className="p-6 space-y-6">
      <Space className="w-full justify-between" align="center">
        <Title level={3} className="!mb-0">
          <ThunderboltOutlined className="mr-2" />
          均力装置补偿分析
        </Title>

        <Space size="small">
          <Tag
            color="cyan"
            bordered
            style={{
              backgroundColor: analysisTemperature === 0 ? '#fff1f0' : undefined,
              borderColor: analysisTemperature < 0 ? '#ff4d4f' : analysisTemperature === 0 ? '#faad14' : undefined,
              color: analysisTemperature < 0 ? '#cf1322' : analysisTemperature === 0 ? '#d48806' : undefined
            }}
          >
            当前分析温度: {analysisTemperature}°C
          </Tag>
          {compensationResult && lastCalcSignature && (
            <>
              <Divider type="vertical" />
              {isStale ? (
                <Tag color="warning">上次计算温度: 已过期（与当前温度不一致）</Tag>
              ) : (
                <Tag color="green">结果温度匹配: {analysisTemperature}°C ✓</Tag>
              )}
            </>
          )}
        </Space>
      </Space>

      {isStale && (
        <Alert
          message="当前补偿结果已过期"
          description={
            <Space>
              <span>
                发条参数或温度已变化（当前 {analysisTemperature}°C），
                当前补偿结果基于旧配置。请重新计算或清除。
              </span>
              <Button size="small" type="primary" onClick={handleCalculate}>重新计算</Button>
              <Button size="small" onClick={handleClear}>清除结果</Button>
            </Space>
          }
          type="warning"
          showIcon
          closable
          onClose={handleClear}
        />
      )}

      {!torqueAnalysis ? (
        <Alert
          message="请先在发条录入页面输入参数"
          description="均力补偿分析需要基于已有的力矩曲线进行计算"
          type="info"
          showIcon
        />
      ) : (
        <>
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <Card
                title={
                  <Space>
                    <ExperimentOutlined />
                    补偿装置参数
                  </Space>
                }
              >
                <Form
                  form={form}
                  layout="vertical"
                  initialValues={{
                    stages: 6,
                    minRadius: 3.0,
                    maxRadius: 5.0,
                    transmissionRatio: 1.0
                  }}
                >
                  <Form.Item label="补偿装置类型">
                    <RadioGroup
                      value={compensationType}
                      onChange={(e) => setCompensationType(e.target.value)}
                      buttonStyle="solid"
                      className="w-full"
                    >
                      <RadioButton value="fusee">宝塔轮</RadioButton>
                      <RadioButton value="constantForce">均力轮</RadioButton>
                      <RadioButton value="remontoire">定力矩</RadioButton>
                    </RadioGroup>
                  </Form.Item>

                  {compensationType === 'fusee' && (
                    <>
                      <Alert
                        message="宝塔轮原理"
                        description="通过锥形轮盘的半径变化，补偿发条力矩的衰减。半径从大到小变化，力矩从大到小时，力臂相应增大。"
                        type="info"
                        showIcon
                        className="mb-4"
                      />
                      <Row gutter={8}>
                        <Col span={12}>
                          <Form.Item
                            label={
                              <Space>
                                最大半径
                                <Tooltip title="宝塔轮大端半径">
                                  <InfoCircleOutlined className="text-gray-400" />
                                </Tooltip>
                              </Space>
                            }
                            name="maxRadius"
                          >
                            <InputNumber min={2} max={10} step={0.1} precision={1} style={{ width: '100%' }} addonAfter="mm" />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item
                            label={
                              <Space>
                                最小半径
                                <Tooltip title="宝塔轮小端半径">
                                  <InfoCircleOutlined className="text-gray-400" />
                                </Tooltip>
                              </Space>
                            }
                            name="minRadius"
                          >
                            <InputNumber min={1} max={8} step={0.1} precision={1} style={{ width: '100%' }} addonAfter="mm" />
                          </Form.Item>
                        </Col>
                      </Row>
                      <Form.Item
                        label={
                          <Space>
                            宝塔轮级数
                            <Tooltip title="宝塔轮的阶梯数量，越多补偿越精确">
                              <InfoCircleOutlined className="text-gray-400" />
                            </Tooltip>
                          </Space>
                        }
                        name="stages"
                      >
                        <Slider min={3} max={12} step={1} marks={{ 3: '3', 6: '6', 9: '9', 12: '12' }} />
                      </Form.Item>
                    </>
                  )}

                  {compensationType === 'constantForce' && (
                    <>
                      <Alert
                        message="均力轮原理"
                        description="通过一个小型储能弹簧在两轮系之间传递动力，使输出力矩保持恒定，与输入力矩无关。"
                        type="info"
                        showIcon
                        className="mb-4"
                      />
                      <Form.Item
                        label={
                          <Space>
                            传动比
                            <Tooltip title="均力轮的传动比，影响最终输出力矩">
                              <InfoCircleOutlined className="text-gray-400" />
                            </Tooltip>
                          </Space>
                        }
                        name="transmissionRatio"
                      >
                        <InputNumber min={0.5} max={2.0} step={0.05} precision={2} style={{ width: '100%' }} />
                      </Form.Item>
                      <div className="text-sm text-gray-600">
                        <p>• 均力轮每周期释放固定能量</p>
                        <p>• 典型周期：1秒 ~ 1分钟</p>
                        <p>• 可将力矩波动控制在 ±5% 以内</p>
                      </div>
                    </>
                  )}

                  {compensationType === 'remontoire' && (
                    <>
                      <Alert
                        message="定力矩装置原理"
                        description="利用重锤或弹簧的势能在短时间内提供恒定动力，周期性上弦，完全隔离发条力矩变化。"
                        type="info"
                        showIcon
                        className="mb-4"
                      />
                      <Form.Item
                        label={
                          <Space>
                            传动比
                            <Tooltip title="定力矩装置的传动比">
                              <InfoCircleOutlined className="text-gray-400" />
                            </Tooltip>
                          </Space>
                        }
                        name="transmissionRatio"
                      >
                        <InputNumber min={0.5} max={2.0} step={0.05} precision={2} style={{ width: '100%' }} />
                      </Form.Item>
                      <div className="text-sm text-gray-600">
                        <p>• 最高精度的力矩补偿方案</p>
                        <p>• 典型重周期：15秒、30秒、1分钟</p>
                        <p>• 力矩波动可控制在 ±1% 以内</p>
                        <p>• 常用于天文台级机芯</p>
                      </div>
                    </>
                  )}

                  <Row gutter={8}>
                    <Col span={16}>
                      <Button
                        type="primary"
                        icon={<ExperimentOutlined />}
                        onClick={handleCalculate}
                        block
                        size="large"
                      >
                        计算补偿效果
                      </Button>
                    </Col>
                    <Col span={8}>
                      <Button
                        onClick={handleClear}
                        block
                        size="large"
                        disabled={!compensationResult}
                      >
                        清除结果
                      </Button>
                    </Col>
                  </Row>
                </Form>
              </Card>
            </Col>

            <Col span={16}>
              {!compensationResult ? (
                <Card className="h-full flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <LineChartOutlined style={{ fontSize: 48 }} className="mb-4" />
                    <p>请设置补偿参数并点击"计算补偿效果"</p>
                  </div>
                </Card>
              ) : (
                <div className="space-y-4">
                  <Card
                    title={
                      <Space>
                        {getCompensationTypeName(compensationType)} 补偿效果对比
                        <Button
                          size="small"
                          icon={<DownloadOutlined />}
                          onClick={exportComparisonData}
                        >
                          导出数据
                        </Button>
                      </Space>
                    }
                    extra={
                      <Space>
                        <Switch
                          checked={showOriginal}
                          onChange={setShowOriginal}
                          checkedChildren="原始曲线"
                          unCheckedChildren="原始曲线"
                        />
                        <Switch
                          checked={showCompensated}
                          onChange={setShowCompensated}
                          checkedChildren="补偿曲线"
                          unCheckedChildren="补偿曲线"
                        />
                      </Space>
                    }
                  >
                    <div style={{ height: 400 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="originalGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#1890ff" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#1890ff" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="compensatedGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#52c41a" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#52c41a" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="progress"
                            label={{ value: '放电进度 (%)', position: 'insideBottom', offset: -5 }}
                            domain={[0, 100]}
                          />
                          <YAxis
                            label={{ value: '力矩 (mN·m)', angle: -90, position: 'insideLeft' }}
                            domain={[0, 'auto']}
                          />
                          <RechartsTooltip content={<CustomTooltip />} />
                          <Legend />
                          <ReferenceLine
                            y={compensationResult.averageCompensatedTorque * 1000}
                            stroke="#52c41a"
                            strokeDasharray="5 5"
                            label={{ value: '补偿后平均', position: 'right', fill: '#52c41a' }}
                          />
                          <ReferenceLine
                            y={torqueAnalysis.averageTorque * 1000}
                            stroke="#1890ff"
                            strokeDasharray="5 5"
                            label={{ value: '原始平均', position: 'right', fill: '#1890ff' }}
                          />
                          {showOriginal && (
                            <Area
                              type="monotone"
                              dataKey="originalTorque"
                              stroke="#1890ff"
                              strokeWidth={2}
                              fill="url(#originalGradient)"
                              name="原始力矩"
                            />
                          )}
                          {showCompensated && (
                            <Area
                              type="monotone"
                              dataKey="compensatedTorque"
                              stroke="#52c41a"
                              strokeWidth={2}
                              fill="url(#compensatedGradient)"
                              name="补偿后力矩"
                            />
                          )}
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  <Row gutter={[16, 16]}>
                    <Col span={6}>
                      <Statistic
                        title="补偿后均匀度"
                        value={compensationResult.torqueUniformity * 100}
                        precision={1}
                        suffix="%"
                        valueStyle={{
                          color: compensationResult.torqueUniformity > 0.9 ? '#52c41a' :
                                 compensationResult.torqueUniformity > 0.75 ? '#faad14' : '#f5222d'
                        }}
                        prefix={<CheckCircleOutlined />}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title="补偿后平均力矩"
                        value={compensationResult.averageCompensatedTorque * 1000}
                        precision={3}
                        suffix="mN·m"
                        valueStyle={{ color: '#52c41a' }}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title="最大偏差"
                        value={compensationResult.maxDeviation * 1000}
                        precision={3}
                        suffix="mN·m"
                        valueStyle={{ color: '#722ed1' }}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title="改善幅度"
                        value={compensationResult.improvementPercentage}
                        precision={1}
                        suffix="%"
                        valueStyle={{ color: '#52c41a' }}
                        prefix={<ExperimentOutlined />}
                      />
                    </Col>
                  </Row>

                  <Card title="补偿效果对比">
                    <Row gutter={[16, 16]}>
                      <Col span={12}>
                        <Card size="small" title="补偿前">
                          <div className="text-sm space-y-2">
                            <div className="flex justify-between">
                              <Text type="secondary">最大力矩:</Text>
                              <Text strong>{(torqueAnalysis.maxTorque * 1000).toFixed(3)} mN·m</Text>
                            </div>
                            <div className="flex justify-between">
                              <Text type="secondary">最小力矩:</Text>
                              <Text strong>{(torqueAnalysis.minTorque * 1000).toFixed(3)} mN·m</Text>
                            </div>
                            <div className="flex justify-between">
                              <Text type="secondary">平均力矩:</Text>
                              <Text strong>{(torqueAnalysis.averageTorque * 1000).toFixed(3)} mN·m</Text>
                            </div>
                            <div className="flex justify-between">
                              <Text type="secondary">力矩衰减:</Text>
                              <Text strong className="text-red-500">
                                {torqueAnalysis.torqueDropPercentage.toFixed(1)}%
                              </Text>
                            </div>
                            <div className="flex justify-between">
                              <Text type="secondary">后段衰减速率:</Text>
                              <Text strong className={torqueAnalysis.decayRate > 20 ? 'text-red-500' : 'text-orange-500'}>
                                {torqueAnalysis.decayRate.toFixed(1)}%
                              </Text>
                            </div>
                          </div>
                        </Card>
                      </Col>
                      <Col span={12}>
                        <Card size="small" title="补偿后">
                          <div className="text-sm space-y-2">
                            <div className="flex justify-between">
                              <Text type="secondary">最大力矩:</Text>
                              <Text strong className="text-green-600">
                                {(Math.max(...compensationResult.compensatedCurve.map(p => p.torque)) * 1000).toFixed(3)} mN·m
                              </Text>
                            </div>
                            <div className="flex justify-between">
                              <Text type="secondary">最小力矩:</Text>
                              <Text strong className="text-green-600">
                                {(Math.min(...compensationResult.compensatedCurve.map(p => p.torque)) * 1000).toFixed(3)} mN·m
                              </Text>
                            </div>
                            <div className="flex justify-between">
                              <Text type="secondary">平均力矩:</Text>
                              <Text strong className="text-green-600">
                                {(compensationResult.averageCompensatedTorque * 1000).toFixed(3)} mN·m
                              </Text>
                            </div>
                            <div className="flex justify-between">
                              <Text type="secondary">力矩衰减:</Text>
                              <Text strong className="text-green-600">
                                {(((Math.max(...compensationResult.compensatedCurve.map(p => p.torque)) -
                                    Math.min(...compensationResult.compensatedCurve.map(p => p.torque))) /
                                    Math.max(...compensationResult.compensatedCurve.map(p => p.torque))) * 100).toFixed(1)}%
                              </Text>
                            </div>
                            <div className="flex justify-between">
                              <Text type="secondary">均匀度:</Text>
                              <Text strong className="text-green-600">
                                {(compensationResult.torqueUniformity * 100).toFixed(1)}%
                              </Text>
                            </div>
                          </div>
                        </Card>
                      </Col>
                    </Row>
                  </Card>

                  <Card title="补偿装置技术对比">
                    <Row gutter={[16, 16]}>
                      <Col span={8}>
                        <Card size="small" title="宝塔轮 (Fusee)">
                          <Tag color="blue" className="mb-2">传统方案</Tag>
                          <ul className="text-xs text-gray-600 space-y-1">
                            <li>✅ 补偿效率高</li>
                            <li>✅ 可靠性好</li>
                            <li>❌ 占用空间大</li>
                            <li>❌ 加工难度高</li>
                            <li>📊 均匀度: 85-90%</li>
                          </ul>
                        </Card>
                      </Col>
                      <Col span={8}>
                        <Card size="small" title="均力轮 (Constant Force)">
                          <Tag color="green" className="mb-2">现代方案</Tag>
                          <ul className="text-xs text-gray-600 space-y-1">
                            <li>✅ 体积较小</li>
                            <li>✅ 补偿效果好</li>
                            <li>⚠️ 结构较复杂</li>
                            <li>⚠️ 有周期波动</li>
                            <li>📊 均匀度: 90-95%</li>
                          </ul>
                        </Card>
                      </Col>
                      <Col span={8}>
                        <Card size="small" title="定力矩 (Remontoire)">
                          <Tag color="purple" className="mb-2">高端方案</Tag>
                          <ul className="text-xs text-gray-600 space-y-1">
                            <li>✅ 精度最高</li>
                            <li>✅ 完全隔离力矩波动</li>
                            <li>❌ 结构最复杂</li>
                            <li>❌ 成本最高</li>
                            <li>📊 均匀度: 95-99%</li>
                          </ul>
                        </Card>
                      </Col>
                    </Row>
                  </Card>

                  <Alert
                    message="设计建议"
                    description={
                      <div className="text-sm">
                        {compensationType === 'fusee' && (
                          <>
                            <p>• 当前宝塔轮配置可将力矩均匀度提升至 {(compensationResult.torqueUniformity * 100).toFixed(1)}%</p>
                            <p>• 建议增加宝塔轮级数以提高补偿精度</p>
                            <p>• 注意链条与宝塔轮的配合公差</p>
                          </>
                        )}
                        {compensationType === 'constantForce' && (
                          <>
                            <p>• 当前均力轮配置可将力矩均匀度提升至 {(compensationResult.torqueUniformity * 100).toFixed(1)}%</p>
                            <p>• 均力轮弹簧需要定期检查和更换</p>
                            <p>• 注意控制释放周期与擒纵频率的匹配</p>
                          </>
                        )}
                        {compensationType === 'remontoire' && (
                          <>
                            <p>• 当前定力矩配置可将力矩均匀度提升至 {(compensationResult.torqueUniformity * 100).toFixed(1)}%</p>
                            <p>• 定力矩装置是天文台级机芯的首选方案</p>
                            <p>• 需精心设计上弦机构以确保可靠性</p>
                          </>
                        )}
                      </div>
                    }
                    type="success"
                    showIcon
                    icon={<CheckCircleOutlined />}
                  />
                </div>
              )}
            </Col>
          </Row>
        </>
      )}
    </div>
  )
}

export default CompensationPage
