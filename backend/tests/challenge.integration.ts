/**
 * 种植挑战：报名 / 取消 / 成果提交闭环集成测试
 *
 * 运行：DATABASE_URL=mongodb://127.0.0.1:29017/gardening_test npx ts-node tests/challenge.integration.ts
 */
import assert from 'assert';
import { PrismaClient } from '@prisma/client';
import {
  ChallengeServiceError,
  createChallenge,
  listChallenges,
  getChallengeById,
  registerForChallenge,
  cancelRegistration,
  submitResult,
  updateSubmission
} from '../src/services/challengeService';
import configPrisma from '../src/config/prisma';

const prisma = configPrisma as PrismaClient;

let passed = 0;
const check = (name: string, cond: boolean) => {
  assert.ok(cond, name);
  passed++;
  console.log(`  ✓ ${name}`);
};

const expectError = async (status: number, messageIncludes: string, fn: () => Promise<unknown>) => {
  try {
    await fn();
  } catch (error) {
    assert.ok(error instanceof ChallengeServiceError, '应抛出 ChallengeServiceError');
    assert.strictEqual(error.status, status, `期望状态码 ${status}，实际 ${error.status}（${error.message}）`);
    assert.ok(
      error.message.includes(messageIncludes),
      `错误信息应包含「${messageIncludes}」，实际「${error.message}」`
    );
    passed++;
    console.log(`  ✓ 拒绝：${error.status} ${error.message}`);
    return;
  }
  throw new assert.AssertionError({ message: `期望操作被拒绝（${status} ${messageIncludes}），但成功了` });
};

const createUser = async (n: number) => {
  const user = await prisma.user.create({
    data: {
      username: `challenge_tester_${Date.now()}_${n}`,
      email: `challenge_tester_${Date.now()}_${n}@test.local`,
      password: 'x'
    }
  });
  return user.id;
};

const future = (ms: number) => new Date(Date.now() + ms);
const past = (ms: number) => new Date(Date.now() - ms);

