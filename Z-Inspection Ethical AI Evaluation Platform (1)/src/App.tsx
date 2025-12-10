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
import { SharedArea } from "./components/SharedArea";
import { OtherMembers } from "./components/OtherMembers";
import { PreconditionApproval } from "./components/PreconditionApproval";
import {
  User,
  Project,
  Tension,
  UseCaseOwner,
  UseCase,
} from "./types";
import { api } from "./api";

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<string>("dashboard");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedTension, setSelectedTension] = useState<Tension | null>(null);
  const [selectedOwner, setSelectedOwner] = useState<UseCaseOwner | null>(null);
  const [selectedUseCase, setSelectedUseCase] = useState<UseCase | null>(null);
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [useCases, setUseCases] = useState<UseCase[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  const [needsPrecondition, setNeedsPrecondition] = useState(false);

  // --- VERİ ÇEKME (FETCH) ---
  useEffect(() => {
    // 1. Projeleri Çek
    const fetchProjects = async () => {
      try {
        const response = await fetch(api('/api/projects'));
        if (response.ok) {
          const data = await response.json();
          const formattedProjects = data.map((p: any) => ({ ...p, id: p._id }));
          setProjects(formattedProjects);
        }
      } catch (error) { console.error("Projeler yüklenemedi:", error); }
    };

    // 2. Kullanıcıları Çek
    const fetchUsers = async () => {
      try {
        const response = await fetch(api('/api/users'));
        if (response.ok) {
          const data = await response.json();
          const formattedUsers = data.map((u: any) => ({ ...u, id: u._id }));
          setUsers(formattedUsers);
        }
      } catch (error) { console.error("Kullanıcılar yüklenemedi:", error); }
    };

    // 3. Use Case'leri Çek (İŞTE BU SATIR VERİLERİN GELMESİNİ SAĞLAR)
    const fetchUseCases = async () => {
      try {
        const response = await fetch(api('/api/use-cases'));
        if (response.ok) {
          const data = await response.json();

          console.log("API'den gelen tüm kullanıcılar:", data); 
          console.log("Gelen kullanıcı sayısı:", data.length);

          const formattedUseCases = data.map((u: any) => ({ ...u, id: u._id }));
          setUseCases(formattedUseCases);
        }
      } catch (error) { console.error("Use Case'ler yüklenemedi:", error); }
    };

    fetchProjects();
    fetchUsers();
    fetchUseCases();
  }, []);

  // --- LOGIN ---
  const handleLogin = async (
    email: string,
    password: string,
    role: string,
  ) => {
    try {
      const response = await fetch(api('/api/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role })
      });

      if (response.ok) {
        const userDB = await response.json();
        const userFrontend = {
          ...userDB,
          id: userDB._id 
        };

        setCurrentUser(userFrontend);
        if (role !== "admin") {
          // Server provides `preconditionApproved` flag on the user object
          const approved = (userFrontend as any).preconditionApproved;
          setNeedsPrecondition(!Boolean(approved));
        }
      } else {
        alert("Giriş başarısız! Bilgileri kontrol edin.");
      }
    } catch (error) {
      console.error("Login hatası:", error);
      alert("Sunucuya bağlanılamadı.");
    }
  };

  const handlePreconditionApproval = () => {
    // Call server to persist approval
    if (!currentUser?.id) return;
    (async () => {
      try {
        const res = await fetch(`http://127.0.0.1:5000/api/users/${currentUser.id}/precondition-approval`, {
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
    setCurrentView("evaluation");
  };

  const handleBackToDashboard = () => {
    setCurrentView("dashboard");
    setSelectedProject(null);
    setSelectedTension(null);
    setSelectedOwner(null);
    setSelectedUseCase(null);
  };

  const handleViewTension = (tension: Tension) => {
    setSelectedTension(tension);
    setCurrentView("tension-detail");
  };

  const handleBackToProject = () => {
    setCurrentView("project-detail");
    setSelectedTension(null);
    setSelectedOwner(null);
  };

  const handleViewOwner = (owner: UseCaseOwner) => {
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
      const response = await fetch(`http://127.0.0.1:5000/api/projects/${projectId}`, {
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
      const response = await fetch(api('/api/use-cases'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...useCaseData,
          ownerId: currentUser?.id,
          status: 'assigned',
          progress: 0,
          assignedExperts: [],
          supportingFiles: useCaseData.supportingFiles || []
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
      }
    } catch (error) {
      console.error("Use Case oluşturma hatası:", error);
      alert("Sunucuya bağlanılamadı.");
    }
  };

  const handleDeleteUseCase = async (useCaseId: string) => {
    try {
      const response = await fetch(`http://127.0.0.1:5000/api/use-cases/${useCaseId}`, {
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
    switch (currentView) {
      case "project-detail":
        return selectedProject ? (
          <ProjectDetail
            project={selectedProject}
            currentUser={currentUser}
            users={users}
            onBack={handleBackToDashboard}
            onStartEvaluation={() => handleStartEvaluation(selectedProject)}
            onViewTension={handleViewTension}
            onViewOwner={handleViewOwner}
            onCreateTension={handleCreateTension}
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
            users={users}
            onBack={handleBackToProject}
            onViewTension={handleViewTension}
          />
        ) : null;
      case "evaluation":
        return selectedProject ? (
          <EvaluationForm
            project={selectedProject}
            currentUser={currentUser}
            onBack={() => setCurrentView("project-detail")}
            onSubmit={handleBackToDashboard}
          />
        ) : null;
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
              onDeleteProject={handleDeleteProject}
              onNavigate={setCurrentView}
              onViewUseCase={handleViewUseCase}
              onLogout={handleLogout}
              onUpdateUser={(updatedUser) => setCurrentUser(updatedUser)}
            />
          );
        }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {renderContent()}
    </div>
  );
}

export default App;