import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

export function formatTime(date: string): string {
  return dayjs(date).fromNow();
}

export function formatDate(date: string): string {
  return dayjs(date).format('YYYY-MM-DD HH:mm');
}

export default dayjs;
