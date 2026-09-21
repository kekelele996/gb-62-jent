import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  ChallengeServiceError,
  createChallenge,
  listChallenges,
  getChallengeById,
  registerForChallenge,
  cancelRegistration,
  submitResult,
  updateSubmission
} from '../services/challengeService';

const handleServiceError = (res: Response, error: unknown) => {
  if (error instanceof ChallengeServiceError) {
    return res.status(error.status).json({ error: error.message });
  }
  console.error('Challenge error:', error);
  return res.status(500).json({ error: '操作失败，请稍后重试' });
};

export const createChallengeController = async (req: AuthRequest, res: Response) => {
  try {
    const challenge = await createChallenge(req.body);
    res.status(201).json({ message: '活动创建成功', challenge });
  } catch (error) {
    handleServiceError(res, error);
  }
};

export const getChallenges = async (req: Request, res: Response) => {
  try {
    const viewerId = (req as AuthRequest).userId;
    const active =
      typeof req.query.active === 'string' && req.query.active !== ''
        ? req.query.active === 'true'
        : undefined;

    const challenges = await listChallenges({ active, viewerId });
    res.json({ challenges });
  } catch (error) {
    handleServiceError(res, error);
  }
};

export const getChallengeByIdController = async (req: Request, res: Response) => {
  try {
    const viewerId = (req as AuthRequest).userId;
    const challenge = await getChallengeById(req.params.id, viewerId);
    res.json(challenge);
  } catch (error) {
    handleServiceError(res, error);
  }
};

export const registerController = async (req: AuthRequest, res: Response) => {
  try {
    await registerForChallenge(req.params.challengeId, req.userId!);
    const challenge = await getChallengeById(req.params.challengeId, req.userId);
    res.status(201).json({ message: '报名成功', challenge });
  } catch (error) {
    handleServiceError(res, error);
  }
};

export const cancelController = async (req: AuthRequest, res: Response) => {
  try {
    await cancelRegistration(req.params.challengeId, req.userId!);
    const challenge = await getChallengeById(req.params.challengeId, req.userId);
    res.json({ message: '已取消报名', challenge });
  } catch (error) {
    handleServiceError(res, error);
  }
};

export const submitChallenge = async (req: AuthRequest, res: Response) => {
  try {
    const submission = await submitResult(req.params.challengeId, req.userId!, req.body);
    const challenge = await getChallengeById(req.params.challengeId, req.userId);
    res.status(201).json({ message: '提交成功', submission, challenge });
  } catch (error) {
    handleServiceError(res, error);
  }
};

export const updateSubmissionController = async (req: AuthRequest, res: Response) => {
  try {
    const submission = await updateSubmission(req.params.challengeId, req.userId!, req.body);
    const challenge = await getChallengeById(req.params.challengeId, req.userId);
    res.json({ message: '成果已更新', submission, challenge });
  } catch (error) {
    handleServiceError(res, error);
  }
};
