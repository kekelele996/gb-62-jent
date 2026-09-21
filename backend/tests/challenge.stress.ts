/**
 * 高并发报名压力测试：capacity=3，50 个用户同时报名，必须恰好 3 人成功、绝不超卖。
 * 需要后端运行在 PORT（默认 3103）。
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API = process.env.API_URL || 'http://127.0.0.1:3103/api';
const CAPACITY = 3;
const USERS = 50;

const post = async (path: string, body: unknown, token?: string) => {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
};

const main = async () => {
  const tag = `${Date.now()}_${Math.floor(Math.random() * 1e6)}`;

  // 管理员
  const adminReg = await post('/auth/register', {
    username: `sa_${tag}`.slice(0, 20),
    email: `stress_admin_${tag}@t.local`,
    password: 'secret123'
  });
  const adminToken = adminReg.json.token;
  if (!adminToken) throw new Error(`管理员注册失败: ${JSON.stringify(adminReg.json)}`);
  await prisma.user.update({ where: { email: `stress_admin_${tag}@t.local` }, data: { isAdmin: true } });

  const deadline = (hours: number) => new Date(Date.now() + hours * 3600e3).toISOString();
  const created = await post(
    '/challenges',
    {
      title: `压力挑战_${tag}`,
      description: 'stress',
      capacity: CAPACITY,
      registrationDeadline: deadline(2),
      submissionDeadline: deadline(24 * 30)
    },
    adminToken
  );
  const challengeId = created.json.challenge?.id;
  if (!challengeId) throw new Error(`创建挑战失败: ${JSON.stringify(created.json)}`);

  // 注册 50 个用户
  const tokens: string[] = [];
  for (let i = 0; i < USERS; i++) {
    const r = await post('/auth/register', {
      username: `s${i}_${tag}`.slice(0, 20),
      email: `s_${tag}_${i}@t.local`,
      password: 'secret123'
    });
    if (!r.json.token) throw new Error(`用户 ${i} 注册失败: ${JSON.stringify(r.json)}`);
    tokens.push(r.json.token);
  }

  // 同时报名
  const results = await Promise.all(tokens.map((t) => post(`/challenges/${challengeId}/register`, {}, t)));
  const succeeded = results.filter((r) => r.status === 201);
  const rejectedFull = results.filter((r) => r.status === 400 && r.json.error?.includes('名额已满'));

  console.log(`成功 ${succeeded.length}，满员拒绝 ${rejectedFull.length}，其他拒绝 ${results.length - succeeded.length - rejectedFull.length}`);

  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
  const actualRegs = await prisma.challengeRegistration.count({ where: { challengeId } });

  console.log(`计数器 registeredCount=${challenge?.registeredCount}，实际记录=${actualRegs}，capacity=${CAPACITY}`);

  if (succeeded.length !== CAPACITY) throw new Error(`成功人数应为 ${CAPACITY}，实际 ${succeeded.length}`);
  if (challenge?.registeredCount !== CAPACITY) throw new Error('计数器超卖/不足');
  if (actualRegs !== CAPACITY) throw new Error(`实际报名记录应为 ${CAPACITY}，实际 ${actualRegs}`);
  if (rejectedFull.length !== USERS - CAPACITY) throw new Error('其余用户应全部收到名额已满');

  // 满员后再来一个用户
  const late = await post('/auth/register', {
    username: `sl_${tag}`.slice(0, 20),
    email: `s_${tag}_late@t.local`,
    password: 'secret123'
  });
  const lateRes = await post(`/challenges/${challengeId}/register`, {}, late.json.token);
  if (lateRes.status !== 400) throw new Error('满员后应拒绝');

  console.log('\n✓ 高压并发：严格不超卖，拒绝信息明确，计数与记录一致');

  await prisma.$disconnect();
};

main()
  .then(() => process.exit(0))
  .catch(async (e) => {
    console.error('✗ 压测失败：', e.message);
    await prisma.$disconnect();
    process.exit(1);
  });
