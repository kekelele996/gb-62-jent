import prisma from '../config/prisma';
import { Prisma } from '@prisma/client';

export class ChallengeServiceError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ChallengeServiceError';
  }
}

const isUniqueConstraintError = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 同一（挑战, 用户）的写操作在进程内串行，避免同用户双击产生的占名额/归还竞态；
// 跨实例并发仍由数据库唯一约束和原子条件更新兜底。
const lockTails = new Map<string, Promise<void>>();

const withUserLock = <T>(challengeId: string, userId: string, fn: () => Promise<T>): Promise<T> => {
  const key = `${challengeId}:${userId}`;
  const previous = lockTails.get(key) ?? Promise.resolve();

  const result = previous.catch(() => undefined).then(fn);
  // 队列尾只关心操作结束，不传播结果，避免一次失败中断后续排队
  const tail = result.then(
    () => undefined,
    () => undefined
  );
  lockTails.set(key, tail);
  tail.then(() => {
    if (lockTails.get(key) === tail) {
      lockTails.delete(key);
    }
  });
  return result;
};

const parseDate = (value: unknown, field: string): Date => {
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new ChallengeServiceError(400, `缺少${field}`);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ChallengeServiceError(400, `${field}时间格式无效`);
  }
  return date;
};

// 归还名额：原子递减，失败重试，最终用真实报名数对账，保证名额不错位
const releaseSlot = async (challengeId: string): Promise<void> => {
  for (let attempt = 0; attempt < 3; attempt++) {
    const result = await prisma.challenge.updateMany({
      where: { id: challengeId, registeredCount: { gt: 0 } },
      data: { registeredCount: { decrement: 1 } }
    });
    if (result.count === 1) return;
    await sleep(20 * (attempt + 1));
  }
  await reconcileRegisteredCount(challengeId);
};

// 以 ChallengeRegistration 中的真实报名数为准校准计数器
const reconcileRegisteredCount = async (challengeId: string): Promise<void> => {
  const [challenge, actual] = await Promise.all([
    prisma.challenge.findUnique({
      where: { id: challengeId },
      select: { registeredCount: true }
    }),
    prisma.challengeRegistration.count({ where: { challengeId } })
  ]);

  if (challenge && challenge.registeredCount !== actual) {
    await prisma.challenge.update({
      where: { id: challengeId },
      data: { registeredCount: actual }
    });
  }
};

const PUBLIC_USER_SELECT = {
  id: true,
  username: true,
  avatar: true,
  level: true
};

// 组装活动页展示数据：剩余名额、个人报名状态、个人提交状态
const serializeChallenge = (
  challenge: any,
  viewerId?: string,
  viewerState?: { registered: boolean; submission: any }
) => {
  const now = Date.now();
  const registrationDeadline = new Date(challenge.registrationDeadline).getTime();
  const submissionDeadline = new Date(challenge.submissionDeadline).getTime();
  const registeredCount = challenge.registeredCount ?? 0;

  return {
    id: challenge.id,
    title: challenge.title,
    description: challenge.description,
    coverImage: challenge.coverImage,
    startDate: challenge.startDate,
    endDate: challenge.endDate,
    isActive: challenge.isActive,
    capacity: challenge.capacity,
    registeredCount,
    remainingSlots: Math.max(0, challenge.capacity - registeredCount),
    registrationDeadline: challenge.registrationDeadline,
    submissionDeadline: challenge.submissionDeadline,
    registrationOpen:
      challenge.isActive && now <= registrationDeadline && registeredCount < challenge.capacity,
    submissionOpen: now <= submissionDeadline,
    _count: challenge._count ?? {
      registrations: registeredCount,
      submissions: challenge.submissions?.length ?? 0
    },
    submissions: challenge.submissions,
    // 当前登录用户的个人状态；未登录时为 null
    registrationStatus: viewerId ? (viewerState?.registered ? 'registered' : null) : null,
    mySubmission: viewerId ? viewerState?.submission ?? null : null,
    createdAt: challenge.createdAt,
    updatedAt: challenge.updatedAt
  };
};

