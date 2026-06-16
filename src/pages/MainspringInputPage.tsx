import React, { useState, useMemo } from 'react'
import {
  Form,
  InputNumber,
  Select,
  Card,
  Row,
  Col,
  Button,
  Space,
  Alert,
  Statistic,
  Divider,
  Tag,
  Typography,
  Tooltip
} from 'antd'
import {
  CalculatorOutlined,
  ExperimentOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  SaveOutlined,
  InfoCircleOutlined
} from '@ant-design/icons'
import { useAppStore } from '@/store/useAppStore'
import {
  MATERIALS,
  calculateWindingGeometry,
  reverseCalculateMainspring,
  type ReverseCalculationResult
} from '@/utils/mainspringPhysics'
import { DEFAULT_MAINSPRING } from '@/store/types'
import type { MainspringParams } from '@/utils/mainspringPhysics'

const { Title, Text } = Typography
const { Option } = Select

const MainspringInputPage: React.FC = () => {
  const [form] = Form.useForm()
  const [reverseForm] = Form.useForm()
  const {
    currentMainspring,
    torqueAnalysis,
    analysisTemperature,
    setCurrentMainspring,
    setAnalysisTemperature,
    addSolutionItem
  } = useAppStore()

  const [showReverseCalc, setShowReverseCalc] = useState(false)
  const [reverseResults, setReverseResults] = useState<ReverseCalculationResult[]>([])
  const [selectedMaterial, setSelectedMaterial] = useState<string>(
    currentMainspring?.material?.name?.includes('Nivaflex') ? 'Nivaflex' : 'Nivaflex'
  )

  const geometry = useMemo(() => {
    if (!currentMainspring) return null
    return calculateWindingGeometry(currentMainspring)
  }, [currentMainspring])

  const buildMainspringParams = (formValues: any, materialKey: string): MainspringParams | null => {
    const material = MATERIALS[materialKey]
    if (!material) return null

    const thickness = formValues.thickness
    const length = formValues.length
    const width = formValues.width
    const barrelInnerDiameter = formValues.barrelInnerDiameter
    const arborDiameter = formValues.arborDiameter
    const elasticModulus = formValues.elasticModulus ?? material.elasticModulus20C
    const yieldStrength = formValues.yieldStrength ?? material.maxAllowableStress

    if (
      thickness === undefined || thickness === null || Number.isNaN(thickness) ||
      length === undefined || length === null || Number.isNaN(length) ||
      width === undefined || width === null || Number.isNaN(width) ||
      barrelInnerDiameter === undefined || barrelInnerDiameter === null || Number.isNaN(barrelInnerDiameter) ||
      arborDiameter === undefined || arborDiameter === null || Number.isNaN(arborDiameter)
    ) {
      return null
    }

    return {
      thickness: thickness * 1e-3,
      length: length * 1e-3,
      width: width * 1e-3,
      barrelInnerDiameter: barrelInnerDiameter * 1e-3,
      arborDiameter: arborDiameter * 1e-3,
      elasticModulus,
      yieldStrength,
      material
    }
  }

  const handleMaterialChange = (value: string) => {
    setSelectedMaterial(value)
    const material = MATERIALS[value]
    form.setFieldsValue({
      elasticModulus: material.elasticModulus20C,
      yieldStrength: material.maxAllowableStress
    })
    const values = form.getFieldsValue()
    const params = buildMainspringParams({ ...values, elasticModulus: material.elasticModulus20C, yieldStrength: material.maxAllowableStress }, value)
    if (params) {
      setCurrentMainspring(params)
    }
  }

  const handleFormChange = (_: any, allValues: any) => {
    const params = buildMainspringParams(allValues, selectedMaterial)
    if (params) {
      setCurrentMainspring(params)
    }
    const temp = allValues.temperature
    if (temp !== null && temp !== undefined && !Number.isNaN(temp)) {
      const newTemp = Number(temp)
      if (newTemp !== analysisTemperature) {
        setAnalysisTemperature(newTemp)
      }
    }
  }

  const handleReverseCalculate = () => {
    const values = reverseForm.getFieldsValue()
    const material = MATERIALS[values.material || 'Nivaflex']

    const results = reverseCalculateMainspring(
      values.targetPowerReserve,
      values.barrelInnerDiameter * 1e-3,
      values.arborDiameter * 1e-3,
      material,
      values.width * 1e-3,
      {
        minThickness: values.minThickness * 1e-3,
        maxThickness: values.maxThickness * 1e-3,
        minLength: values.minLength * 1e-3,
        maxLength: values.maxLength * 1e-3,
        targetTorque: values.targetTorque ? values.targetTorque * 1e-3 : undefined
      }
    )

    setReverseResults(results)
  }

  const applyReverseResult = (result: ReverseCalculationResult) => {
    const material = MATERIALS[selectedMaterial]
    const params: MainspringParams = {
      thickness: result.thickness,
      length: result.length,
      width: result.width,
      barrelInnerDiameter: currentMainspring?.barrelInnerDiameter || DEFAULT_MAINSPRING.barrelInnerDiameter,
      arborDiameter: currentMainspring?.arborDiameter || DEFAULT_MAINSPRING.arborDiameter,
      elasticModulus: material.elasticModulus20C,
      yieldStrength: material.maxAllowableStress,
      material
    }

    form.setFieldsValue({
      thickness: result.thickness * 1e3,
      length: result.length * 1e3,
      width: result.width * 1e3
    })

    setCurrentMainspring(params)
  }

  const handleReset = () => {
    form.setFieldsValue({
      thickness: DEFAULT_MAINSPRING.thickness * 1e3,
      length: DEFAULT_MAINSPRING.length * 1e3,
      width: DEFAULT_MAINSPRING.width * 1e3,
      barrelInnerDiameter: DEFAULT_MAINSPRING.barrelInnerDiameter * 1e3,
      arborDiameter: DEFAULT_MAINSPRING.arborDiameter * 1e3,
      elasticModulus: DEFAULT_MAINSPRING.elasticModulus,
      yieldStrength: DEFAULT_MAINSPRING.yieldStrength
    })
    setSelectedMaterial('Nivaflex')
    setCurrentMainspring(DEFAULT_MAINSPRING)
  }

  const handleSaveToLibrary = () => {
    if (!currentMainspring || !torqueAnalysis) return

    const name = prompt('请输入方案名称：', `自定义配置_${new Date().toLocaleDateString()}`)
    if (!name) return

    addSolutionItem({
      name,
      category: 'standard',
      powerReserveLevel: `${Math.round(torqueAnalysis.powerReserveHours)}h`,
      targetPowerReserve: torqueAnalysis.powerReserveHours,
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
      recommendedMovements: [],
      material: selectedMaterial,
      notes: `自定义配置，温度 ${analysisTemperature}°C`,
      isCustom: true
    })

    alert('方案已保存到方案库')
  }

  const formatThickness = (v: number | null) => v ? (v * 1e3).toFixed(2) : '0.00'
  const formatLength = (v: number | null) => v ? (v * 1e3).toFixed(1) : '0.0'
  const formatDiameter = (v: number | null) => v ? (v * 1e3).toFixed(2) : '0.00'

  return (
    <div className="p-6 space-y-6">
      <Title level={3} className="!mb-0">
        <CalculatorOutlined className="mr-2" />
        发条参数录入
      </Title>

      <Row gutter={24}>
        <Col span={12}>
          <Card
            title="发条几何参数"
            extra={
              <Space>
                <Button icon={<ReloadOutlined />} onClick={handleReset}>
                  重置
                </Button>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={handleSaveToLibrary}
                  disabled={!torqueAnalysis}
                >
                  保存到方案库
                </Button>
              </Space>
            }
          >
            <Form
              form={form}
              layout="vertical"
              initialValues={{
                thickness: DEFAULT_MAINSPRING.thickness * 1e3,
                length: DEFAULT_MAINSPRING.length * 1e3,
                width: DEFAULT_MAINSPRING.width * 1e3,
                barrelInnerDiameter: DEFAULT_MAINSPRING.barrelInnerDiameter * 1e3,
                arborDiameter: DEFAULT_MAINSPRING.arborDiameter * 1e3,
                elasticModulus: DEFAULT_MAINSPRING.elasticModulus,
                yieldStrength: DEFAULT_MAINSPRING.yieldStrength,
                material: 'Nivaflex',
                temperature: analysisTemperature
              }}
              onValuesChange={handleFormChange}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label={
                      <Space>
                        发条料厚
                        <Tooltip title="发条带材的厚度，典型值 0.12-0.25mm">
                          <InfoCircleOutlined className="text-gray-400" />
                        </Tooltip>
                      </Space>
                    }
                    name="thickness"
                    rules={[{ required: true, message: '请输入料厚' }]}
                  >
                    <InputNumber
                      min={0.08}
                      max={0.4}
                      step={0.01}
                      precision={2}
                      style={{ width: '100%' }}
                      addonAfter="mm"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label={
                      <Space>
                        发条长度
                        <Tooltip title="发条展开长度，典型值 200-1000mm">
                          <InfoCircleOutlined className="text-gray-400" />
                        </Tooltip>
                      </Space>
                    }
                    name="length"
                    rules={[{ required: true, message: '请输入长度' }]}
                  >
                    <InputNumber
                      min={100}
                      max={4000}
                      step={10}
                      precision={1}
                      style={{ width: '100%' }}
                      addonAfter="mm"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label={
                      <Space>
                        发条宽度
                        <Tooltip title="发条带材的宽度，典型值 0.8-1.5mm">
                          <InfoCircleOutlined className="text-gray-400" />
                        </Tooltip>
                      </Space>
                    }
                    name="width"
                    rules={[{ required: true, message: '请输入宽度' }]}
                  >
                    <InputNumber
                      min={0.5}
                      max={3}
                      step={0.05}
                      precision={2}
                      style={{ width: '100%' }}
                      addonAfter="mm"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label={
                      <Space>
                        条盒内径
                        <Tooltip title="条盒内部直径，典型值 8-15mm">
                          <InfoCircleOutlined className="text-gray-400" />
                        </Tooltip>
                      </Space>
                    }
                    name="barrelInnerDiameter"
                    rules={[{ required: true, message: '请输入条盒内径' }]}
                  >
                    <InputNumber
                      min={6}
                      max={25}
                      step={0.1}
                      precision={2}
                      style={{ width: '100%' }}
                      addonAfter="mm"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label={
                      <Space>
                        条轴直径
                        <Tooltip title="条轴（发条芯轴）直径，典型值 1.5-3mm">
                          <InfoCircleOutlined className="text-gray-400" />
                        </Tooltip>
                      </Space>
                    }
                    name="arborDiameter"
                    rules={[{ required: true, message: '请输入条轴直径' }]}
                  >
                    <InputNumber
                      min={1}
                      max={5}
                      step={0.1}
                      precision={2}
                      style={{ width: '100%' }}
                      addonAfter="mm"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label={
                      <Space>
                        分析温度
                        <Tooltip title="环境温度，影响弹性模量">
                          <InfoCircleOutlined className="text-gray-400" />
                        </Tooltip>
                      </Space>
                    }
                    name="temperature"
                  >
                    <InputNumber
                      min={-20}
                      max={80}
                      step={1}
                      precision={0}
                      style={{ width: '100%' }}
                      addonAfter="°C"
                      onChange={(value) => {
                        if (value !== null && value !== undefined && !Number.isNaN(value)) {
                          setAnalysisTemperature(Number(value))
                        }
                      }}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Divider orientation="left">材料属性</Divider>

              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item label="发条材料" name="material">
                    <Select onChange={handleMaterialChange}>
                      {Object.entries(MATERIALS).map(([key, mat]) => (
                        <Option key={key} value={key}>
                          {mat.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="弹性模量 (E)" name="elasticModulus">
                    <InputNumber
                      min={100e9}
                      max={300e9}
                      step={1e9}
                      style={{ width: '100%' }}
                      formatter={(value) => `${(value as number) / 1e9} GPa`}
                      parser={(value) => parseFloat(value || '0') * 1e9}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="许用应力" name="yieldStrength">
                    <InputNumber
                      min={1000e6}
                      max={4000e6}
                      step={50e6}
                      style={{ width: '100%' }}
                      formatter={(value) => `${(value as number) / 1e6} MPa`}
                      parser={(value) => parseFloat(value || '0') * 1e6}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Card>
        </Col>

        <Col span={12} className="space-y-6">
          {geometry && (
            <Card title="卷绕几何分析">
              {geometry.hasStackingRisk ? (
                <Alert
                  message="堆叠风险"
                  description={geometry.stackingWarning || '存在发条堆叠咬死风险'}
                  type="warning"
                  showIcon
                  icon={<WarningOutlined />}
                  className="mb-4"
                />
              ) : (
                <Alert
                  message="卷绕几何正常"
                  description="条盒填充率合理，无堆叠风险"
                  type="success"
                  showIcon
                  icon={<CheckCircleOutlined />}
                  className="mb-4"
                />
              )}

              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Statistic
                    title="条盒填充率"
                    value={geometry.barrelFillRatio * 100}
                    precision={1}
                    suffix="%"
                    valueStyle={{
                      color: geometry.barrelFillRatio > 0.95 ? '#f5222d' :
                             geometry.barrelFillRatio < 0.6 ? '#faad14' : '#52c41a'
                    }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="总有效圈数"
                    value={geometry.totalTurns}
                    precision={1}
                    suffix="圈"
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="满卷圈数"
                    value={geometry.turnsFullyWound}
                    precision={1}
                    suffix="圈"
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="放松圈数"
                    value={geometry.turnsUnwound}
                    precision={1}
                    suffix="圈"
                  />
                </Col>
              </Row>

              <Divider />

              <div className="text-sm text-gray-600">
                <div className="flex justify-between py-1">
                  <Text type="secondary">最内层半径:</Text>
                  <Text strong>{formatDiameter(geometry.innerRadiusAtTurn(0))} mm</Text>
                </div>
                <div className="flex justify-between py-1">
                  <Text type="secondary">最外层半径:</Text>
                  <Text strong>{formatDiameter(geometry.outerRadiusAtTurn(geometry.turnsFullyWound - 1))} mm</Text>
                </div>
                <div className="flex justify-between py-1">
                  <Text type="secondary">发条截面积:</Text>
                  <Text strong>
                    {(currentMainspring?.length || 0) * (currentMainspring?.thickness || 0) * 1e6} mm²
                  </Text>
                </div>
                <div className="flex justify-between py-1">
                  <Text type="secondary">条盒可用面积:</Text>
                  <Text strong>
                    {(Math.PI * (
                      Math.pow((currentMainspring?.barrelInnerDiameter || 0) / 2, 2) -
                      Math.pow((currentMainspring?.arborDiameter || 0) / 2, 2)
                    ) * 1e6).toFixed(1)} mm²
                  </Text>
                </div>
              </div>
            </Card>
          )}

          {torqueAnalysis && (
            <Card title="初步性能估算">
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Statistic
                    title="满弦力矩"
                    value={torqueAnalysis.maxTorque * 1000}
                    precision={2}
                    suffix="mN·m"
                    valueStyle={{
                      color: torqueAnalysis.escapementImpactRisk ? '#f5222d' : '#1890ff'
                    }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="末端力矩"
                    value={torqueAnalysis.minTorque * 1000}
                    precision={2}
                    suffix="mN·m"
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="平均力矩"
                    value={torqueAnalysis.averageTorque * 1000}
                    precision={2}
                    suffix="mN·m"
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="力矩衰减"
                    value={torqueAnalysis.torqueDropPercentage}
                    precision={1}
                    suffix="%"
                    valueStyle={{
                      color: torqueAnalysis.torqueDropPercentage > 50 ? '#f5222d' :
                             torqueAnalysis.torqueDropPercentage > 35 ? '#faad14' : '#52c41a'
                    }}
                  />
                </Col>
                <Col span={24}>
                  <Statistic
                    title="估算动力储备"
                    value={torqueAnalysis.powerReserveHours}
                    precision={0}
                    suffix="小时"
                    prefix={<ExperimentOutlined />}
                    valueStyle={{ color: '#722ed1' }}
                  />
                </Col>
              </Row>

              {torqueAnalysis.escapementImpactRisk && (
                <Alert
                  message="擒纵冲击风险"
                  description={torqueAnalysis.impactRiskDescription || '满弦力矩过大'}
                  type="error"
                  showIcon
                  icon={<WarningOutlined />}
                  className="mt-4"
                />
              )}

              {torqueAnalysis.warningZones.length > 0 && (
                <div className="mt-4">
                  <Text type="warning" strong>
                    <WarningOutlined className="mr-1" />
                    警告区段 ({torqueAnalysis.warningZones.length}处):
                  </Text>
                  {torqueAnalysis.warningZones.map((zone, i) => (
                    <Tag key={i} color="orange" className="ml-2">
                      {Math.round(zone.startTurn * 100)}-{Math.round(zone.endTurn * 100)}%
                    </Tag>
                  ))}
                </div>
              )}
            </Card>
          )}
        </Col>
      </Row>

      <Card
        title={
          <Space>
            <ExperimentOutlined />
            反推计算（按目标动储能求料厚与长度）
            <Button
              type="link"
              onClick={() => setShowReverseCalc(!showReverseCalc)}
            >
              {showReverseCalc ? '收起' : '展开'}
            </Button>
          </Space>
        }
      >
        {showReverseCalc && (
          <div className="space-y-6">
            <Form
              form={reverseForm}
              layout="vertical"
              initialValues={{
                targetPowerReserve: 72,
                barrelInnerDiameter: 11.5,
                arborDiameter: 1.8,
                width: 1.1,
                material: 'Nivaflex',
                minThickness: 0.12,
                maxThickness: 0.25,
                minLength: 300,
                maxLength: 800
              }}
            >
              <Row gutter={16}>
                <Col span={6}>
                  <Form.Item label="目标动力储备" name="targetPowerReserve">
                    <InputNumber min={24} max={1000} step={1} style={{ width: '100%' }} addonAfter="小时" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="条盒内径" name="barrelInnerDiameter">
                    <InputNumber min={6} max={25} step={0.1} precision={2} style={{ width: '100%' }} addonAfter="mm" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="条轴直径" name="arborDiameter">
                    <InputNumber min={1} max={5} step={0.1} precision={2} style={{ width: '100%' }} addonAfter="mm" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="发条宽度" name="width">
                    <InputNumber min={0.5} max={3} step={0.05} precision={2} style={{ width: '100%' }} addonAfter="mm" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={6}>
                  <Form.Item label="材料" name="material">
                    <Select>
                      {Object.entries(MATERIALS).map(([key, mat]) => (
                        <Option key={key} value={key}>{mat.name}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="目标平均力矩" name="targetTorque">
                    <InputNumber min={1} max={10} step={0.1} precision={2} style={{ width: '100%' }} addonAfter="mN·m" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="料厚范围" name="minThickness">
                    <InputNumber min={0.08} max={0.4} step={0.01} precision={2} style={{ width: '100%' }} addonAfter="mm (最小)" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="~" name="maxThickness">
                    <InputNumber min={0.08} max={0.4} step={0.01} precision={2} style={{ width: '100%' }} addonAfter="mm (最大)" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={6}>
                  <Form.Item label="长度范围" name="minLength">
                    <InputNumber min={100} max={4000} step={10} style={{ width: '100%' }} addonAfter="mm (最小)" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="~" name="maxLength">
                    <InputNumber min={100} max={4000} step={10} style={{ width: '100%' }} addonAfter="mm (最大)" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label=" ">
                    <Button type="primary" icon={<CalculatorOutlined />} onClick={handleReverseCalculate} block>
                      开始反推计算
                    </Button>
                  </Form.Item>
                </Col>
              </Row>
            </Form>

            {reverseResults.length > 0 && (
              <div className="space-y-3">
                <Divider orientation="left">计算结果（按误差排序，前10项）</Divider>
                {reverseResults.map((result, index) => (
                  <Card
                    key={index}
                    size="small"
                    className={result.isValid ? '' : 'opacity-70'}
                    extra={
                      <Button size="small" type="primary" onClick={() => applyReverseResult(result)}>
                        应用此配置
                      </Button>
                    }
                  >
                    <Row gutter={16}>
                      <Col span={4}>
                        <Tag color={result.isValid ? 'green' : 'orange'}>
                          #{index + 1} {result.isValid ? '有效' : '参考'}
                        </Tag>
                      </Col>
                      <Col span={5}>
                        <Text type="secondary">料厚:</Text>
                        <Text strong className="ml-1">
                          {formatThickness(result.thickness)} mm
                        </Text>
                      </Col>
                      <Col span={5}>
                        <Text type="secondary">长度:</Text>
                        <Text strong className="ml-1">
                          {formatLength(result.length)} mm
                        </Text>
                      </Col>
                      <Col span={5}>
                        <Text type="secondary">动储:</Text>
                        <Text strong className="ml-1">
                          {result.estimatedPowerReserve.toFixed(0)} h
                        </Text>
                      </Col>
                      <Col span={5}>
                        <Text type="secondary">填充率:</Text>
                        <Text
                          strong
                          className={`ml-1 ${
                            result.barrelFillRatio > 0.95 ? 'text-red-500' :
                            result.barrelFillRatio < 0.6 ? 'text-yellow-500' : 'text-green-500'
                          }`}
                        >
                          {(result.barrelFillRatio * 100).toFixed(1)}%
                        </Text>
                      </Col>
                    </Row>
                    {result.warnings.length > 0 && (
                      <div className="mt-2 text-xs">
                        {result.warnings.map((w, i) => (
                          <Tag key={i} color="warning">{w}</Tag>
                        ))}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}

export default MainspringInputPage
