import { UserLevel } from '@/types';

export function getLevelName(level: UserLevel): string {
  const names: Record<UserLevel, string> = {
    SEED: '种子',
    SPROUT: '幼苗',
    FLOWER: '花朵',
    TREE: '参天大树'
  };
  return names[level];
}

export function getLevelIcon(level: UserLevel): string {
  const icons: Record<UserLevel, string> = {
    SEED: '🌰',
    SPROUT: '🌱',
    FLOWER: '🌸',
    TREE: '🌳'
  };
  return icons[level];
}

export default function LevelBadge({ level }: { level: UserLevel }) {
  return (
    <span className={`level-badge level-${level}`}>
      {getLevelIcon(level)} {getLevelName(level)}
    </span>
  );
}
