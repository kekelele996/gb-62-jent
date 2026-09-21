import * as Minio from 'minio';
import { config } from '../config';

const minioClient = new Minio.Client({
  endPoint: config.minio.endPoint,
  port: config.minio.port,
  useSSL: config.minio.useSSL,
  accessKey: config.minio.accessKey,
  secretKey: config.minio.secretKey
});

export const uploadFile = async (file: Express.Multer.File, fileName: string): Promise<string> => {
  const bucketName = config.minio.bucket;

  const bucketExists = await minioClient.bucketExists(bucketName);
  if (!bucketExists) {
    await minioClient.makeBucket(bucketName, 'cn-north-1');
  }

  await minioClient.putObject(
    bucketName,
    fileName,
    file.buffer,
    file.size,
    { 'Content-Type': file.mimetype }
  );

  const protocol = config.minio.useSSL ? 'https' : 'http';
  const url = `${protocol}://${config.minio.endPoint}:${config.minio.port}/${bucketName}/${fileName}`;
  
  return url;
};

export default {
  uploadFile
};
