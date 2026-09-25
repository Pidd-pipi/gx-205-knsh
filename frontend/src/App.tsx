import { useEffect, useMemo, useState } from 'react';
import { Alert, App as AntApp, Button, Card, Col, ConfigProvider, Form, Layout, Progress, Row, Select, Space, Statistic, Table, Tag, Typography } from 'antd';
import { BookOutlined, ClockCircleOutlined, CrownOutlined, ExperimentOutlined, LogoutOutlined, ReloadOutlined, ToolOutlined } from '@ant-design/icons';
import { api } from '@/api/client';
import { AbilityRadar } from '@/components/AbilityRadar';
import { OpsPanel } from '@/components/OpsPanel';
import { QuestionCard } from '@/components/QuestionCard';
import { ReportModal } from '@/components/ReportModal';
import { useBankStore } from '@/store/useBankStore';
import type { Question, QuestionReport } from '@/types/bank';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

function pickReport(reports: QuestionReport[], questionId: number): QuestionReport | undefined {
  const matched = reports.filter((item) => item.question_id === questionId);
  return matched.find((item) => item.status === 'pending') ?? matched[0];
}

function App() {
  const {
    dashboard,
    loading,
    error,
    token,
    username,
    isStaff,
    reports,
    pendingReports,
    loadDashboard,
    demoLogin,
    opsLogin,
    logout,
    submitReport,
    resolveReport
  } = useBankStore();
  const { message } = AntApp.useApp();
  const [difficulty, setDifficulty] = useState('中级');
  const [amount, setAmount] = useState(10);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [report, setReport] = useState<string[]>([]);
  const [reportTarget, setReportTarget] = useState<Question | null>(null);
  const [reportSubmitting, setReportSubmitting] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const paper = useMemo(() => dashboard?.paper ?? [], [dashboard]);

  async function submitExam() {
    const result = await api.submitExam(answers);
    setReport([`得分 ${result.score}`, result.rank_hint, ...result.analysis]);
  }

  function openReport(question: Question) {
    if (!token) {
      message.warning('请先点击右上角「演示登录」，登录后再提交报错');
      return;
    }
    setReportTarget(question);
  }

  async function handleSubmitReport(issueType: string, note: string) {
    if (!reportTarget) return;
    setReportSubmitting(true);
    try {
      const result = await submitReport(reportTarget.id, issueType, note);
      if (result.duplicated) {
        message.info(`该题已有处理中的报错，已返回原编号 #${result.report.id}`);
      } else {
        message.success(`报错已提交，编号 #${result.report.id}，原题和解析可继续练习`);
      }
      setReportTarget(null);
    } catch (submitError) {
      message.error(submitError instanceof Error ? submitError.message : '报错提交失败');
    } finally {
      setReportSubmitting(false);
    }
  }

  async function handleResolve(reportId: number, result: 'fixed' | 'nochange', note: string) {
    try {
      await resolveReport(reportId, result, note);
      message.success(`报错 #${reportId} 已标记为${result === 'fixed' ? '已修正' : '无需修改'}`);
    } catch (resolveError) {
      message.error(resolveError instanceof Error ? resolveError.message : '处理失败');
      throw resolveError;
    }
  }

  return (
    <Layout className="page">
      <Content className="shell">
        <section className="hero">
          <div>
            <Text className="eyebrow">GXLogic Bank</Text>
            <Title>逻辑推理题库系统</Title>
            <Paragraph>题型分类、智能组卷、答题解析、错题追踪、模拟考试和段位排名整合在同一个练习台。</Paragraph>
          </div>
          <Space wrap>
            <Button icon={<ReloadOutlined />} loading={loading} onClick={loadDashboard}>刷新</Button>
            {token ? (
              <>
                <Tag color="green">{isStaff ? `运营：${username}` : `用户：${username}`}</Tag>
                <Button icon={<LogoutOutlined />} onClick={logout}>退出登录</Button>
              </>
            ) : (
              <>
                <Button type="primary" icon={<CrownOutlined />} onClick={demoLogin}>演示登录</Button>
                <Button icon={<ToolOutlined />} onClick={opsLogin}>运营登录</Button>
              </>
            )}
          </Space>
        </section>

        {error && <Alert type="error" message={error} showIcon className="block" />}

        {dashboard && (
          <>
            <Row gutter={[16, 16]} className="block">
              <Col xs={24} sm={12} lg={6}><Card><Statistic title="累计答题" value={dashboard.profile.totalAnswered} prefix={<BookOutlined />} /></Card></Col>
              <Col xs={24} sm={12} lg={6}><Card><Statistic title="正确率" value={dashboard.profile.correctRate} suffix="%" /></Card></Col>
              <Col xs={24} sm={12} lg={6}><Card><Statistic title="连续正确天数" value={dashboard.profile.streakDays} prefix={<ClockCircleOutlined />} /></Card></Col>
              <Col xs={24} sm={12} lg={6}><Card><Statistic title="当前段位" value={dashboard.profile.tier} prefix={<CrownOutlined />} /></Card></Col>
            </Row>

            <Row gutter={[16, 16]} className="block">
              <Col xs={24} lg={15}>
                <Card title="智能组卷练习" extra={<Tag color="green">限时考试可扩展</Tag>}>
                  <Form layout="inline" className="paper-form">
                    <Form.Item label="难度">
                      <Select value={difficulty} onChange={setDifficulty} options={['入门', '初级', '中级', '高级', '专家'].map((value) => ({ value, label: value }))} />
                    </Form.Item>
                    <Form.Item label="题量">
                      <Select value={amount} onChange={setAmount} options={[10, 20, 30, 50].map((value) => ({ value, label: `${value} 题` }))} />
                    </Form.Item>
                    <Button icon={<ExperimentOutlined />} onClick={() => api.generatePaper(difficulty, amount)}>生成试卷</Button>
                  </Form>

                  <Space direction="vertical" size={16} className="question-list">
                    {paper.map((question, index) => (
                      <QuestionCard
                        key={question.id}
                        question={question}
                        index={index}
                        answer={answers[question.id]}
                        report={pickReport(reports, question.id)}
                        onAnswer={(questionId, value) => setAnswers({ ...answers, [questionId]: value })}
                        onReport={openReport}
                      />
                    ))}
                  </Space>
                  <Button type="primary" className="submit" onClick={submitExam}>提交并生成报告</Button>
                  {report.length > 0 && <Alert type="success" message="考试报告" description={report.join('；')} showIcon className="block" />}
                </Card>
              </Col>

              <Col xs={24} lg={9}>
                <Card title="学习进度雷达">
                  <AbilityRadar data={dashboard.radar} />
                </Card>
                <Card title="题型分类题库" className="stacked">
                  {dashboard.categories.map((category) => (
                    <div className="category-row" key={category.id}>
                      <Text>{category.name}</Text>
                      <Progress percent={category.accuracy} size="small" />
                    </div>
                  ))}
                </Card>
              </Col>
            </Row>

            {isStaff && (
              <OpsPanel reports={pendingReports} onResolve={handleResolve} />
            )}

            <Row gutter={[16, 16]} className="block">
              <Col xs={24} lg={12}>
                <Card title="错题本与收藏">
                  <Table
                    size="small"
                    rowKey="id"
                    dataSource={dashboard.wrongBook}
                    pagination={false}
                    columns={[
                      { title: '题目', dataIndex: 'title' },
                      { title: '类型', dataIndex: 'type', width: 110 },
                      { title: '错误次数', dataIndex: 'mistakes', width: 90 },
                      { title: '最后练习', dataIndex: 'lastPracticed', width: 110 }
                    ]}
                  />
                </Card>
              </Col>
              <Col xs={24} lg={12}>
                <Card title="排行榜与段位">
                  <Table
                    size="small"
                    rowKey="rank"
                    dataSource={dashboard.rankings}
                    pagination={false}
                    columns={[
                      { title: '#', dataIndex: 'rank', width: 54 },
                      { title: '用户', dataIndex: 'name' },
                      { title: '段位', dataIndex: 'tier', width: 90 },
                      { title: '得分', dataIndex: 'score', width: 90 },
                      { title: '正确率', dataIndex: 'accuracy', width: 90, render: (value) => `${value}%` }
                    ]}
                  />
                </Card>
              </Col>
            </Row>
          </>
        )}

        <ReportModal
          question={reportTarget}
          submitting={reportSubmitting}
          onCancel={() => setReportTarget(null)}
          onSubmit={handleSubmitReport}
        />
      </Content>
    </Layout>
  );
}

export default function Root() {
  return (
    <ConfigProvider theme={{ token: { borderRadius: 8, colorPrimary: '#2f6b57' } }}>
      <AntApp>
        <App />
      </AntApp>
    </ConfigProvider>
  );
}