const main = async () => {
  // 清理旧测试数据（测试库独立，直接清空相关集合）
  await prisma.challengeSubmission.deleteMany({});
  await prisma.challengeRegistration.deleteMany({});
  await prisma.challenge.deleteMany({});
  await prisma.user.deleteMany({ where: { username: { startsWith: 'challenge_tester_' } } });

  const userA = await createUser(1);
  const userB = await createUser(2);

  // ---------- 1. 创建挑战 ----------
  console.log('\n[创建与参数校验]');
  await expectError(400, '名额', () =>
    createChallenge({
      title: '测试挑战-无效',
      description: 'd',
      capacity: 0,
      registrationDeadline: future(3600e3).toISOString(),
      submissionDeadline: future(7200e3).toISOString()
    } as any)
  );
  await expectError(400, '不能早于', () =>
    createChallenge({
      title: '测试挑战-无效2',
      description: 'd',
      capacity: 5,
      registrationDeadline: future(7200e3).toISOString(),
      submissionDeadline: future(3600e3).toISOString()
    } as any)
  );

  const capacity = 5;
  const ch = await createChallenge({
    title: '测试挑战-多肉养成',
    description: '30 天多肉养成挑战',
    capacity,
    startDate: new Date().toISOString(),
    endDate: future(30 * 86400e3).toISOString(),
    registrationDeadline: future(2 * 3600e3).toISOString(),
    submissionDeadline: future(30 * 86400e3).toISOString()
  });

  const fresh = async () => getChallengeById(ch.id, userA);

  // ---------- 2. 剩余名额与报名状态展示 ----------
  console.log('\n[活动页展示]');
  const detail0 = await fresh();
  check('初始剩余名额 = capacity', detail0.remainingSlots === capacity);
  check('初始已报名数 = 0', detail0.registeredCount === 0);
  check('未登录个人状态为 null', (await getChallengeById(ch.id)).registrationStatus === null);
  check('初始报名状态为未报名', detail0.registrationStatus === null);
  check('初始无个人提交', detail0.mySubmission === null);
  check('报名开放', detail0.registrationOpen === true);

  const list = await listChallenges({ viewerId: userA });
  const inList = list.find((c) => c.id === ch.id);
  check('列表中含剩余名额', !!inList && inList.remainingSlots === capacity);

  // ---------- 3. 报名成功 ----------
  console.log('\n[报名]');
  await registerForChallenge(ch.id, userA);
  let d = await fresh();
  check('报名后剩余名额 -1', d.remainingSlots === capacity - 1);
  check('报名后状态为 registered', d.registrationStatus === 'registered');

  // ---------- 4. 重复报名整次拒绝 ----------
  console.log('\n[重复报名]');
  await expectError(400, '重复报名', () => registerForChallenge(ch.id, userA));
  d = await fresh();
  check('重复报名不占用名额', d.remainingSlots === capacity - 1);

  // 同一用户并发重复报名（双击）：名额只占一份，仅一条报名记录
  const doubleClick = await Promise.allSettled([
    registerForChallenge(ch.id, userB),
    registerForChallenge(ch.id, userB)
  ]);
  check(
    '并发双击恰有一次成功',
    doubleClick.filter((r) => r.status === 'fulfilled').length === 1
  );
  // 上面的包装仅做并发校验，这里确保 B 恰好只报名一次
  d = await getChallengeById(ch.id, userB);
  const regsForB = await prisma.challengeRegistration.count({
    where: { challengeId: ch.id, userId: userB }
  });
  check('B 的报名记录恰有一条', regsForB === 1);
  check('B 显示已报名', d.registrationStatus === 'registered');
  const remainingAfterB = capacity - 2;
  check('双击并发后名额只占一份', d.remainingSlots === remainingAfterB);

  // ---------- 5. 并发抢名额：名额满后整批拒绝 ----------
  console.log('\n[并发抢名额]');
  const otherUsers = await Promise.all(Array.from({ length: 20 }, (_, i) => createUser(100 + i)));
  const results = await Promise.allSettled(
    otherUsers.map((uid) => registerForChallenge(ch.id, uid))
  );
  const fulfilled = results.filter((r) => r.status === 'fulfilled').length;
  const rejected = results.filter((r) => r.status === 'rejected').length;
  check(`恰好 ${remainingAfterB} 人抢到名额`, fulfilled === remainingAfterB);
  check(`其余 ${otherUsers.length - remainingAfterB} 人被拒`, rejected === otherUsers.length - remainingAfterB);
  d = await fresh();
  check('名额报满', d.remainingSlots === 0);
  check('报满后 registrationOpen=false', d.registrationOpen === false);

  const userLate = await createUser(999);
  await expectError(400, '名额已满', () => registerForChallenge(ch.id, userLate));
  const lateReg = await prisma.challengeRegistration.findUnique({
    where: { challengeId_userId: { challengeId: ch.id, userId: userLate } }
  });
  check('满员后拒绝不留报名记录', lateReg === null);
  d = await fresh();
  check('满员拒绝后计数不变', d.registeredCount === capacity && d.remainingSlots === 0);

  // ---------- 6. 取消报名释放名额 ----------
  console.log('\n[取消报名]');
  // 一个抢到名额的用户取消，等待中的用户可补位
  const succeededUsers: string[] = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') succeededUsers.push(otherUsers[i]);
  });
  await cancelRegistration(ch.id, succeededUsers[0]);
  d = await fresh();
  check('取消后名额 +1', d.remainingSlots === 1);

  const userFill = await createUser(888);
  await registerForChallenge(ch.id, userFill);
  d = await fresh();
  check('释放的名额可被重新占用', d.remainingSlots === 0);

  // 未报名用户不能取消
  await expectError(400, '尚未报名', () => cancelRegistration(ch.id, userLate));

  // ---------- 7. 提交成果：先报名、限一份、截止后不可改 ----------
  console.log('\n[成果提交]');
  // 未报名不能提交
  await expectError(403, '先报名', () => submitResult(ch.id, userLate, { content: '我的成果' }));

  await submitResult(ch.id, userA, { content: '第一版成果', images: [] });
  d = await fresh();
  check('提交后 mySubmission 可见', d.mySubmission?.content === '第一版成果');
  check('提交状态展示存在', !!d.mySubmission);

  // 每人限一份
  await expectError(400, '每人限一份', () =>
    submitResult(ch.id, userA, { content: '第二份' })
  );
  const subCountA = await prisma.challengeSubmission.count({
    where: { challengeId: ch.id, userId: userA }
  });
  check('重复提交不产生第二份成果', subCountA === 1);

  // 截止前可修改
  await updateSubmission(ch.id, userA, { content: '修改后的成果', images: ['x.jpg'] });
  d = await fresh();
  check('截止前可修改成果', d.mySubmission?.content === '修改后的成果');
  check('修改保留图片', (d.mySubmission?.images ?? []).length === 1);

  // 已提交成果不能取消报名
  await expectError(400, '已提交成果', () => cancelRegistration(ch.id, userA));
  d = await fresh();
  check('拒绝取消后报名仍在', d.registrationStatus === 'registered');

  // 成果截止：不能提交、不能修改
  await prisma.challenge.update({
    where: { id: ch.id },
    data: { submissionDeadline: past(1000), registrationDeadline: past(2000) }
  });
  await expectError(400, '成果提交已截止', () =>
    submitResult(ch.id, userFill, { content: '赶不上' })
  );
  await expectError(400, '成果截止后不能修改', () =>
    updateSubmission(ch.id, userA, { content: '过期修改' })
  );
  d = await fresh();
  check('过期修改不生效', d.mySubmission?.content === '修改后的成果');
  check('过期后提交数不变', d._count.submissions === 1);

  // ---------- 8. 报名截止：不能报名、不能取消 ----------
  console.log('\n[报名截止]');
  await expectError(400, '报名已截止', () => registerForChallenge(ch.id, userLate));
  // userFill 已报名且未提交：截止后取消应被拒
  await expectError(400, '报名已截止', () => cancelRegistration(ch.id, userFill));
  const fillReg = await prisma.challengeRegistration.findUnique({
    where: { challengeId_userId: { challengeId: ch.id, userId: userFill } }
  });
  check('截止后取消不生效、名额不释放', fillReg !== null);
  d = await fresh();
  check('截止后计数保持原样', d.registeredCount === capacity);

  // 刷新一致性：重新读取与落库计数一致
  const actualRegs = await prisma.challengeRegistration.count({ where: { challengeId: ch.id } });
  const actualSubs = await prisma.challengeSubmission.count({ where: { challengeId: ch.id } });
  check('刷新后报名数与记录一致', d.registeredCount === actualRegs);
  check('刷新后提交数与记录一致', d._count.submissions === actualSubs);

  // ---------- 9. 写入失败时状态保持原样 ----------
  console.log('\n[写入失败补偿]');
  const ch2 = await createChallenge({
    title: '测试挑战-故障注入',
    description: 'd',
    capacity: 2,
    registrationDeadline: future(3600e3).toISOString(),
    submissionDeadline: future(7200e3).toISOString()
  });
  const userF = await createUser(700);

  // 9a. 报名记录写入失败 -> 名额归还
  const originalCreate = prisma.challengeRegistration.create.bind(prisma.challengeRegistration);
  let injected = false;
  (prisma.challengeRegistration as any).create = (args: any) => {
    if (!injected && args?.data?.userId === userF) {
      injected = true;
      return Promise.reject(new Error('模拟写入失败'));
    }
    return originalCreate(args);
  };
  await expectError(500, '报名失败', () => registerForChallenge(ch2.id, userF));
  (prisma.challengeRegistration as any).create = originalCreate;
  let d2 = await getChallengeById(ch2.id, userF);
  check('报名写入失败后名额完全归还', d2.registeredCount === 0 && d2.remainingSlots === 2);
  check('报名写入失败后无残留记录', (await prisma.challengeRegistration.count({
    where: { challengeId: ch2.id, userId: userF }
  })) === 0);

  // 失败后可正常重试报名
  await registerForChallenge(ch2.id, userF);
  d2 = await getChallengeById(ch2.id, userF);
  check('补偿后可重新报名成功', d2.registrationStatus === 'registered' && d2.remainingSlots === 1);

  // 9b. 成果写入失败 -> 不产生任何成果
  const origSubCreate = prisma.challengeSubmission.create.bind(prisma.challengeSubmission);
  (prisma.challengeSubmission as any).create = (args: any) => {
    if (args?.data?.userId === userF) {
      return Promise.reject(new Error('模拟成果写入失败'));
    }
    return origSubCreate(args);
  };
  await expectError(500, '提交失败', () => submitResult(ch2.id, userF, { content: 'x' }));
  (prisma.challengeSubmission as any).create = origSubCreate;
  d2 = await getChallengeById(ch2.id, userF);
  check('成果写入失败后无成果产生', d2.mySubmission === null);
  check('成果写入失败后报名保持有效', d2.registrationStatus === 'registered');

  // 9c. 取消时删除报名记录失败 -> 名额恢复、报名保持
  const origDelete = prisma.challengeRegistration.delete.bind(prisma.challengeRegistration);
  (prisma.challengeRegistration as any).delete = (args: any) => {
    if (args?.where?.challengeId_userId?.userId === userF) {
      return Promise.reject(new Error('模拟删除失败'));
    }
    return origDelete(args);
  };
  await expectError(500, '取消失败', () => cancelRegistration(ch2.id, userF));
  (prisma.challengeRegistration as any).delete = origDelete;
  d2 = await getChallengeById(ch2.id, userF);
  check('取消删除失败后名额恢复', d2.registeredCount === 1 && d2.remainingSlots === 1);
  check('取消删除失败后报名仍在', d2.registrationStatus === 'registered');

  // ---------- 10. 并发取消 vs 新报名不超卖（死结场景） ----------
  console.log('\n[取消释放与并发报名]');
  const ch3 = await createChallenge({
    title: '测试挑战-取消并发',
    description: 'd',
    capacity: 1,
    registrationDeadline: future(3600e3).toISOString(),
    submissionDeadline: future(7200e3).toISOString()
  });
  const userC1 = await createUser(301);
  const userC2 = await createUser(302);
  await registerForChallenge(ch3.id, userC1);
  const [cancelRes, regRes] = await Promise.allSettled([
    cancelRegistration(ch3.id, userC1),
    registerForChallenge(ch3.id, userC2)
  ]);
  check('取消与报名并发均有确定结果', cancelRes.status === 'fulfilled' || regRes.status === 'fulfilled');
  const d3 = await getChallengeById(ch3.id, userC1);
  const regs3 = await prisma.challengeRegistration.count({ where: { challengeId: ch3.id } });
  check('并发后计数不超过名额', d3.registeredCount <= 1);
  check('并发后计数与记录数一致', d3.registeredCount === regs3);
  check('并发后名额不出现负数', d3.remainingSlots >= 0);

  console.log(`\n全部通过：${passed} 项断言 ✓`);
};

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('\n✗ 测试失败：', err?.message ?? err);
    console.error(err?.stack);
    await prisma.$disconnect();
    process.exit(1);
  });
