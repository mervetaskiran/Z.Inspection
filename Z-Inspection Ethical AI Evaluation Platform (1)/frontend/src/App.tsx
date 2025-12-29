import React, { useState, useEffect } from "react";
import { LoginScreen } from "./components/LoginScreen";
import { AdminDashboardEnhanced } from "./components/AdminDashboardEnhanced";
import { UserDashboard } from "./components/UserDashboard";
import { UseCaseOwnerDashboard } from "./components/UseCaseOwnerDashboard";
import { ProjectDetail } from "./components/ProjectDetail";
import { TensionDetail } from "./components/TensionDetail";
import { UseCaseOwnerDetail } from "./components/UseCaseOwnerDetail";
import { UseCaseDetail } from "./components/UseCaseDetail";
import { EvaluationForm } from "./components/EvaluationForm";
import { GeneralQuestions } from "./components/GeneralQuestions";
import { AddGeneralQuestion } from "./components/AddGeneralQuestion";
import { SharedArea } from "./components/SharedArea";
import { OtherMembers } from "./components/OtherMembers";
import { PreconditionApproval } from "./components/PreconditionApproval";
import { ReportReview } from "./components/ReportReview";
import {
  User,
  Project,
  Tension,
  UseCase,
} from "./types";
import { api } from "./api";

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<string>("dashboard");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedTension, setSelectedTension] = useState<Tension | null>(null);
  const [selectedOwner, setSelectedOwner] = useState<User | null>(null);
  const [selectedUseCase, setSelectedUseCase] = useState<UseCase | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [useCases, setUseCases] = useState<UseCase[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  const [needsPrecondition, setNeedsPrecondition] = useState(false);
  const [dashboardPreferredTab, setDashboardPreferredTab] = useState<"assigned" | "finished" | null>(null);
  const [assignmentsRefreshToken, setAssignmentsRefreshToken] = useState(0);

  // --- VERİ ÇEKME (FETCH) ---
  // Only fetch heavy dashboard data AFTER login to avoid stressing the backend while on the login screen.
  useEffect(() => {
    if (!currentUser) return;

    // Paralel olarak tüm verileri çek - daha hızlı, timeout ile
    const fetchAllData = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

        const [projectsRes, usersRes, useCasesRes] = await Promise.all([
          fetch(api('/api/projects'), { signal: controller.signal }),
          fetch(api('/api/users'), { signal: controller.signal }),
          fetch(api('/api/use-cases'), { signal: controller.signal })
        ]);

        clearTimeout(timeoutId);

        if (projectsRes.ok) {
          const data = await projectsRes.json();
          const formattedProjects = data.map((p: any) => ({ ...p, id: p._id }));
          setProjects(formattedProjects);
        }

        if (usersRes.ok) {
          const data = await usersRes.json();
          const formattedUsers = data.map((u: any) => ({ ...u, id: u._id }));
          setUsers(formattedUsers);
        }

        if (useCasesRes.ok) {
          const data = await useCasesRes.json();
          console.log('✅ Use cases fetched:', data.length);
          const formattedUseCases = data.map((u: any) => ({ ...u, id: u._id }));
          setUseCases(formattedUseCases);
        } else {
          console.error('❌ Failed to fetch use cases:', useCasesRes.status, useCasesRes.statusText);
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error("Veri yükleme hatası:", error);
        }
      }
    };

    fetchAllData();
    
    // Listen for projects update events (e.g., after assignment)
    const handleProjectsUpdate = (event: CustomEvent) => {
      setProjects(event.detail);
    };
    
    window.addEventListener('projects-updated', handleProjectsUpdate as EventListener);
    
    // Periodically refresh projects (every 10 seconds) to catch assignment updates
    const refreshInterval = setInterval(() => {
      if (currentUser) {
        fetch(api('/api/projects'))
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data) {
              const formattedProjects = data.map((p: any) => ({ ...p, id: p._id }));
              setProjects(formattedProjects);
            }
          })
          .catch(err => console.error('Error refreshing projects:', err));
      }
    }, 10000); // Refresh every 10 seconds
    
    return () => {
      window.removeEventListener('projects-updated', handleProjectsUpdate as EventListener);
      clearInterval(refreshInterval);
    };
  }, [currentUser]);

  // Minimal URL-based route support for report review screen: /reports/:reportId/review
  useEffect(() => {
    const syncRouteFromUrl = () => {
      const path = window.location.pathname || "";
      const m = path.match(/^\/reports\/([^/]+)\/review\/?$/);
      if (m && m[1]) {
        setSelectedReportId(m[1]);
        setCurrentView("report-review");
      }
    };

    syncRouteFromUrl();
    window.addEventListener("popstate", syncRouteFromUrl);
    return () => window.removeEventListener("popstate", syncRouteFromUrl);
  }, []);

  // --- LOGIN ---
  const handleLogin = async (
    email: string,
    password: string,
    role: string,
  ) => {
    try {
      const loginUrl = api('/api/login');
      console.log('Login URL:', loginUrl);
      console.log('Sending login request...');
      
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
      });

      console.log('Response status:', response.status, response.statusText);

      if (response.ok) {
        const userDB = await response.json();
        const userFrontend = {
          ...userDB,
          id: userDB._id 
        };

        setCurrentUser(userFrontend);

        // Fetch profile image separately (login response excludes profileImage for performance)
        (async () => {
          try {
            const userId = userDB._id || userDB.id;
            if (!userId) return;
            const imgRes = await fetch(api(`/api/users/${userId}/profile-image`));
            if (imgRes.ok) {
              const img = await imgRes.json();
              setCurrentUser((prev) => {
                if (!prev) return prev;
                return { ...(prev as any), profileImage: img.profileImage || null } as any;
              });
            }
          } catch (e) {
            // ignore; avatar fallback will be used
          }
        })();

        if (role !== "admin") {
          // Server provides `preconditionApproved` flag on the user object
          const approved = (userFrontend as any).preconditionApproved;
          setNeedsPrecondition(!Boolean(approved));
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Bilinmeyen hata', message: 'Bilinmeyen hata' }));
        const errorMessage = errorData.error || errorData.message || "Giriş başarısız! Bilgileri kontrol edin.";
        alert(errorMessage);
      }
    } catch (error: any) {
      console.error("Login hatası:", error);
      console.error("Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      if (error.name === 'TypeError' && (error.message?.includes('fetch') || error.message?.includes('Failed to fetch'))) {
        alert("Sunucuya bağlanılamadı!\n\nLütfen kontrol edin:\n1. Backend http://localhost:5000 adresinde çalışıyor mu?\n2. Vite dev server çalışıyor mu?\n3. Backend terminal'inde hata var mı?");
      } else {
        alert(`Giriş hatası: ${error.message || 'Bilinmeyen hata'}\n\nBackend'in çalıştığından emin olun.`);
      }
    }
  };

  const handlePreconditionApproval = () => {
    // Call server to persist approval
    if (!currentUser?.id) return;
    (async () => {
      try {
        const res = await fetch(api(`/api/users/${currentUser.id}/precondition-approval`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        if (res.ok) {
          const updatedUser = await res.json();
          setCurrentUser(prev => prev ? { ...prev, ...updatedUser } : prev);
          setNeedsPrecondition(false);
        } else {
          console.error('Approval save failed');
        }
      } catch (err) {
        console.error('Approval error', err);
      }
    })();
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView("dashboard");
    setSelectedProject(null);
    setNeedsPrecondition(false);
  };

  // --- NAVIGATION ---
  const handleViewProject = (project: Project) => {
    setSelectedProject(project);
    setCurrentView("project-detail");
  };

  const handleStartEvaluation = (project: Project) => {
    setSelectedProject(project);
    // Show general questions first for non-usecase and non-admin users
    if (currentUser && currentUser.role !== 'use-case-owner' && currentUser.role !== 'admin') {
      setCurrentView("general-questions");
    } else {
      setCurrentView("evaluation");
    }
  };

  const handleBackToDashboard = () => {
    setCurrentView("dashboard");
    setSelectedProject(null);
    setSelectedTension(null);
    setSelectedOwner(null);
    setSelectedUseCase(null);
    setSelectedReportId(null);
  };

  const handleReviewReport = (reportId: string) => {
    setSelectedReportId(reportId);
    setCurrentView("report-review");
    try {
      window.history.pushState({}, "", `/reports/${reportId}/review`);
    } catch {
      // ignore
    }
  };

  const handleFinishEvolution = async (project: Project) => {
    try {
      const projectId = project?.id || (project as any)?._id;
      const userId = currentUser?.id || (currentUser as any)?._id;
      if (!projectId || !userId) return;

      const res = await fetch(api(`/api/projects/${projectId}/finish-evolution`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) {
        const rawText = await res.text().catch(() => "");
        const err = (() => {
          try {
            return rawText ? JSON.parse(rawText) : {};
          } catch {
            return {};
          }
        })();

        if ((err as any)?.error === "NOT_ALL_TENSIONS_VOTED") {
          const errorData = err as any;
          const message = errorData.message || 
            `Please vote on all tensions you can vote on. You have voted on ${errorData.votedTensions || 0} out of ${errorData.totalVotableTensions || 0} votable tensions. (Note: You cannot vote on your own tensions.)`;
          alert(message);
          return;
        }
        const details = rawText && rawText.length < 500 ? rawText : "";
        alert((err as any)?.error || `Failed to finish evolution.${details ? `\n\n${details}` : ""}`);
        return;
      }

      setAssignmentsRefreshToken((x) => x + 1);
      setDashboardPreferredTab("finished");
      setCurrentView("dashboard");
      setSelectedProject(null);
      setSelectedTension(null);
      setSelectedOwner(null);
      setSelectedUseCase(null);

      window.dispatchEvent(new Event("message-sent"));
    } catch (error) {
      console.error("Finish evolution error:", error);
      alert("Could not connect to the server.");
    }
  };

  const handleViewTension = (tension: Tension) => {
    setSelectedTension(tension);
    setCurrentView("tension-detail");
  };

  const handleBackToProject = () => {
    // Clear openTensionsTab flag when going back
    if (selectedProject) {
      const { openTensionsTab, ...projectWithoutFlag } = selectedProject as any;
      setSelectedProject(projectWithoutFlag);
    }
    setCurrentView("project-detail");
    setSelectedTension(null);
    setSelectedOwner(null);
  };

  const handleViewOwner = (owner: User) => {
    setSelectedOwner(owner);
    setCurrentView("owner-detail");
  };

  const handleViewUseCase = (useCase: UseCase) => {
    setSelectedUseCase(useCase);
    setCurrentView("usecase-detail");
  };

  // --- CREATION HANDLERS (BACKEND'E KAYIT) ---
  const handleCreateProject = async (projectData: Partial<Project>): Promise<Project | null> => {
    try {
      const response = await fetch(api('/api/projects'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...projectData,
          status: "ongoing",
          stage: "set-up",
          progress: 0,
          assignedUsers: projectData.assignedUsers || [],
          useCase: projectData.useCase
        })
      });

      if (response.ok) {
        const newProjectDB = await response.json();
        const newProjectFrontend: Project = {
          ...newProjectDB,
          id: newProjectDB._id, 
          isNew: true,
        };
        setProjects([newProjectFrontend, ...projects]);
        alert("Proje başarıyla oluşturuldu!");
        return newProjectFrontend;
      } else {
        alert("Proje oluşturulurken bir hata oluştu.");
        return null;
      }
    } catch (error) {
      console.error("Proje oluşturma hatası:", error);
      alert("Sunucuya bağlanılamadı.");
      return null;
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      const response = await fetch(api(`/api/projects/${projectId}`), {
        method: 'DELETE'
      });

      if (response.ok) {
        setProjects((prev) => prev.filter((project) => project.id !== projectId));
        alert("Project deleted successfully.");
      } else {
        alert("Failed to delete the project.");
      }
    } catch (error) {
      console.error("Project deletion error:", error);
      alert("Could not connect to the server.");
    }
  };

  const handleCreateUseCase = async (useCaseData: Partial<UseCase>) => {
    try {
      console.log('Creating use case with data:', useCaseData);
      const response = await fetch(api('/api/use-cases'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...useCaseData,
          ownerId: currentUser?.id,
          status: 'assigned',
          progress: 0,
          assignedExperts: [],
          supportingFiles: useCaseData.supportingFiles || [],
          answers: useCaseData.answers || []
        })
      });

      if (response.ok) {
        const newUseCaseDB = await response.json();
        const newUseCaseFrontend = { 
            ...newUseCaseDB, 
            id: newUseCaseDB._id 
        };
        // Listeyi güncelle ki anında görebilelim
        setUseCases([newUseCaseFrontend, ...useCases]);
        alert("Use Case başarıyla oluşturuldu!");
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error("Use Case oluşturma hatası:", errorData);
        alert(`Use Case oluşturulamadı: ${errorData.error || 'Bilinmeyen hata'}`);
      }
    } catch (error) {
      console.error("Use Case oluşturma hatası:", error);
      alert("Sunucuya bağlanılamadı.");
    }
  };

  const handleDeleteUseCase = async (useCaseId: string) => {
    try {
      const response = await fetch(api(`/api/use-cases/${useCaseId}`), {
        method: 'DELETE'
      });

      if (response.ok) {
        setUseCases((prev) => prev.filter((uc) => uc.id !== useCaseId));
        alert("Use case deleted successfully.");
      } else {
        alert("Failed to delete the use case.");
      }
    } catch (error) {
      console.error("Use case deletion error:", error);
      alert("Could not connect to the server.");
    }
  };

  // --- TENSION EKLEME ---
  const handleCreateTension = async (tensionData: any) => {
    if (!selectedProject) return;
    
    try {
      const response = await fetch(api('/api/tensions'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...tensionData,
          projectId: selectedProject.id
        })
      });

      if (response.ok) {
        console.log("Tension created successfully");
      } else {
        alert("Gerilim eklenirken hata oluştu.");
      }
    } catch (error) {
      console.error("Tension create error:", error);
      alert("Sunucuya bağlanılamadı.");
    }
  };

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (needsPrecondition) {
    return (
      <PreconditionApproval
        userRole={currentUser.role}
        onApproval={handlePreconditionApproval}
        onBack={handleLogout}
      />
    );
  }

  const renderContent = () => {
    if (currentView === "report-review" && currentUser && selectedReportId) {
      return (
        <ReportReview
          reportId={selectedReportId}
          currentUser={currentUser}
          onBack={() => {
            try {
              window.history.pushState({}, "", "/");
            } catch {
              // ignore
            }
            setSelectedReportId(null);
            setCurrentView("dashboard");
          }}
        />
      );
    }

    switch (currentView) {
      case "project-detail":
        return selectedProject ? (
          <ProjectDetail
            project={selectedProject}
            currentUser={currentUser}
            users={users}
            onBack={handleBackToDashboard}
            onStartEvaluation={() => handleStartEvaluation(selectedProject)}
            onFinishEvolution={() => handleFinishEvolution(selectedProject)}
            onViewTension={handleViewTension}
            onViewOwner={handleViewOwner}
            onCreateTension={handleCreateTension}
            initialTab={(selectedProject as any).openTensionsTab ? 'tensions' : undefined}
            key={(selectedProject as any).openTensionsTab ? 'tensions-tab' : 'default-tab'}
          />
        ) : null;
      case "tension-detail":
        return selectedTension ? (
          <TensionDetail
            tension={selectedTension}
            currentUser={currentUser}
            users={users}
            onBack={handleBackToProject}
          />
        ) : null;
      case "owner-detail":
        return selectedOwner ? (
          <UseCaseOwnerDetail
            owner={selectedOwner}
            currentUser={currentUser}
            onBack={handleBackToProject}
            onViewUseCase={handleViewUseCase}
          />
        ) : null;
      case "general-questions":
        if (!selectedProject) {
          console.warn('⚠️ No project selected in general-questions view, showing dashboard');
          return currentUser?.role === "use-case-owner" ? (
            <UseCaseOwnerDashboard
              currentUser={currentUser}
              useCases={useCases}
              users={users}
              projects={projects}
              onCreateUseCase={handleCreateUseCase}
              onViewUseCase={handleViewUseCase}
              onDeleteUseCase={handleDeleteUseCase}
              onLogout={handleLogout}
              onUpdateUser={(updatedUser) => setCurrentUser(updatedUser)}
            />
          ) : currentUser?.role === "admin" ? (
            <AdminDashboardEnhanced
              currentUser={currentUser}
              projects={projects}
              users={users}
              useCases={useCases}
              onViewProject={handleViewProject}
              onStartEvaluation={handleStartEvaluation}
              onCreateProject={handleCreateProject}
              onDeleteProject={handleDeleteProject}
              onNavigate={setCurrentView}
              onLogout={handleLogout}
              onUpdateUser={(updatedUser) => setCurrentUser(updatedUser)}
            />
          ) : (
            <UserDashboard
              currentUser={currentUser}
              projects={projects}
              users={users}
              onViewProject={handleViewProject}
              onStartEvaluation={handleStartEvaluation}
              onFinishEvolution={handleFinishEvolution}
              onDeleteProject={handleDeleteProject}
              onNavigate={setCurrentView}
              onViewUseCase={handleViewUseCase}
              onReviewReport={handleReviewReport}
              onLogout={handleLogout}
              onUpdateUser={(updatedUser) => setCurrentUser(updatedUser)}
              preferredTab={dashboardPreferredTab}
              onPreferredTabApplied={() => setDashboardPreferredTab(null)}
              assignmentsRefreshToken={assignmentsRefreshToken}
            />
          );
        }
        return (
          <GeneralQuestions
            project={selectedProject}
            currentUser={currentUser}
            onBack={() => {
              try {
                // Always go to dashboard first, then navigate to project-detail if project exists
                if (selectedProject) {
                  // Preserve selectedProject and go to project detail
                  setCurrentView("project-detail");
                } else {
                  // No project selected, go to dashboard
                  setCurrentView("dashboard");
                }
              } catch (error) {
                console.error('Error in general-questions onBack:', error);
                // On error, always go to dashboard
                setCurrentView("dashboard");
              }
            }}
            onComplete={() => {
              try {
                const projectToUse = selectedProject;
                if (projectToUse) {
                  setCurrentView("add-general-question");
                } else {
                  setCurrentView("dashboard");
                }
              } catch (error) {
                console.error('Error in general-questions onComplete:', error);
                setCurrentView("dashboard");
              }
            }}
          />
        );
      case "add-general-question":
        if (!selectedProject) {
          console.warn('⚠️ No project selected in add-general-question view, showing dashboard');
          return currentUser?.role === "use-case-owner" ? (
            <UseCaseOwnerDashboard
              currentUser={currentUser}
              useCases={useCases}
              users={users}
              projects={projects}
              onCreateUseCase={handleCreateUseCase}
              onViewUseCase={handleViewUseCase}
              onDeleteUseCase={handleDeleteUseCase}
              onLogout={handleLogout}
              onUpdateUser={(updatedUser) => setCurrentUser(updatedUser)}
            />
          ) : currentUser?.role === "admin" ? (
            <AdminDashboardEnhanced
              currentUser={currentUser}
              projects={projects}
              users={users}
              useCases={useCases}
              onViewProject={handleViewProject}
              onStartEvaluation={handleStartEvaluation}
              onCreateProject={handleCreateProject}
              onDeleteProject={handleDeleteProject}
              onNavigate={setCurrentView}
              onLogout={handleLogout}
              onUpdateUser={(updatedUser) => setCurrentUser(updatedUser)}
            />
          ) : (
            <UserDashboard
              currentUser={currentUser}
              projects={projects}
              users={users}
              onViewProject={handleViewProject}
              onStartEvaluation={handleStartEvaluation}
              onFinishEvolution={handleFinishEvolution}
              onDeleteProject={handleDeleteProject}
              onNavigate={setCurrentView}
              onViewUseCase={handleViewUseCase}
              onReviewReport={handleReviewReport}
              onLogout={handleLogout}
              onUpdateUser={(updatedUser) => setCurrentUser(updatedUser)}
              preferredTab={dashboardPreferredTab}
              onPreferredTabApplied={() => setDashboardPreferredTab(null)}
              assignmentsRefreshToken={assignmentsRefreshToken}
            />
          );
        }
        return (
          <AddGeneralQuestion
            project={selectedProject}
            currentUser={currentUser}
            onBack={() => {
              try {
                const projectToUse = selectedProject;
                if (projectToUse) {
                  setCurrentView("general-questions");
                } else {
                  setCurrentView("dashboard");
                }
              } catch (error) {
                console.error('Error in add-general-question onBack:', error);
                setCurrentView("dashboard");
              }
            }}
            onComplete={() => {
              try {
                const projectToUse = selectedProject;
                if (projectToUse) {
                  setSelectedProject({ ...projectToUse, openTensionsTab: true } as any);
                  setCurrentView("project-detail");
                } else {
                  setCurrentView("dashboard");
                }
              } catch (error) {
                console.error('Error in add-general-question onComplete:', error);
                setCurrentView("dashboard");
              }
            }}
          />
        );
      case "evaluation":
        if (!selectedProject) {
          // If no project selected, return dashboard instead of null
          console.warn('⚠️ No project selected in evaluation view, showing dashboard');
          return currentUser?.role === "use-case-owner" ? (
            <UseCaseOwnerDashboard
              currentUser={currentUser}
              useCases={useCases}
              users={users}
              projects={projects}
              onCreateUseCase={handleCreateUseCase}
              onViewUseCase={handleViewUseCase}
              onDeleteUseCase={handleDeleteUseCase}
              onLogout={handleLogout}
              onUpdateUser={(updatedUser) => setCurrentUser(updatedUser)}
            />
          ) : currentUser?.role === "admin" ? (
            <AdminDashboardEnhanced
              currentUser={currentUser}
              projects={projects}
              users={users}
              useCases={useCases}
              onViewProject={handleViewProject}
              onStartEvaluation={handleStartEvaluation}
              onCreateProject={handleCreateProject}
              onDeleteProject={handleDeleteProject}
              onNavigate={setCurrentView}
              onLogout={handleLogout}
              onUpdateUser={(updatedUser) => setCurrentUser(updatedUser)}
            />
          ) : (
            <UserDashboard
              currentUser={currentUser}
              projects={projects}
              users={users}
              onViewProject={handleViewProject}
              onStartEvaluation={handleStartEvaluation}
              onFinishEvolution={handleFinishEvolution}
              onDeleteProject={handleDeleteProject}
              onNavigate={setCurrentView}
              onViewUseCase={handleViewUseCase}
              onReviewReport={handleReviewReport}
              onLogout={handleLogout}
              onUpdateUser={(updatedUser) => setCurrentUser(updatedUser)}
              preferredTab={dashboardPreferredTab}
              onPreferredTabApplied={() => setDashboardPreferredTab(null)}
              assignmentsRefreshToken={assignmentsRefreshToken}
            />
          );
        }
        return (
          <EvaluationForm
            project={selectedProject}
            currentUser={currentUser}
            onBack={() => {
              try {
                // Preserve selectedProject when going back
                const projectToUse = selectedProject;
                if (!projectToUse) {
                  console.warn('⚠️ selectedProject is null in onBack, going to dashboard');
                  setCurrentView("dashboard");
                  return;
                }
                // If user came from general questions, go back to general questions
                // Otherwise go back to project detail
                if (currentUser && currentUser.role !== 'use-case-owner' && currentUser.role !== 'admin') {
                  setCurrentView("general-questions");
                } else {
                  setCurrentView("project-detail");
                }
              } catch (error) {
                console.error('Error in evaluation onBack:', error);
                setCurrentView("dashboard");
              }
            }}
            onSubmit={() => {
              try {
                // Assessment finished: mark progress and return to project detail
                const projectToUse = selectedProject;
                if (projectToUse) {
                  setProjects(prev => prev.map(p => p.id === projectToUse.id ? { ...p, progress: 100 } : p));
                  setSelectedProject(prev => prev ? { ...prev, progress: 100 } : prev);
                  setCurrentView("project-detail");
                } else {
                  setCurrentView("dashboard");
                }
              } catch (error) {
                console.error('Error in evaluation onSubmit:', error);
                setCurrentView("dashboard");
              }
            }}
          />
        );
      case "shared-area":
        return (
          <SharedArea
            currentUser={currentUser}
            projects={projects}
            users={users}
            onBack={handleBackToDashboard}
          />
        );
      case "other-members":
        return (
          <OtherMembers
            currentUser={currentUser}
            users={users}
            projects={projects}
            onBack={handleBackToDashboard}
          />
        );
      case "usecase-detail":
        return selectedUseCase ? (
          <UseCaseDetail
            useCase={selectedUseCase}
            currentUser={currentUser}
            users={users}
            onBack={handleBackToDashboard}
          />
        ) : null;
      default:
        if (currentUser.role === "use-case-owner") {
          return (
            <UseCaseOwnerDashboard
              currentUser={currentUser}
              useCases={useCases}
              users={users}
              projects={projects}
              onCreateUseCase={handleCreateUseCase}
              onViewUseCase={handleViewUseCase}
              onDeleteUseCase={handleDeleteUseCase}
              onLogout={handleLogout}
              onUpdateUser={(updatedUser) => setCurrentUser(updatedUser)}
            />
          );
        } else if (currentUser.role === "admin") {
          return (
            <AdminDashboardEnhanced
              currentUser={currentUser}
              projects={projects}
              users={users}
              useCases={useCases} // <-- Bu prop Admin panelinin Use Case'leri görmesini sağlar
              onViewProject={handleViewProject}
              onStartEvaluation={handleStartEvaluation}
              onCreateProject={handleCreateProject}
              onDeleteProject={handleDeleteProject}
              onNavigate={setCurrentView}
              onLogout={handleLogout}
              onUpdateUser={(updatedUser) => setCurrentUser(updatedUser)}
            />
          );
        } else {
          return (
            <UserDashboard
              currentUser={currentUser}
              projects={projects}
              users={users}
              onViewProject={handleViewProject}
              onStartEvaluation={handleStartEvaluation}
              onFinishEvolution={handleFinishEvolution}
              onDeleteProject={handleDeleteProject}
              onNavigate={setCurrentView}
              onViewUseCase={handleViewUseCase}
              onReviewReport={handleReviewReport}
              onLogout={handleLogout}
              onUpdateUser={(updatedUser) => setCurrentUser(updatedUser)}
              preferredTab={dashboardPreferredTab}
              onPreferredTabApplied={() => setDashboardPreferredTab(null)}
              assignmentsRefreshToken={assignmentsRefreshToken}
            />
          );
        }
    }
  };

  const content = renderContent();
  
  // If content is null, show dashboard as fallback to prevent white screen
  if (content === null) {
    // If we're not on dashboard and content is null, show dashboard
    if (currentView !== "dashboard") {
      // Return dashboard content directly
      return (
        <div className="min-h-screen bg-gray-50">
          {currentUser?.role === "use-case-owner" ? (
            <UseCaseOwnerDashboard
              currentUser={currentUser}
              useCases={useCases}
              users={users}
              projects={projects}
              onCreateUseCase={handleCreateUseCase}
              onViewUseCase={handleViewUseCase}
              onDeleteUseCase={handleDeleteUseCase}
              onLogout={handleLogout}
              onUpdateUser={(updatedUser) => setCurrentUser(updatedUser)}
            />
          ) : currentUser?.role === "admin" ? (
            <AdminDashboardEnhanced
              currentUser={currentUser}
              projects={projects}
              users={users}
              useCases={useCases}
              onViewProject={handleViewProject}
              onStartEvaluation={handleStartEvaluation}
              onCreateProject={handleCreateProject}
              onDeleteProject={handleDeleteProject}
              onNavigate={setCurrentView}
              onLogout={handleLogout}
              onUpdateUser={(updatedUser) => setCurrentUser(updatedUser)}
            />
          ) : (
            <UserDashboard
              currentUser={currentUser}
              projects={projects}
              users={users}
              onViewProject={handleViewProject}
              onStartEvaluation={handleStartEvaluation}
              onFinishEvolution={handleFinishEvolution}
              onDeleteProject={handleDeleteProject}
              onNavigate={setCurrentView}
              onViewUseCase={handleViewUseCase}
              onReviewReport={handleReviewReport}
              onLogout={handleLogout}
              onUpdateUser={(updatedUser) => setCurrentUser(updatedUser)}
              preferredTab={dashboardPreferredTab}
              onPreferredTabApplied={() => setDashboardPreferredTab(null)}
              assignmentsRefreshToken={assignmentsRefreshToken}
            />
          )}
        </div>
      );
    }
    // If already on dashboard but still null, show loading
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {content}
    </div>
  );
}

export default App;