import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { getQuestionsByRole } from '../data/questions';
import { Project, User } from '../types';

interface ProgressState {
  value: number;
  loading: boolean;
  error?: string;
}

/**
 * Kullanıcıya özel ilerleme hesaplar:
 * totalSteps = 1 (set-up) + soru sayısı + 1 (tension oylama) + 1 (rapor onayı placeholder)
 * completedSteps = set-up tamam? + cevaplanan soru sayısı + tüm tension'lara oy verildiyse 1 + rapor onayı (şimdilik 0)
 */
export function useUserProgress(project: Project, currentUser: User): ProgressState {
  const [progress, setProgress] = useState<ProgressState>({ value: project.progress ?? 0, loading: true });

  const roleKey = useMemo(() => currentUser.role.toLowerCase().replace(' ', '-') || 'admin', [currentUser.role]);

  // Toplam soru sayısını rol bazlı sorulardan hesapla (set-up + assess)
  const totalQuestions = useMemo(() => {
    const roleQuestions = getQuestionsByRole(roleKey) || [];
    return roleQuestions.filter(q => q.stage === 'set-up' || q.stage === 'assess').length;
  }, [roleKey]);

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        // set-up ve assess evaluation'larını çek
        const [setupRes, assessRes] = await Promise.all([
          fetch(api(`/api/evaluations?projectId=${project.id || (project as any)._id}&userId=${currentUser.id || (currentUser as any)._id}&stage=set-up`)),
          fetch(api(`/api/evaluations?projectId=${project.id || (project as any)._id}&userId=${currentUser.id || (currentUser as any)._id}&stage=assess`)),
        ]);

        const [setupData, assessData] = await Promise.all([
          setupRes.ok ? setupRes.json() : null,
          assessRes.ok ? assessRes.json() : null,
        ]);

        // Tension'ları çek
        const tensionRes = await fetch(api(`/api/tensions/${project.id || (project as any)._id}?userId=${currentUser.id || (currentUser as any)._id}`));
        const tensions: any[] = tensionRes.ok ? await tensionRes.json() : [];

        const setupAnswers = (setupData && setupData.answers) ? setupData.answers : {};
        const assessAnswers = (assessData && assessData.answers) ? assessData.answers : {};
        const mergedAnswers = { ...setupAnswers, ...assessAnswers };

        const answeredCount = Object.values(mergedAnswers).filter(v => v !== null && v !== undefined && v !== '').length;

        const setUpDone = setupData?.status === 'completed' || (setupData && Object.keys(setupAnswers).length > 0);

        const tensionDone = tensions.every(t => t.userVote !== null && t.userVote !== undefined);

        // Rapor onayı henüz yok; tamamlanmadı
        const reportApproved = false;

        const totalSteps = 1 /* set-up */ + totalQuestions + 1 /* tension */ + 1 /* report */;
        const completedSteps =
          (setUpDone ? 1 : 0) +
          answeredCount +
          (tensionDone ? 1 : 0) +
          (reportApproved ? 1 : 0);

        const computed = totalSteps > 0 ? Math.min(100, Math.round((completedSteps / totalSteps) * 100)) : 0;

        if (mounted) {
          setProgress({ value: computed, loading: false });
        }
      } catch (error: any) {
        if (mounted) {
          setProgress({ value: project.progress ?? 0, loading: false, error: error?.message || 'Progress hesaplanamadı' });
        }
      }
    };

    fetchData();
    return () => {
      mounted = false;
    };
  }, [project.id, (project as any)._id, currentUser.id, (currentUser as any)._id, totalQuestions, project.progress]);

  return progress;
}

