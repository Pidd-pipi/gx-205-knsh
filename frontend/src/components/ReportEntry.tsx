import { useState } from 'react';
import { Alert, Button, Form, Input, Modal, Select, Space, Tag, Typography, message } from 'antd';
import { CheckCircleFilled, CloseCircleFilled, WarningFilled } from '@ant-design/icons';
import { ApiError, api } from '@/api/client';
import { useBankStore } from '@/store/useBankStore';
import type { IssueType, Question } from '@/types/bank';

const { Text } = Typography;
const { TextArea } = Input;

const ISSUE_OPTIONS: { value: IssueType; label: string }[] = [
  { value: 'stem', label: '题干有误' },
  { value: 'answer', label: '答案有误' },
  { value: 'explanation', label: '解析有误' },
  { value: 'other', label: '其他问题' }
];

interface ReportEntryProps {
  question: Question;
}

function StatusBanner({ question }: ReportEntryProps) {
  const status = question.reportStatus;
  if (!status) {
    return null;
  }

  if (status.status === 'pending') {
    return (
      <Alert
        className="report-alert"
        type="warning"
        showIcon
        icon={<WarningFilled />}
        message={
          <Space size={8} wrap>
            <Text strong>报错处理中</Text>
            <Tag>编号 {status.code}</Tag>
            <Text type="secondary" className="report-sub">
              {status.issueTypeLabel} · 提交于 {status.createdAt}
            </Text>
          </Space>
        }
        description="运营核实期间，题目与解析可正常作答；处理完成后会在此展示结果，无需重复提交。"
      />
    );
  }

  const resolved = status.status === 'resolved';
  return (
    <Alert
      className="report-alert"
      type={resolved ? 'success' : 'info'}
      showIcon
      icon={resolved ? <CheckCircleFilled /> : <CloseCircleFilled />}
      message={
        <Space size={8} wrap>
          <Text strong>{resolved ? '报错已修正' : '经核对无需修改'}</Text>
          <Tag color={resolved ? 'green' : 'default'}>编号 {status.code}</Tag>
          {status.handledAt && <Text type="secondary" className="report-sub">处理于 {status.handledAt}</Text>}
        </Space>
      }
      description={
        <Space direction="vertical" size={4}>
          <Text>处理说明：{status.handlingNote}</Text>
          <Text type="secondary" className="report-sub">如仍有疑问，可再次提交报错。</Text>
        </Space>
      }
    />
  );
}

export function ReportEntry({ question }: ReportEntryProps) {
  const { token, patchQuestionReport } = useBankStore();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<{ issue_type: IssueType; detail: string }>();
  const [messageApi, contextHolder] = message.useMessage();

  const pending = question.reportStatus?.status === 'pending';

  function openModal() {
    if (!token) {
      messageApi.warning('请先点击右上角"演示登录"后再提交报错');
      return;
    }
    form.resetFields();
    setOpen(true);
  }

  async function handleSubmit() {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      const result = await api.createReport(
        { question_id: question.id, issue_type: values.issue_type, detail: values.detail.trim() },
        token
      );
      patchQuestionReport(question.id, result.report);
      setOpen(false);
      messageApi.success(
        result.duplicated
          ? `该题已有一条处理中的报错（编号 ${result.report.code}），无需重复提交`
          : `报错已提交，编号 ${result.report.code}`
      );
    } catch (error) {
      if (error instanceof ApiError) {
        messageApi.error(error.message);
      } else {
        messageApi.error('提交失败，请稍后重试');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="report-entry">
      {contextHolder}
      <StatusBanner question={question} />
      <Button
        size="small"
        type={pending ? 'default' : 'text'}
        danger={!pending}
        disabled={pending}
        title={pending ? '该题已有一条报错正在处理，无需重复提交' : undefined}
        onClick={openModal}
      >
        {pending ? '报错处理中，请勿重复提交' : question.reportStatus ? '再次报错' : '题目有误？报错'}
      </Button>
      <Modal
        title={`题目报错 · 第 ${question.id} 题`}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleSubmit}
        confirmLoading={submitting}
        okText="提交报错"
        cancelText="取消"
        destroyOnClose
      >
        <p className="report-stem">{question.stem}</p>
        <Form form={form} layout="vertical" initialValues={{ issue_type: 'stem' }}>
          <Form.Item
            name="issue_type"
            label="问题类型"
            rules={[{ required: true, message: '请选择问题类型' }]}
          >
            <Select options={ISSUE_OPTIONS} />
          </Form.Item>
          <Form.Item
            name="detail"
            label="补充说明"
            rules={[
              { required: true, whitespace: true, message: '请填写补充说明' },
              { max: 500, message: '补充说明不超过 500 字' }
            ]}
          >
            <TextArea rows={4} maxLength={500} showCount placeholder="请描述题干、答案或解析的具体问题，方便运营核实" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
