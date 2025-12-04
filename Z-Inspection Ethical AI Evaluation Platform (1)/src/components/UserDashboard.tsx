import React, { useState } from "react";
import {
  Bell,
  Folder,
  MessageSquare,
  Users,
  LogOut,
  Search,
  Download,
  Calendar,
  Target,
  Play,
  Clock,
} from "lucide-react";
import { Project, User } from "../types";
import { formatRoleName } from "../utils/helpers";

interface UserDashboardProps {
  currentUser: User;
  projects: Project[];
  users: User[];
  onViewProject: (project: Project) => void;
  onStartEvaluation: (project: Project) => void;
  onNavigate: (view: string) => void;
  onLogout: () => void;
}

const roleColors = {
  admin: "#1F2937",
  "ethical-expert": "#1E40AF",
  "medical-expert": "#9D174D",
  "use-case-owner": "#065F46",
  "education-expert": "#7C3AED",
  "technical-expert": "#0891B2",
  "legal-expert": "#B45309",
};

const statusColors = {
  ongoing: {
    bg: "bg-yellow-100",
    text: "text-yellow-800",
  },
  proven: {
    bg: "bg-green-100",
    text: "text-green-800",
  },
  disproven: {
    bg: "bg-red-100",
    text: "text-red-800",
  },
};

const stageLabels = {
  "set-up": "Set-up",
  assess: "Assess",
  resolve: "Resolve",
};

