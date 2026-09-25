import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Drawer,
  Empty,
  Form,
  Input,
  List,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message
} from 'antd';
import { AuditOutlined, LockOutlined, LogoutOutlined, ReloadOutlined } from '@ant-design/icons';
import { ApiError, api } from '@/api/client';
import type { AdminQuestionReport, ReportStatusValue } from '@/types/bank';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

const STATUS_FILTERS: { value?: ReportStatusValue; label: string }[] = [
  { value: 'pending', label: '处理中' },
  { value: 'resolved', label: '已修正' },
  { value: 'rejected', label: '无需修改' }
];

const STATUS_COLOR: Record<ReportStatusValue, string> = {
  pending: 'orange',
  resolved: 'green',
  rejected: 'default'
};

interface OpsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function OpsPanel({ open, onClose }: OpsPanelProps) {
  const [opsToken, setOpsToken] = useState('');
  const [loginForm] = Form.useForm<{ username: string; password: string }>();
  const [reports, setReports] = useState<AdminQuestionReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ReportStatusValue | undefined>('pending');
  const [active, setActive] = useState<AdminQuestionReport | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reviewForm] = Form.useForm<{ status: 'resolved' | 'rejected'; handling_note: string }>();
  const [messageApi, contextHolder] = message.useMessage();

  const loadReports = useCallback(
    async (token: string, status?: ReportStatusValue) => {
      setLoading(true);
      try {
        const result = await api.adminListReports({ status }, token);
        setReports(result.results);
      } catch (error) {
        if (error instanceof ApiError && error.message.includes('登录')) {
          setOpsToken('');
        }
        messageApi.error(error instanceof Error ? error.message : '加载失败');
      } finally {
        setLoading(false);
      }
    },
    [messageApi]
  );

  useEffect(() => {
    if (open && opsToken) {
      void loadReports(opsToken, statusFilter);
    }
  }, [open, opsToken, statusFilter, loadReports]);

  async function handleLogin() {
    const values = await loginForm.validateFields();
    try {
      const result = await api.login(values.username.trim(), values.password);
      setOpsToken(result.access);
    } catch (error) {
      messageApi.error(error instanceof ApiError ? error.message : '登录失败');
    }
  }

  function openReview(record: AdminQuestionReport) {
    reviewForm.resetFields();
    setActive(record);
  }

  async function handleReview() {
    if (!active) {
      return;
    }
    const values = await reviewForm.validateFields();
    setSubmitting(true);
    try {
      const updated = await api.adminReviewReport(active.id, values, opsToken);
      messageApi.success(`报错 ${updated.code} 已标记为「${updated.statusLabel}」`);
      setActive(null);
      // 当前筛选下若已处理记录被移走（处理中视图），同步剔除；否则就地更新
      setReports((current) =>
        statusFilter && statusFilter !== 'pending'
          ? current.map((item) => (item.id === updated.id ? updated : item))
          : current.filter((item) => item.id !== updated.id)
      );
    } catch (error) {
      messageApi.error(error instanceof ApiError ? error.message : '处理失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Drawer
      title={
        <Space>
          <AuditOutlined />
          <span>题目报错运营台</span>
        </Space>
      }
      width={Math.min(860, typeof window === 'undefined' ? 860 : window.innerWidth - 32)}
      open={open}
      onClose={onClose}
      destroyOnClose
    >
      {contextHolder}
      {!opsToken ? (
        <Space direction="vertical" size={16} className="ops-login">
          <Alert
            type="info"
            showIcon
            message="运营账号登录"
            description="仅 is_staff 运营账号可查看和处理报错。Compose 部署默认账号 ops / ops123456（可用环境变量覆盖）。"
          />
          <Form form={loginForm} layout="vertical" initialValues={{ username: 'ops' }} style={{ maxWidth: 360 }}>
            <Form.Item name="username" label="账号" rules={[{ required: true, message: '请输入运营账号' }]}>
              <Input prefix={<LockOutlined />} placeholder="ops" />
            </Form.Item>
            <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
              <Input.Password placeholder="ops123456" onPressEnter={handleLogin} />
            </Form.Item>
            <Button type="primary" icon={<AuditOutlined />} onClick={handleLogin}>
              登录运营台
            </Button>
          </Form>
        </Space>
      ) : (
        <Space direction="vertical" size={12} className="ops-body">
          <Space wrap>
            <Select
              value={statusFilter ?? 'all'}
              style={{ width: 160 }}
              onChange={(value) => setStatusFilter(value === 'all' ? undefined : (value as ReportStatusValue))}
              options={[
                { value: 'all', label: '全部状态' },
                ...STATUS_FILTERS.map((item) => ({ value: item.value as string, label: item.label }))
              ]}
            />
            <Button icon={<ReloadOutlined />} loading={loading} onClick={() => loadReports(opsToken, statusFilter)}>
              刷新
            </Button>
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={() => {
                setOpsToken('');
                setReports([]);
              }}
            >
              退出运营账号
            </Button>
          </Space>

          <Table<AdminQuestionReport>
            rowKey="id"
            size="small"
            loading={loading}
            dataSource={reports}
            pagination={{ pageSize: 8, showSizeChanger: false }}
            locale={{ emptyText: <Empty description="没有符合条件的报错" /> }}
            columns={[
              { title: '编号', dataIndex: 'code', width: 104, render: (code) => <Text copyable>{code}</Text> },
              { title: '题目', dataIndex: 'questionId', width: 72, render: (id) => `#${id}` },
              {
                title: '问题类型',
                dataIndex: 'issueTypeLabel',
                width: 96,
                render: (label, record) => (
                  <Space direction="vertical" size={0}>
                    <span>{label}</span>
                    <Text type="secondary" className="report-sub">
                      {record.reporter}
                    </Text>
                  </Space>
                )
              },
              {
                title: '补充说明 / 处理说明',
                render: (_, record) => (
                  <Space direction="vertical" size={2}>
                    <Paragraph className="ops-detail" ellipsis={{ rows: 2 }}>
                      {record.detail}
                    </Paragraph>
                    {record.handlingNote && (
                      <Text type="secondary" className="report-sub">
                        处理说明：{record.handlingNote}
                      </Text>
                    )}
                  </Space>
                )
              },
              {
                title: '状态',
                dataIndex: 'status',
                width: 104,
                render: (value: ReportStatusValue, record) => (
                  <Badge
                    status={value === 'pending' ? 'processing' : value === 'resolved' ? 'success' : 'default'}
                    text={<Tag color={STATUS_COLOR[value]}>{record.statusLabel}</Tag>}
                  />
                )
              },
              {
                title: '操作',
                width: 92,
                render: (_, record) =>
                  record.status === 'pending' ? (
                    <Button size="small" type="primary" ghost onClick={() => openReview(record)}>
                      处理
                    </Button>
                  ) : (
                    <Text type="secondary" className="report-sub">
                      {record.handledBy ?? ''}
                    </Text>
                  )
              }
            ]}
          />
        </Space>
      )}

      <Modal
        title={active ? `处理报错 ${active.code}（题目 #${active.questionId}）` : ''}
        open={active !== null}
        onCancel={() => setActive(null)}
        onOk={handleReview}
        confirmLoading={submitting}
        okText="提交处理结果"
        cancelText="取消"
        destroyOnClose
      >
        {active && (
          <>
            <List
              size="small"
              bordered
              dataSource={[
                { label: '问题类型', value: active.issueTypeLabel },
                { label: '补充说明', value: active.detail },
                { label: '报告人', value: active.reporter },
                { label: '提交时间', value: active.createdAt }
              ]}
              renderItem={(item) => (
                <List.Item>
                  <Text strong style={{ width: 72, flexShrink: 0 }}>
                    {item.label}
                  </Text>
                  <span>{item.value}</span>
                </List.Item>
              )}
            />
            <Form form={reviewForm} layout="vertical" className="ops-review-form" initialValues={{ status: 'resolved' }}>
              <Tabs
                defaultActiveKey="resolved"
                onChange={(key) => reviewForm.setFieldValue('status', key)}
                items={[
                  { key: 'resolved', label: '已修正' },
                  { key: 'rejected', label: '无需修改' }
                ]}
              />
              <Form.Item name="status" hidden>
                <Input />
              </Form.Item>
              <Form.Item
                name="handling_note"
                label="处理说明"
                rules={[
                  { required: true, whitespace: true, message: '请填写处理说明，用户将在题目卡片看到' },
                  { max: 500, message: '处理说明不超过 500 字' }
                ]}
              >
                <TextArea
                  rows={4}
                  maxLength={500}
                  showCount
                  placeholder={
                    reviewForm.getFieldValue('status') === 'resolved'
                      ? '例如：已将答案修正为 42，并补充图示说明。'
                      : '例如：经核对原题与答案均无误，解析已说明判断依据。'
                  }
                />
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>
    </Drawer>
  );
}
