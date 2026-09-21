/**
 * 修复 Prisma 在 MongoDB 上为可空唯一字段（如 wechatOpenId）生成的普通唯一索引。
 *
 * 背景：Prisma 对 `String? @unique` 生成的是普通唯一索引，多个文档字段缺失/为 null 时
 * 会互相冲突，导致用户创建失败。这里替换为 sparse 唯一索引：仅在字段存在时校验唯一。
 *
 * 用法：npx ts-node scripts/ensure-indexes.ts（在 prisma db push 之后执行）
 */
import { MongoClient } from 'mongodb';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('缺少 DATABASE_URL');
  process.exit(1);
}

const SPARSE_UNIQUE_INDEXES: { collection: string; name: string; key: Record<string, 1 | -1> }[] = [
  { collection: 'users', name: 'users_wechatOpenId_key', key: { wechatOpenId: 1 } }
];

const main = async () => {
  const client = new MongoClient(url);
  await client.connect();

  // 从连接串解析数据库名
  const dbName = new URL(url.replace('mongodb://', 'mongodb://')).pathname.replace('/', '') || 'gardening';
  const db = client.db(dbName);

  for (const spec of SPARSE_UNIQUE_INDEXES) {
    const col = db.collection(spec.collection);
    const indexes = await col.indexes();
    const existing = indexes.find((i) => i.name === spec.name);

    if (existing && (existing.sparse !== true || existing.unique !== true)) {
      await col.dropIndex(spec.name);
      await col.createIndex(spec.key, { unique: true, sparse: true, name: spec.name });
      console.log(`已替换为 sparse 唯一索引：${spec.collection}.${spec.name}`);
    } else if (!existing) {
      await col.createIndex(spec.key, { unique: true, sparse: true, name: spec.name });
      console.log(`已创建 sparse 唯一索引：${spec.collection}.${spec.name}`);
    } else {
      console.log(`索引已是 sparse：${spec.collection}.${spec.name}`);
    }
  }

  await client.close();
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('索引修复失败：', error);
    process.exit(1);
  });
