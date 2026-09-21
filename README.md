# 园艺爱好者社区交流平台

一个面向园艺爱好者的社区交流平台，用户可以分享花园日记、种植经验、花艺作品，与其他爱好者互动交流。

## 项目主要功能

- **花园日记发布**：创建图文日记记录植物生长过程，支持多图上传、标签分类，按时间线展示
- **话题广场**：按热门话题聚合内容，参与话题讨论和发布话题帖子
- **花友圈动态**：类似朋友圈的动态流，发布简短的种植动态，关注的花友动态实时出现在信息流中
- **用户关注与粉丝体系**：支持关注/取消关注，查看关注列表和粉丝列表
- **积分与等级系统**：发帖、评论、签到获得积分，对应不同等级（种子、幼苗、花朵、参天大树）
- **活动与挑战**：平台定期发起种植挑战活动，设有名额限制与报名/成果截止时间，用户报名占位后提交成果照片，可评选优秀作品
- **私信系统**：用户之间一对一交流，支持文字和图片消息，新消息未读提醒
- **内容举报与管理**：用户可举报不良内容，管理员可审核举报并处理违规内容

## 快速启动

### Docker Compose 一键部署

```bash
# 1. 复制环境变量示例文件
cp .env.example .env

# 2. 启动所有服务
docker compose up -d
```

### 本地开发

```bash
# 后端启动
cd backend
npm install
npm run prisma:generate
npm run prisma:push
npm run dev

# 前端启动
cd ../frontend
npm install
npm run dev
```

## 访问地址

| 服务 | 访问地址 |
|------|----------|
| 前端 | http://localhost:8103 |
| 后端 API | http://localhost:3103 |
| MongoDB | localhost:2903 |
| Redis | localhost:6503 |
| MinIO 控制台 | http://localhost:9001 |

## 技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | Next.js 14 + TypeScript |
| 前端样式 | Tailwind CSS |
| 后端框架 | Node.js + Express + TypeScript |
| ORM | Prisma |
| 数据库 | MongoDB |
| 缓存 | Redis |
| 实时通信 | WebSocket (Socket.IO) |
| 认证 | JWT + OAuth2（微信登录） |
| 图片存储 | MinIO |
| 容器化 | Docker + Docker Compose |

## 项目目录结构

```
.
├── backend/                # 后端项目
│   ├── src/
│   │   ├── config/         # 配置文件
│   │   ├── controllers/    # 控制器
│   │   ├── middleware/     # 中间件
│   │   ├── routes/         # 路由
│   │   ├── services/       # 服务层
│   │   ├── types/          # 类型定义
│   │   ├── utils/          # 工具函数
│   │   ├── app.ts          # Express 应用
│   │   └── server.ts       # 服务器入口
│   ├── prisma/
│   │   └── schema.prisma   # Prisma 数据模型
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
├── frontend/               # 前端项目
│   ├── app/                # Next.js App Router 页面
│   ├── components/         # 组件
│   ├── context/            # React Context
│   ├── lib/                # API 服务和工具
│   ├── types/              # 类型定义
│   ├── styles/             # 样式文件
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── nginx.conf          # Nginx 配置
│   └── Dockerfile
├── database/               # 数据库脚本
├── docker-compose.yml      # Docker 编排
├── .env.example            # 环境变量示例
└── README.md
```

## 环境变量说明

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| MONGO_USERNAME | MongoDB 用户名 | root |
| MONGO_PASSWORD | MongoDB 密码 | rootpassword |
| MONGO_DATABASE | MongoDB 数据库名 | gardening |
| JWT_SECRET | JWT 签名密钥 | - |
| JWT_EXPIRES_IN | JWT 过期时间 | 7d |
| MINIO_ACCESS_KEY | MinIO 访问密钥 | minioadmin |
| MINIO_SECRET_KEY | MinIO 密钥 | minioadmin |
| WECHAT_APP_ID | 微信 App ID（可选） | - |
| WECHAT_APP_SECRET | 微信 App Secret（可选） | - |

