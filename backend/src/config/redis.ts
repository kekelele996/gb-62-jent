import { createClient } from 'redis';
import { config } from './index';

let redisClient: ReturnType<typeof createClient> | null = null;

export const getRedisClient = async () => {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }
  
  redisClient = createClient({
    url: config.redis.url
  });
  
  redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
  });
  
  await redisClient.connect();
  return redisClient;
};

export default getRedisClient;
