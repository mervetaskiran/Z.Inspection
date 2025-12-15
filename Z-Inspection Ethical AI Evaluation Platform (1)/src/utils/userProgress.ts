import { api } from '../api';
import { Project, User } from '../types';

/**
 * Kullanıcıya özel ilerlemeyi hesaplar.
 * Yeni sistem: MongoDB responses collection'ından cevaplanan soruları sayar.
 * Hem general-v1 hem de role-specific questionnaire'ları (ethical-expert-v1, medical-expert-v1, etc.) kontrol eder.
 */
export async function fetchUserProgress(project: Project, currentUser: User): Promise<number> {
  try {
    const projectId = project.id || (project as any)._id;
    const userId = currentUser.id || (currentUser as any)._id;

    if (!projectId || !userId) {
      return 0;
    }

    // Yeni API endpoint'ini kullan
    const response = await fetch(api(`/api/user-progress?projectId=${projectId}&userId=${userId}`));
    
    if (!response.ok) {
      console.error('Failed to fetch user progress:', response.statusText);
      return 0;
    }

    const data = await response.json();
    return data.progress || 0;
  } catch (err) {
    console.error('User progress calc error', err);
    return 0;
  }
}


