import { useState } from 'react';
import { Button, Card, Empty, Input, Radio, Space, Tag, Typography } from 'antd';
import type { QuestionReport } from '@/types/bank';

const { Text, Paragraph } = Typography;

interface ItemProps {
  report: QuestionReport;
  onResolve: (reportId: number, result: 'fixed' | 'nochange', note: string) => Promise<void>;
}

function OpsReportItem({ report, onResolve }: ItemProps) {
  const [result, setResult] = useState<'fixed' | 'nochange'>('fixed');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleResolve() {
    setSubmitting(true);
    try {
      await onResolve(report.id, result, note.trim());
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card size="small" className="ops-item">
      <Space wrap>
        <Tag color="processing">编号 #{report.id}</Tag>
        <Tag>{report.issue_type_label}</Tag>
        <Text type="secondary">报告人：{report.username}</Text>
      </Space>
      <Paragraph className="ops-stem">题目：{report.question_stem || `#${report.question_id}`}</Paragraph>
      {report.note && <Paragraph className="ops-note">补充说明：{report.note}</Paragraph>}
      <Space direction="vertical" className="ops-actions">
        <Radio.Group
          value={result}
          onChange={(event) => setResult(event.target.value)}
          options={[
            { value: 'fixed', label: '已修正' },
            { value: 'nochange', label: '无需修改' }
          ]}
        />
        <Input.TextArea
          rows={2}
          maxLength={500}
          placeholder="处理说明（必填，用户将再次做题时看到）"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <Button type="primary" size="small" loading={submitting} disabled={!note.trim()} onClick={handleResolve}>
          提交处理结果
        </Button>
      </Space>
    </Card>
  );
}

interface Props {
  reports: QuestionReport[];
  onResolve: (reportId: number, result: 'fixed' | 'nochange', note: string) => Promise<void>;
}

export function OpsPanel({ reports, onResolve }: Props) {
  return (
    <Card title={`运营处理台（待处理 ${reports.length} 条）`} className="block">
      {reports.length === 0 ? (
        <Empty description="暂无待处理的报错" />
      ) : (
        <Space direction="vertical" size={12} className="question-list">
          {reports.map((report) => (
            <OpsReportItem key={report.id} report={report} onResolve={onResolve} />
          ))}
        </Space>
      )}
    </Card>
  );
}