const getViewerStateForMany = async (challengeIds: string[], viewerId?: string) => {
  if (!viewerId || challengeIds.length === 0) return new Map<string, { registered: boolean; submission: any }>();

  const [registrations, submissions] = await Promise.all([
    prisma.challengeRegistration.findMany({
      where: { userId: viewerId, challengeId: { in: challengeIds } },
      select: { challengeId: true, createdAt: true }
    }),
    prisma.challengeSubmission.findMany({
      where: { userId: viewerId, challengeId: { in: challengeIds } }
    })
  ]);

  const stateMap = new Map<string, { registered: boolean; submission: any }>();
  for (const id of challengeIds) {
    stateMap.set(id, { registered: false, submission: null });
  }
  for (const reg of registrations) {
    stateMap.get(reg.challengeId)!.registered = true;
  }
  for (const sub of submissions) {
    const state = stateMap.get(sub.challengeId);
    if (state) state.submission = sub;
  }
  return stateMap;
};

export const createChallenge = async (data: {
  title?: string;
  description?: string;
  coverImage?: string;
  capacity?: number | string;
  startDate?: string;
  endDate?: string;
  registrationDeadline?: string;
  submissionDeadline?: string;
}) => {
  const title = typeof data.title === 'string' ? data.title.trim() : '';
  const description = typeof data.description === 'string' ? data.description.trim() : '';
  if (!title) throw new ChallengeServiceError(400, '活动标题不能为空');
  if (!description) throw new ChallengeServiceError(400, '活动描述不能为空');

  const capacity = Number(data.capacity);
  if (!Number.isInteger(capacity) || capacity <= 0) {
    throw new ChallengeServiceError(400, '名额必须是正整数');
  }

  const registrationDeadline = parseDate(data.registrationDeadline, '报名截止时间');
  const submissionDeadline = parseDate(data.submissionDeadline, '成果截止时间');
  if (submissionDeadline.getTime() < registrationDeadline.getTime()) {
    throw new ChallengeServiceError(400, '成果截止时间不能早于报名截止时间');
  }

  // startDate/endDate 仅用于活动时间展示，缺省时给出合理默认值
  const startDate = data.startDate ? parseDate(data.startDate, '活动开始时间') : new Date();
  const endDate = data.endDate
    ? parseDate(data.endDate, '活动结束时间')
    : submissionDeadline;

  return prisma.challenge.create({
    data: {
      title,
      description,
      coverImage: data.coverImage || null,
      capacity,
      startDate,
      endDate,
      registrationDeadline,
      submissionDeadline
    }
  });
};

