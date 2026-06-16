import React, { useState, useMemo } from 'react'
import {
  Card,
  Row,
  Col,
  Statistic,
  Alert,
  Tag,
  Typography,
  Tabs,
  Space,
  Button,
  Slider,
  Divider,
  Table,
  Tooltip,
  Switch,
  Form,
  InputNumber
} from 'antd'
import {
  LineChartOutlined,
  WarningOutlined,
  DangerOutlined,
  ThunderboltOutlined,
  InfoCircleOutlined,
  DownloadOutlined,
  ThermometerOutlined,
  ClockCircleOutlined
} from '@ant-design/icons'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
  ComposedChart,
  Bar
} from 'recharts'
import { useAppStore } from '@/store/useAppStore'
import {
  calculateTemperatureInfluence,
  TorquePoint,
  TemperatureAnalysisResult
} from '@/utils/mainspringPhysics'

const { Title, Text } = Typography

const TorqueCurvePage: React.FC = () => {
  const { torqueAnalysis, currentMainspring, analysisTemperature, setAnalysisTemperature } = useAppStore()
  const [showWarningZones, setShowWarningZones] = useState(true)
  const [showDangerZones, setShowDangerZones] = useState(true)
  const [temperatureRange] = useState({ min: -10, max: 60, step: 5 })
  const [tempForm] = Form.useForm()

  const temperatureData = useMemo(() => {
    if (!currentMainspring) return []
    return calculateTemperatureInfluence(currentMainspring, temperatureRange)
  }, [currentMainspring, temperatureRange])

  const chartData = useMemo(() => {
    if (!torqueAnalysis) return []

    return torqueAnalysis.torqueCurve.map((point, index) => {
      const progress = (index / (torqueAnalysis.torqueCurve.length - 1)) * 100
      return {
        progress,
        torque: point.torque * 1000,
        turns: point.turns,
        angle: point.angle,
        isWarningZone: point.isWarningZone,
        isDangerZone: point.isDangerZone,
        displayTorque: point.torque * 1000,
        warningTorque: showWarningZones && point.isWarningZone ? point.torque * 1000 : null,
        dangerTorque: showDangerZones && point.isDangerZone ? point.torque * 1000 : null
      }
    })
  }, [torqueAnalysis, showWarningZones, showDangerZones])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-bold text-sm mb-1">放电进度: {label.toFixed(1)}%</p>
          <p className="text-sm">力矩: {data.torque.toFixed(3)} mN·m</p>
          <p className="text-sm">已放圈数: {data.turns.toFixed(1)} 圈</p>
          <p className="text-sm">转角: {(data.angle / (2 * Math.PI)).toFixed(1)} 圈</p>
          {data.isDangerZone && (
            <p className="text-red-500 text-sm font-bold mt-1">
              <DangerOutlined /> 危险区段
            </p>
          )}
          {data.isWarningZone && !data.isDangerZone && (
            <p className="text-orange-500 text-sm font-bold mt-1">
              <WarningOutlined /> 警告区段
            </p>
          )}
        </div>
      )
    }
    return null
  }

  const warningZoneColumns = [
    {
      title: '区段类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={type === 'danger' ? 'red' : 'orange'}>
          {type === 'danger' ? '危险' : '警告'}
        </Tag>
      )
    },
    {
      title: '起始位置',
      dataIndex: 'start',
      key: 'start',
      render: (v: number) => `${(v * 100).toFixed(0)}%`
    },
    {
      title: '结束位置',
      dataIndex: 'end',
      key: 'end',
      render: (v: number) => `${(v * 100).toFixed(0)}%`
    },
    {
      title: '说明',
      dataIndex: 'reason',
      key: 'reason'
    }
  ]

  const zoneTableData = useMemo(() => {
    if (!torqueAnalysis) return []
    const warnings = torqueAnalysis.warningZones.map(z => ({
      key: `w-${z.startTurn}`,
      type: 'warning',
      start: z.startTurn,
      end: z.endTurn,
      reason: z.reason
    }))
    const dangers = torqueAnalysis.dangerZones.map(z => ({
      key: `d-${z.startTurn}`,
      type: 'danger',
      start: z.startTurn,
      end: z.endTurn,
      reason: z.reason
    }))
    return [...warnings, ...dangers]
  }, [torqueAnalysis])

  const temperatureColumns = [
    {
      title: '温度 (°C)',
      dataIndex: 'temperature',
      key: 'temperature',
      render: (v: number) => (
        <Space>
          <ThermometerOutlined className={v > 40 ? 'text-red-500' : v < 0 ? 'text-blue-500' : 'text-gray-500'} />
          <span>{v}°C</span>
        </Space>
      )
    },
    {
      title: '弹性模量 (GPa)',
      dataIndex: 'effectiveElasticModulus',
      key: 'effectiveElasticModulus',
      render: (v: number) => (v / 1e9).toFixed(1)
    },
    {
      title: '力矩系数',
      dataIndex: 'torqueMultiplier',
      key: 'torqueMultiplier',
      render: (v: number) => v.toFixed(4)
    },
    {
      title: '最大力矩 (mN·m)',
      dataIndex: 'maxTorque',
      key: 'maxTorque',
      render: (v: number) => (v * 1000).toFixed(3)
    },
    {
      title: '最小力矩 (mN·m)',
      dataIndex: 'minTorque',
      key: 'minTorque',
      render: (v: number) => (v * 1000).toFixed(3)
    },
    {
      title: '动力储备 (小时)',
      dataIndex: 'powerReserveHours',
      key: 'powerReserveHours',
      render: (v: number) => v.toFixed(0)
    }
  ]

  const handleTemperatureChange = () => {
    const values = tempForm.getFieldsValue()
    if (values.temperature !== undefined) {
      setAnalysisTemperature(values.temperature)
    }
  }

  const exportChartData = () => {
    if (!torqueAnalysis) return
    const csvContent = [
      ['进度(%)', '力矩(mN·m)', '圈数', '警告区', '危险区'].join(','),
      ...chartData.map(d => [
        d.progress.toFixed(2),
        d.torque.toFixed(4),
        d.turns.toFixed(2),
        d.isWarningZone ? '是' : '否',
        d.isDangerZone ? '是' : '否'
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `力矩曲线_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
  }

  return (
    <div className="p-6 space-y-6">
      <Title level={3} className="!mb-0">
        <LineChartOutlined className="mr-2" />
        力矩曲线分析
      </Title>

      {!torqueAnalysis ? (
        <Alert
          message="请先在发条录入页面输入参数"
          description="力矩曲线需要基于发条参数进行计算"
          type="info"
          showIcon
        />
      ) : (
        <>
          <Row gutter={[16, 16]}>
            <Col span={6}>
              <Statistic
                title={
                  <Space>
                    满弦力矩
                    <Tooltip title="发条完全上紧时的输出力矩">
                      <InfoCircleOutlined className="text-gray-400" />
                    </Tooltip>
                  </Space>
                }
                value={torqueAnalysis.maxTorque * 1000}
                precision={3}
                suffix="mN·m"
                valueStyle={{
                  color: torqueAnalysis.escapementImpactRisk ? '#f5222d' : '#1890ff'
                }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title={
                  <Space>
                    末端力矩
                    <Tooltip title="发条完全放松前的最小力矩">
                      <InfoCircleOutlined className="text-gray-400" />
                    </Tooltip>
                  </Space>
                }
                value={torqueAnalysis.minTorque * 1000}
                precision={3}
                suffix="mN·m"
              />
            </Col>
            <Col span={6}>
              <Statistic
                title={
                  <Space>
                    平均力矩
                    <Tooltip title="整个放电周期的力矩平均值">
                      <InfoCircleOutlined className="text-gray-400" />
                    </Tooltip>
                  </Space>
                }
                value={torqueAnalysis.averageTorque * 1000}
                precision={3}
                suffix="mN·m"
              />
            </Col>
            <Col span={6}>
              <Statistic
                title={
                  <Space>
                    力矩衰减率
                    <Tooltip title="(最大力矩-最小力矩)/最大力矩">
                      <InfoCircleOutlined className="text-gray-400" />
                    </Tooltip>
                  </Space>
                }
                value={torqueAnalysis.torqueDropPercentage}
                precision={1}
                suffix="%"
                valueStyle={{
                  color: torqueAnalysis.torqueDropPercentage > 50 ? '#f5222d' :
                         torqueAnalysis.torqueDropPercentage > 35 ? '#faad14' : '#52c41a'
                }}
              />
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col span={8}>
              <Statistic
                title={
                  <Space>
                    <ClockCircleOutlined />
                    估算动力储备
                  </Space>
                }
                value={torqueAnalysis.powerReserveHours}
                precision={0}
                suffix="小时"
                valueStyle={{ color: '#722ed1' }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="后段衰减速率"
                value={torqueAnalysis.decayRate}
                precision={1}
                suffix="%"
                valueStyle={{
                  color: torqueAnalysis.decayRate > 25 ? '#f5222d' :
                         torqueAnalysis.decayRate > 15 ? '#faad14' : '#52c41a'
                }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="异常区段数量"
                value={torqueAnalysis.warningZones.length + torqueAnalysis.dangerZones.length}
                suffix="处"
                valueStyle={{
                  color: torqueAnalysis.dangerZones.length > 0 ? '#f5222d' :
                         torqueAnalysis.warningZones.length > 0 ? '#faad14' : '#52c41a'
                }}
              />
            </Col>
          </Row>

          {torqueAnalysis.escapementImpactRisk && (
            <Alert
              message={
                <Space>
                  <ThunderboltOutlined />
                  擒纵冲击风险警告
                </Space>
              }
              description={torqueAnalysis.impactRiskDescription}
              type="error"
              showIcon
              action={
                <Button size="small" danger type="ghost">
                  查看建议
                </Button>
              }
            />
          )}

          {torqueAnalysis.geometry.hasStackingRisk && (
            <Alert
              message={
                <Space>
                  <WarningOutlined />
                  卷绕堆叠风险
                </Space>
              }
              description={torqueAnalysis.geometry.stackingWarning}
              type="warning"
              showIcon
            />
          )}

          <Card
            title={
              <Space>
                力矩-放电曲线
                <Button
                  size="small"
                  icon={<DownloadOutlined />}
                  onClick={exportChartData}
                >
                  导出数据
                </Button>
              </Space>
            }
            extra={
              <Space>
                <Switch
                  checked={showWarningZones}
                  onChange={setShowWarningZones}
                  checkedChildren="警告区"
                  unCheckedChildren="警告区"
                />
                <Switch
                  checked={showDangerZones}
                  onChange={setShowDangerZones}
                  checkedChildren="危险区"
                  unCheckedChildren="危险区"
                />
              </Space>
            }
          >
            <div style={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="torqueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1890ff" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#1890ff" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="warningGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#faad14" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#faad14" stopOpacity={0.2} />
                    </linearGradient>
                    <linearGradient id="dangerGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f5222d" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#f5222d" stopOpacity={0.3} />
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
                    y={torqueAnalysis.averageTorque * 1000}
                    stroke="#722ed1"
                    strokeDasharray="5 5"
                    label={{ value: '平均值', position: 'right', fill: '#722ed1' }}
                  />
                  <ReferenceLine
                    x={70}
                    stroke="#faad14"
                    strokeDasharray="3 3"
                    label={{ value: '后段开始', position: 'top', fill: '#faad14' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="torque"
                    stroke="#1890ff"
                    strokeWidth={2}
                    fill="url(#torqueGradient)"
                    name="正常力矩"
                  />
                  {showWarningZones && (
                    <Area
                      type="monotone"
                      dataKey="warningTorque"
                      stroke="#faad14"
                      strokeWidth={2}
                      fill="url(#warningGradient)"
                      name="警告区段"
                      connectNulls={false}
                    />
                  )}
                  {showDangerZones && (
                    <Area
                      type="monotone"
                      dataKey="dangerTorque"
                      stroke="#f5222d"
                      strokeWidth={3}
                      fill="url(#dangerGradient)"
                      name="危险区段"
                      connectNulls={false}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <Divider orientation="left">圈数-力矩关系</Divider>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="turns"
                    label={{ value: '已释放圈数', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis
                    label={{ value: '力矩 (mN·m)', angle: -90, position: 'insideLeft' }}
                    domain={[0, 'auto']}
                  />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="torque"
                    stroke="#1890ff"
                    strokeWidth={2}
                    dot={false}
                    name="力矩"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Tabs
            items={[
              {
                key: 'zones',
                label: '异常区段分析',
                children: (
                  <Card>
                    {zoneTableData.length === 0 ? (
                      <Alert
                        message="无异常区段"
                        description="该发条配置在整个放电周期内力矩衰减均匀，未检测到异常快速衰减区段"
                        type="success"
                        showIcon
                      />
                    ) : (
                      <Table
                        dataSource={zoneTableData}
                        columns={warningZoneColumns}
                        pagination={false}
                      />
                    )}

                    <Divider />

                    <div className="space-y-4">
                      <Title level={5}>技术说明</Title>
                      <Row gutter={[16, 16]}>
                        <Col span={12}>
                          <Card size="small" title="警告区段判定规则">
                            <ul className="text-sm text-gray-600 space-y-1">
                              <li>• 放电进度超过 70% 后进入后段</li>
                              <li>• 相邻采样点力矩衰减率 > 2%</li>
                              <li>• 可能导致摆幅下降，影响走时精度</li>
                              <li>• 建议：考虑增加均力装置或优化发条参数</li>
                            </ul>
                          </Card>
                        </Col>
                        <Col span={12}>
                          <Card size="small" title="危险区段判定规则">
                            <ul className="text-sm text-gray-600 space-y-1">
                              <li>• 放电进度超过 70% 后</li>
                              <li>• 相邻采样点力矩衰减率 > 5%</li>
                              <li>• 可能导致摆幅急剧下跌甚至停走</li>
                              <li>• 建议：必须重新设计发条或增加补偿装置</li>
                            </ul>
                          </Card>
                        </Col>
                      </Row>
                    </div>
                  </Card>
                )
              },
              {
                key: 'temperature',
                label: '温度影响分析',
                children: (
                  <Card>
                    <Row gutter={[16, 16]}>
                      <Col span={8}>
                        <Card size="small" title="温度设置">
                          <Form form={tempForm} layout="vertical">
                            <Form.Item
                              label="分析温度"
                              name="temperature"
                              initialValue={analysisTemperature}
                            >
                              <InputNumber
                                min={-20}
                                max={80}
                                step={1}
                                addonAfter="°C"
                                style={{ width: '100%' }}
                              />
                            </Form.Item>
                            <Button type="primary" onClick={handleTemperatureChange} block>
                              应用温度
                            </Button>
                            <Divider />
                            <div className="text-sm text-gray-600">
                              <p>当前分析温度: <strong>{analysisTemperature}°C</strong></p>
                              <p className="mt-2">温度影响发条材料的弹性模量，进而影响力矩输出和动力储备时长。</p>
                            </div>
                          </Form>
                        </Card>
                      </Col>
                      <Col span={16}>
                        <div style={{ height: 300 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={temperatureData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis
                                dataKey="temperature"
                                label={{ value: '温度 (°C)', position: 'insideBottom', offset: -5 }}
                              />
                              <YAxis
                                yAxisId="left"
                                label={{ value: '动力储备 (小时)', angle: -90, position: 'insideLeft' }}
                              />
                              <YAxis
                                yAxisId="right"
                                orientation="right"
                                label={{ value: '力矩 (mN·m)', angle: 90, position: 'insideRight' }}
                              />
                              <RechartsTooltip />
                              <Legend />
                              <Bar
                                yAxisId="left"
                                dataKey="powerReserveHours"
                                fill="#722ed1"
                                name="动力储备"
                                opacity={0.7}
                              />
                              <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey={(d: TemperatureAnalysisResult) => d.maxTorque * 1000}
                                stroke="#f5222d"
                                strokeWidth={2}
                                name="最大力矩"
                                dot={true}
                              />
                              <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey={(d: TemperatureAnalysisResult) => d.minTorque * 1000}
                                stroke="#1890ff"
                                strokeWidth={2}
                                name="最小力矩"
                                dot={true}
                              />
                            </ComposedChart>
                          </ResponsiveContainer>
                        </div>
                      </Col>
                    </Row>

                    <Divider />

                    <Table
                      dataSource={temperatureData}
                      columns={temperatureColumns}
                      pagination={false}
                      size="small"
                    />

                    <Alert
                      message="温度补偿建议"
                      description={
                        <div className="text-sm">
                          <p>• 温度每升高 10°C，发条弹性模量约降低 0.2-0.3%</p>
                          <p>• 动力储备随温度升高而减少，高温环境下走时会变快</p>
                          <p>• 低温环境下力矩增大，但摆幅可能因润滑油粘度增加而下降</p>
                          <p>• 建议使用温度系数小的合金材料（如 Nivaflex）以减小温度影响</p>
                        </div>
                      }
                      type="info"
                      showIcon
                      className="mt-4"
                    />
                  </Card>
                )
              },
              {
                key: 'geometry',
                label: '卷绕几何细节',
                children: (
                  <Card>
                    <Row gutter={[16, 16]}>
                      <Col span={8}>
                        <Statistic
                          title="条盒填充率"
                          value={torqueAnalysis.geometry.barrelFillRatio * 100}
                          precision={1}
                          suffix="%"
                          valueStyle={{
                            color: torqueAnalysis.geometry.barrelFillRatio > 0.95 ? '#f5222d' :
                                   torqueAnalysis.geometry.barrelFillRatio < 0.6 ? '#faad14' : '#52c41a'
                          }}
                        />
                      </Col>
                      <Col span={8}>
                        <Statistic
                          title="总有效圈数"
                          value={torqueAnalysis.geometry.totalTurns}
                          precision={1}
                          suffix="圈"
                        />
                      </Col>
                      <Col span={8}>
                        <Statistic
                          title="理论最大圈数"
                          value={torqueAnalysis.geometry.turnsFullyWound}
                          precision={1}
                          suffix="圈"
                        />
                      </Col>
                    </Row>

                    <Divider />

                    <Row gutter={16}>
                      <Col span={12}>
                        <Card size="small" title="卷绕状态说明">
                          <div className="text-sm text-gray-600 space-y-2">
                            <p>
                              <Text strong>满卷状态:</Text> 发条完全上紧，共 {torqueAnalysis.geometry.turnsFullyWound.toFixed(1)} 圈
                            </p>
                            <p>
                              <Text strong>放松状态:</Text> 发条完全放松，剩余 {torqueAnalysis.geometry.turnsUnwound.toFixed(1)} 圈
                            </p>
                            <p>
                              <Text strong>有效工作圈数:</Text> {torqueAnalysis.geometry.totalTurns.toFixed(1)} 圈
                            </p>
                            <p>
                              <Text strong>填充率:</Text> {(torqueAnalysis.geometry.barrelFillRatio * 100).toFixed(1)}%
                              {torqueAnalysis.geometry.barrelFillRatio > 0.95 && ' - 过高，有堆叠风险'}
                              {torqueAnalysis.geometry.barrelFillRatio < 0.6 && ' - 过低，空间浪费'}
                            </p>
                          </div>
                        </Card>
                      </Col>
                      <Col span={12}>
                        <Card size="small" title="设计建议">
                          <div className="text-sm text-gray-600 space-y-2">
                            {torqueAnalysis.geometry.barrelFillRatio > 0.95 ? (
                              <>
                                <p className="text-red-500">⚠️ 填充率过高，建议：</p>
                                <ul className="ml-4 list-disc">
                                  <li>减小发条长度或厚度</li>
                                  <li>增大条盒内径</li>
                                  <li>考虑使用多条发盒设计</li>
                                </ul>
                              </>
                            ) : torqueAnalysis.geometry.barrelFillRatio < 0.6 ? (
                              <>
                                <p className="text-yellow-500">⚠️ 填充率过低，建议：</p>
                                <ul className="ml-4 list-disc">
                                  <li>增加发条长度以提高动储</li>
                                  <li>增大发条厚度以提高力矩</li>
                                  <li>减小条盒尺寸以优化机芯布局</li>
                                </ul>
                              </>
                            ) : (
                              <>
                                <p className="text-green-500">✅ 填充率合理，设计良好</p>
                                <ul className="ml-4 list-disc">
                                  <li>填充率在 60-95% 理想范围内</li>
                                  <li>无堆叠咬死风险</li>
                                  <li>空间利用率良好</li>
                                </ul>
                              </>
                            )}
                          </div>
                        </Card>
                      </Col>
                    </Row>
                  </Card>
                )
              }
            ]}
          />
        </>
      )}
    </div>
  )
}

export default TorqueCurvePage
