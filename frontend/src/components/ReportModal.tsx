import { useEffect, useState } from 'react';
import { Input, Modal, Select, Typography } from 'antd';
import type { Question } from '@/types/bank';

const { Text } = Typography;

const ISSUE_TYPE_OPTIONS = [
  { value: 'stem', label: '题干有误' },
  { value: 'answer', label: '答案有误' },
  { value: 'explanation', label: '解析有误' },
  { value: 'other', label: '其他问题' }
];

interface Props {
  question: Question | null;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (issueType: string, note: string) => void;
}

export function ReportModal({ question, submitting, onCancel, onSubmit }: Props) {
  const [issueType, setIssueType] = useState('stem');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (question) {
      setIssueType('stem');
      setNote('');
    }
  }, [question]);

  return (
    <Modal
      title="题目报错"
      open={question !== null}
      okText="提交报错"
      cancelText="取消"
      confirmLoading={submitting}
      onOk={() => onSubmit(issueType, note.trim())}
      onCancel={onCancel}
      destroyOnClose
    >
      {question && (
        <div className="report-form">
          <Text type="secondary">题目：{question.stem}</Text>
          <div className="report-field">
            <Text strong>问题类型</Text>
            <Select
              className="report-type"
              value={issueType}
              onChange={setIssueType}
              options={ISSUE_TYPE_OPTIONS}
            />
          </div>
          <div className="report-field">
            <Text strong>补充说明（选填）</Text>
            <Input.TextArea
              rows={3}
              maxLength={500}
              showCount
              placeholder="描述一下你发现的问题，方便运营核实"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
        </div>
      )}
    </Modal>
  );
}
