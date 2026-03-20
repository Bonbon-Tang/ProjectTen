import { Tag } from 'antd';
import {
  ClockCircleOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  MinusCircleOutlined,
  HourglassOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { EVAL_STATUS_MAP } from '@/utils/constants';

interface StatusTagProps {
  status: string;
  progress?: number;
}

const iconMap: Record<string, React.ReactNode> = {
  pending: <HourglassOutlined />,
  queued: <ClockCircleOutlined />,
  running: <SyncOutlined spin />,
  completed: <CheckCircleOutlined />,
  failed: <CloseCircleOutlined />,
  cancelled: <MinusCircleOutlined />,
  terminated: <StopOutlined />,
};

export default function StatusTag({ status, progress }: StatusTagProps) {
  const config = EVAL_STATUS_MAP[status];
  if (!config) {
    return <Tag>{status}</Tag>;
  }

  const label = status === 'running' && progress !== undefined
    ? `${config.label} ${progress}%`
    : config.label;

  return (
    <Tag color={config.color} icon={iconMap[status]} className={status === 'running' ? 'status-running' : ''}>
      {label}
    </Tag>
  );
}