export function UserDashboard({
  currentUser,
  projects,
  users,
  onViewProject,
  onStartEvaluation,
  onNavigate,
  onLogout,
}: UserDashboardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentTab, setCurrentTab] = useState<"assigned" | "commented">(
    "assigned"
  );
  const [activeFilter, setActiveFilter] = useState("all");

  const roleColor = roleColors[currentUser.role as keyof typeof roleColors];

  // Assigned Projects
  const assignedProjects = projects.filter((p) =>
    p.assignedUsers.includes(currentUser.id)
  );

  // Commented Projects (placeholder logic)
  const commentedProjects = projects.filter(
    (p) => !p.assignedUsers.includes(currentUser.id)
  );

  const activeProjectList =
    currentTab === "assigned" ? assignedProjects : commentedProjects;

  const filteredProjects = activeProjectList.filter((p) => {
    const matchFilter = activeFilter === "all" || p.status === activeFilter;
    const matchSearch =
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.shortDescription.toLowerCase().includes(searchTerm.toLowerCase());

    return matchFilter && matchSearch;
  });

  const canStartEvaluation = (project: Project) => {
    return (
      project.assignedUsers.includes(currentUser.id) &&
      (project.stage === "assess" || project.stage === "set-up")
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ======= TOP BAR ======= */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left */}
            <div className="flex items-center space-x-6">
              <h1 className="text-xl font-semibold text-gray-900">
                Z-Inspection Platform
              </h1>

              {/* FILTER BUTTONS */}
              <div className="hidden md:flex space-x-2">
                {["all", "ongoing", "proven", "disproven"].map((key) => (
                  <button
                    key={key}
                    onClick={() => setActiveFilter(key)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      activeFilter === key
                        ? "bg-gray-900 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    {key.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Right side: search, bell, user */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button className="relative p-2 text-gray-600 hover:text-gray-900">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                  2
                </span>
              </button>

              {/* User Avatar */}
              <div className="flex items-center space-x-2">
                <div className="text-sm">
                  <div className="font-medium text-gray-900">{currentUser.name}</div>
                  <div className="text-gray-600">{formatRoleName(currentUser.role)}</div>
                </div>
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white"
                  style={{ backgroundColor: roleColor }}
                >
                  {currentUser.name.charAt(0)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ======= MAIN LAYOUT ======= */}
      <div className="flex">
        {/* SIDEBAR */}
        <div className="w-64 bg-white shadow-sm h-screen">
          <div className="p-6">
            <div className="mb-6">
              <div className="text-sm text-gray-600">Welcome back,</div>
              <div className="text-lg font-medium text-gray-900">
                {currentUser.name}
              </div>
              <div
                className="text-xs px-2 py-1 rounded text-white inline-block mt-1 capitalize"
                style={{ backgroundColor: roleColor }}
              >
                {currentUser.role} Expert
              </div>
            </div>

            <nav className="space-y-2">
              <button
                onClick={() => onNavigate("dashboard")}
                className="w-full flex items-center px-3 py-2 text-gray-700 bg-blue-50 border-r-2 border-blue-500"
              >
                <Folder className="h-4 w-4 mr-3" />
                My Projects
              </button>
              <button
                onClick={() => onNavigate("shared-area")}
                className="w-full flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100"
              >
                <MessageSquare className="h-4 w-4 mr-3" />
                Shared Area
              </button>
              <button
                onClick={() => onNavigate("other-members")}
                className="w-full flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100"
              >
                <Users className="h-4 w-4 mr-3" />
                Other Members
              </button>
            </nav>
          </div>

          <div className="absolute bottom-0 w-64 p-6">
            <button
              onClick={onLogout}
              className="w-full flex items-center px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
            >
              <LogOut className="h-4 w-4 mr-3" />
              Logout
            </button>
          </div>
        </div>

        {/* ======= MAIN CONTENT ======= */}
        <div className="flex-1 p-6">
          {/* TABS */}
          <div className="border-b mb-6">
            <nav className="flex space-x-8">
              <button
                onClick={() => setCurrentTab("assigned")}
                className={`py-2 px-1 border-b-2 text-sm ${
                  currentTab === "assigned"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                📂 Assigned ({assignedProjects.length})
              </button>

              <button
                onClick={() => setCurrentTab("commented")}
                className={`py-2 px-1 border-b-2 text-sm ${
                  currentTab === "commented"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                💬 Commented ({commentedProjects.length})
              </button>
            </nav>
          </div>

          {/* ===== PROJECT LIST ===== */}
          <div className="space-y-4">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                className="bg-white rounded-xl border shadow-sm hover:shadow-md transition-all"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {project.title}
                      </h3>
                      <p className="text-gray-600 text-sm mt-1">
                        {project.shortDescription}
                      </p>

                      {/* Status + Stage */}
                      <div className="flex items-center space-x-3 mt-3">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${statusColors[project.status].bg} ${statusColors[project.status].text}`}
                        >
                          {project.status.toUpperCase()}
                        </span>

                        <span className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded-full">
                          {stageLabels[project.stage]}
                        </span>
                      </div>
                    </div>

                    {/* Assigned / Observer */}
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        project.assignedUsers.includes(currentUser.id)
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {project.assignedUsers.includes(currentUser.id)
                        ? "Assigned"
                        : "Observer"}
                    </span>
                  </div>

                  {/* Progress bar (only if assigned) */}
                  {project.assignedUsers.includes(currentUser.id) && (
                    <div className="mt-2 mb-4">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Your Progress</span>
                        <span>{project.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 h-2 rounded-full">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${project.progress}%`,
                            backgroundColor: roleColor,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* ACTIONS */}
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => onViewProject(project)}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                      >
                        View Details
                      </button>

                      {canStartEvaluation(project) && (
                        <button
                          onClick={() => onStartEvaluation(project)}
                          className="px-4 py-2 text-white rounded-lg text-sm hover:opacity-90 flex items-center"
                          style={{ backgroundColor: roleColor }}
                        >
                          <Play className="h-3 w-3 mr-2" />
                          Start Evaluation
                        </button>
                      )}

                      {project.useCase && (
                        <button className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 text-sm">
                          <Download className="h-3 w-3 mr-1" />
                          Use Case
                        </button>
                      )}
                    </div>

                    <div className="text-xs text-gray-500">
                      Created{" "}
                      {new Date(project.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* EMPTY STATES */}
          {filteredProjects.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-3">
                {currentTab === "assigned" ? "📂" : "💬"}
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No {currentTab} projects found
              </h3>
              <p className="text-gray-600">
                {searchTerm
                  ? "No projects match your search."
                  : currentTab === "assigned"
                  ? "You have not been assigned to any projects."
                  : "You have not commented on any projects yet."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}