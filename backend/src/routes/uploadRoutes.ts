import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth';
import { generateFileName } from '../utils/file';
import { uploadFile } from '../services/minioService';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传文件' });
    }

    const fileName = generateFileName(req.file.originalname);
    const url = await uploadFile(req.file, fileName);

    res.json({ 
      message: '上传成功', 
      url,
      fileName 
    });
  } catch (error) {
    res.status(500).json({ error: '上传失败' });
  }
});

router.post('/upload-multiple', authMiddleware, upload.array('files', 9), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: '请上传文件' });
    }

    const uploadPromises = files.map(file => {
      const fileName = generateFileName(file.originalname);
      return uploadFile(file, fileName);
    });

    const urls = await Promise.all(uploadPromises);

    res.json({ 
      message: '上传成功', 
      urls 
    });
  } catch (error) {
    res.status(500).json({ error: '上传失败' });
  }
});

export default router;