## Docker 部署说明

### 端口映射

| 容器 | 主机端口 | 容器端口 |
|------|----------|----------|
| frontend | 8103 | 80 |
| backend | 3103 | 3000 |
| mongodb | 2903 | 27017 |
| redis | 6503 | 6379 |
| minio | 9000 / 9001 | 9000 / 9001 |

### 数据卷

| 卷名 | 说明 |
|------|------|
| gardening-mongodb-data | MongoDB 数据持久化 |
| gardening-redis-data | Redis 数据持久化 |
| gardening-minio-data | MinIO 对象存储 |

### 常见问题

**1. 后端服务启动失败，显示数据库连接错误**
- 检查 MongoDB 容器是否健康运行：`docker compose ps`
- 检查 `.env` 文件中的数据库密码配置
- MongoDB 以单节点副本集模式运行（Prisma 写入依赖事务），首次启动需数秒完成副本集初始化，健康检查通过后后端才会启动

**2. 图片上传失败**
- 检查 MinIO 容器是否启动：`docker compose logs minio`
- 确认 MinIO 访问密钥在 docker-compose.yml 中正确配置

**3. 前端无法访问后端 API**
- 确认后端容器已启动：`docker compose ps`
- 检查 Nginx 配置：`docker compose exec frontend cat /etc/nginx/conf.d/default.conf`

**4. 热更新不生效**
- Docker 模式下修改代码需要重新构建：`docker compose build && docker compose up -d`
- 本地开发建议使用 `npm run dev`

## 数据库模型说明

### 用户等级

| 等级 | 积分范围 | 图标 |
|------|----------|------|
| 种子 (SEED) | 0 - 499 | 🌰 |
| 幼苗 (SPROUT) | 500 - 2999 | 🌱 |
| 花朵 (FLOWER) | 3000 - 9999 | 🌸 |
| 参天大树 (TREE) | 10000+ | 🌳 |

### 积分规则

| 行为 | 积分 |
|------|------|
| 发布日记 | +20 |
| 发布话题 | +15 |
| 发布动态 | +10 |
| 评论 | +5 |
| 每日签到 | +10 |

## API 接口说明

### 认证接口
- `POST /api/auth/register` - 注册
- `POST /api/auth/login` - 登录
- `GET /api/auth/me` - 获取当前用户信息
- `PUT /api/auth/profile` - 更新个人资料

### 花园日记
- `GET /api/diaries` - 获取日记列表
- `POST /api/diaries` - 创建日记
- `GET /api/diaries/:id` - 获取日记详情
- `PUT /api/diaries/:id` - 更新日记
- `DELETE /api/diaries/:id` - 删除日记

### 话题广场
- `GET /api/posts` - 获取帖子列表
- `POST /api/posts` - 创建帖子
- `GET /api/posts/:id` - 获取帖子详情

### 花友圈
- `GET /api/moments` - 获取动态列表
- `POST /api/moments` - 发布动态

### 用户关系
- `POST /api/users/follow/:userId` - 关注用户
- `DELETE /api/users/follow/:userId` - 取消关注
- `GET /api/users/profile/:userId` - 获取用户资料

### 私信
- `GET /api/messages/conversations` - 获取会话列表
- `GET /api/messages/:userId` - 获取与某人的消息
- `POST /api/messages` - 发送消息

### 活动与挑战
- `GET /api/challenges` - 获取挑战列表（含剩余名额，登录后含我的报名/提交状态）
- `POST /api/challenges` - 创建挑战（管理员，需设置名额、报名截止、成果截止）
- `GET /api/challenges/:id` - 获取挑战详情（含剩余名额与我的报名/提交状态）
- `POST /api/challenges/:id/register` - 报名（名额已满、重复报名、超过报名截止均整次拒绝）
- `DELETE /api/challenges/:id/register` - 取消报名（仅报名截止前有效，取消后释放名额）
- `POST /api/challenges/:id/submit` - 提交成果（需先报名，每人限一份，成果截止后不可提交/修改）

## License

MIT
