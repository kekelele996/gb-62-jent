import { v4 as uuidv4 } from 'uuid';

export const generateFileName = (originalName: string): string => {
  const ext = originalName.split('.').pop() || '';
  const timestamp = Date.now();
  const random = uuidv4().split('-')[0];
  return `${timestamp}-${random}.${ext}`;
};
