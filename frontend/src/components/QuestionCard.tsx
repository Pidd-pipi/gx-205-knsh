import { Alert, Button, Card, Radio, Space, Tag, Typography } from 'antd';
import { FlagOutlined } from '@ant-design/icons';
import type { Question, QuestionReport } from '@/types/bank';

const { Title, Paragraph } = Typography;

interface Props {
  question: Question;
  index: number;
  answer?: string;
  report?: QuestionReport;
  onAnswer: (questionId: number, value: string) => void;
  onReport: (question: Question) => void;
}

export function QuestionCard({ question, index, answer, report, onAnswer, onReport }: Props) {
  return (
    <Card size="small" className="question-card">
      <Space wrap className="question-meta">
        <Tag>{question.type}</Tag>
        <Tag color="blue">{question.difficulty}</Tag>
        <Tag color="gold">{question.knowledge}</Tag>
        {report?.status === 'pending' && <Tag color="processing">报错处理中 · 编号 #{report.id}</Tag>}
        <Button
          type="link"
          size="small"
          icon={<FlagOutlined />}
          onClick={() => onReport(question)}
        >
          报错
        </Button>
      </Space>
      <Title level={5}>{index + 1}. {question.stem}</Title>
      <Radio.Group value={answer} onChange={(event) => onAnswer(question.id, event.target.value)}>
        <Space direction="vertical">
          {question.options.map((option) => <Radio key={option} value={option}>{option}</Radio>)}
        </Space>
      </Radio.Group>
      <Paragraph className="explain">解析：{question.explanation}</Paragraph>
      {report && report.status !== 'pending' && (
        <Alert
          className="report-result"
          type={report.status === 'fixed' ? 'success' : 'info'}
          showIcon
          message={`你的报错（编号 #${report.id}）处理结果：${report.status_label}`}
          description={report.resolution_note ? `处理说明：${report.resolution_note}` : undefined}
        />
      )}
    </Card>
  );
}