export const listChallenges = async (options: { active?: boolean; viewerId?: string }) => {
  const where: Prisma.ChallengeWhereInput = {};
  if (options.active !== undefined) {
    where.isActive = options.active;
  }

  const challenges = await prisma.challenge.findMany({
    where,
    include: {
      _count: {
        select: { registrations: true, submissions: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const viewerState = await getViewerStateForMany(
    challenges.map((c) => c.id),
    options.viewerId
  );

  return challenges.map((c) =>
    serializeChallenge(
      { ...c, registeredCount: c.registeredCount },
      options.viewerId,
      options.viewerId ? viewerState.get(c.id) : undefined
    )
  );
};

export const getChallengeById = async (id: string, viewerId?: string) => {
  const challenge = await prisma.challenge.findUnique({
    where: { id },
    include: {
      submissions: {
        include: {
          user: { select: PUBLIC_USER_SELECT }
        },
        orderBy: { createdAt: 'desc' }
      },
      _count: {
        select: { registrations: true, submissions: true }
      }
    }
  });

  if (!challenge) {
    throw new ChallengeServiceError(404, '活动不存在');
  }

  let viewerState: { registered: boolean; submission: any } | undefined;
  if (viewerId) {
    const [registration, submission] = await Promise.all([
      prisma.challengeRegistration.findUnique({
        where: { challengeId_userId: { challengeId: id, userId: viewerId } },
        select: { id: true, createdAt: true }
      }),
      prisma.challengeSubmission.findUnique({
        where: { challengeId_userId: { challengeId: id, userId: viewerId } }
      })
    ]);
    viewerState = { registered: !!registration, submission };
  }

  return serializeChallenge(challenge, viewerId, viewerState);
};

// 报名：名额原子占用 + 唯一记录落库，任一环节失败都回滚名额
export const registerForChallenge = (challengeId: string, userId: string) =>
  withUserLock(challengeId, userId, () => registerForChallengeLocked(challengeId, userId));

const registerForChallengeLocked = async (challengeId: string, userId: string) => {
  const now = new Date();

  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
  if (!challenge) throw new ChallengeServiceError(404, '活动不存在');
  if (!challenge.isActive) throw new ChallengeServiceError(400, '活动未开放报名');
  if (now > challenge.registrationDeadline) {
    throw new ChallengeServiceError(400, '报名已截止，无法报名');
  }
  if (challenge.registeredCount >= challenge.capacity) {
    throw new ChallengeServiceError(400, '名额已满');
  }

  const existing = await prisma.challengeRegistration.findUnique({
    where: { challengeId_userId: { challengeId, userId } }
  });
  if (existing) {
    throw new ChallengeServiceError(400, '您已报名该挑战，请勿重复报名');
  }

  // 原子占名额：仅限报名截止前、且剩余名额大于 0，并发下只有 capacity 个请求能成功
  const claimed = await prisma.challenge.updateMany({
    where: {
      id: challengeId,
      isActive: true,
      registrationDeadline: { gte: now },
      registeredCount: { lt: prisma.challenge.fields.capacity }
    },
    data: { registeredCount: { increment: 1 } }
  });

  if (claimed.count === 0) {
    // 并发落败：以最新状态整次拒绝，且名额没有被本次请求占用
    const fresh = await prisma.challenge.findUnique({ where: { id: challengeId } });
    if (!fresh) throw new ChallengeServiceError(404, '活动不存在');
    if (now > fresh.registrationDeadline) {
      throw new ChallengeServiceError(400, '报名已截止，无法报名');
    }
    throw new ChallengeServiceError(400, '名额已满');
  }

  try {
    const registration = await prisma.challengeRegistration.create({
      data: { challengeId, userId }
    });
    return registration;
  } catch (error) {
    // 唯一约束冲突（并发重复报名）或写入失败：归还本次占用的名额，整次拒绝
    await releaseSlot(challengeId);
    if (isUniqueConstraintError(error)) {
      throw new ChallengeServiceError(400, '您已报名该挑战，请勿重复报名');
    }
    throw new ChallengeServiceError(500, '报名失败，请稍后重试');
  }
};

// 取消报名：仅报名截止前生效，并释放名额
export const cancelRegistration = (challengeId: string, userId: string) =>
  withUserLock(challengeId, userId, () => cancelRegistrationLocked(challengeId, userId));

const cancelRegistrationLocked = async (challengeId: string, userId: string) => {
  const now = new Date();

  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
  if (!challenge) throw new ChallengeServiceError(404, '活动不存在');
  if (now > challenge.registrationDeadline) {
    throw new ChallengeServiceError(400, '报名已截止，无法取消');
  }

  const registration = await prisma.challengeRegistration.findUnique({
    where: { challengeId_userId: { challengeId, userId } }
  });
  if (!registration) {
    throw new ChallengeServiceError(400, '您尚未报名该挑战');
  }

  const submission = await prisma.challengeSubmission.findUnique({
    where: { challengeId_userId: { challengeId, userId } },
    select: { id: true }
  });
  if (submission) {
    throw new ChallengeServiceError(400, '已提交成果，不能取消报名');
  }

  // 先原子归还名额（附带报名截止闸门），再删除报名记录，任何失败都保持原状
  const released = await prisma.challenge.updateMany({
    where: {
      id: challengeId,
      registrationDeadline: { gte: now },
      registeredCount: { gt: 0 }
    },
    data: { registeredCount: { decrement: 1 } }
  });

  if (released.count === 0) {
    const fresh = await prisma.challenge.findUnique({
      where: { id: challengeId },
      select: { registrationDeadline: true, registeredCount: true }
    });
    if (fresh && now > fresh.registrationDeadline) {
      throw new ChallengeServiceError(400, '报名已截止，无法取消');
    }
    // 计数器异常：先删除记录，再以真实报名数对账
    try {
      await prisma.challengeRegistration.delete({
        where: { challengeId_userId: { challengeId, userId } }
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025')) {
        throw error;
      }
    }
    await reconcileRegisteredCount(challengeId);
    return { cancelled: true };
  }

  try {
    await prisma.challengeRegistration.delete({
      where: { challengeId_userId: { challengeId, userId } }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      // 报名记录已不存在（如并发重复取消）：按真实报名数对账，避免多释放名额
      await reconcileRegisteredCount(challengeId);
      throw new ChallengeServiceError(400, '您尚未报名该挑战');
    }
    // 删除写入失败：恢复名额，报名状态保持不变
    await prisma.challenge.update({
      where: { id: challengeId },
      data: { registeredCount: { increment: 1 } }
    });
    throw new ChallengeServiceError(500, '取消失败，请稍后重试');
  }

  return { cancelled: true };
};

// 提交成果：报名成功后才能提交，每人限一份，成果截止后不可提交
export const submitResult = (
  challengeId: string,
  userId: string,
  payload: { content?: string; images?: string[] }
) => withUserLock(challengeId, userId, () => submitResultLocked(challengeId, userId, payload));

const submitResultLocked = async (
  challengeId: string,
  userId: string,
  payload: { content?: string; images?: string[] }
) => {
  const content = typeof payload.content === 'string' ? payload.content.trim() : '';
  const images = Array.isArray(payload.images)
    ? payload.images.filter((img) => typeof img === 'string')
    : [];

  if (!content && images.length === 0) {
    throw new ChallengeServiceError(400, '请填写成果内容或上传成果图片');
  }

  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
  if (!challenge) throw new ChallengeServiceError(404, '活动不存在');

  const now = new Date();
  if (now > challenge.submissionDeadline) {
    throw new ChallengeServiceError(400, '成果提交已截止');
  }

  const registration = await prisma.challengeRegistration.findUnique({
    where: { challengeId_userId: { challengeId, userId } },
    select: { id: true }
  });
  if (!registration) {
    throw new ChallengeServiceError(403, '请先报名后再提交成果');
  }

  const existing = await prisma.challengeSubmission.findUnique({
    where: { challengeId_userId: { challengeId, userId } }
  });
  if (existing) {
    throw new ChallengeServiceError(400, '您已提交过成果，每人限一份');
  }

  try {
    const submission = await prisma.challengeSubmission.create({
      data: { challengeId, userId, content, images },
      include: { user: { select: PUBLIC_USER_SELECT } }
    });
    return submission;
  } catch (error) {
    // 并发下唯一约束兜底：拒绝重复提交，不产生第二份成果
    if (isUniqueConstraintError(error)) {
      throw new ChallengeServiceError(400, '您已提交过成果，每人限一份');
    }
    throw new ChallengeServiceError(500, '提交失败，请稍后重试');
  }
};

// 修改成果：成果截止前可修改，截止后整次拒绝
export const updateSubmission = (
  challengeId: string,
  userId: string,
  payload: { content?: string; images?: string[] }
) => withUserLock(challengeId, userId, () => updateSubmissionLocked(challengeId, userId, payload));

const updateSubmissionLocked = async (
  challengeId: string,
  userId: string,
  payload: { content?: string; images?: string[] }
) => {
  const content = typeof payload.content === 'string' ? payload.content.trim() : '';
  const images = Array.isArray(payload.images)
    ? payload.images.filter((img) => typeof img === 'string')
    : [];

  if (!content && images.length === 0) {
    throw new ChallengeServiceError(400, '请填写成果内容或上传成果图片');
  }

  const now = new Date();

  // 原子条件更新：只有成果截止前才允许写入，杜绝跨过截止的修改
  const result = await prisma.challengeSubmission.updateMany({
    where: {
      challengeId,
      userId,
      challenge: { is: { submissionDeadline: { gte: now } } }
    },
    data: { content, images }
  });

  if (result.count === 0) {
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      select: { submissionDeadline: true }
    });
    if (!challenge) throw new ChallengeServiceError(404, '活动不存在');

    const existing = await prisma.challengeSubmission.findUnique({
      where: { challengeId_userId: { challengeId, userId } }
    });
    if (!existing) {
      throw new ChallengeServiceError(400, '您尚未提交成果');
    }
    throw new ChallengeServiceError(400, '成果截止后不能修改');
  }

  return prisma.challengeSubmission.findUnique({
    where: { challengeId_userId: { challengeId, userId } },
    include: { user: { select: PUBLIC_USER_SELECT } }
  });
};
