import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useListProjects, type ListProjectsQueryResult } from "@workspace/api-client-react";

type Project = ListProjectsQueryResult[number];

type ProjectContextValue = {
  projects: Project[];
  activeProject: Project | null;
  projectId: string | null;
  isLoading: boolean;
  error: unknown;
  selectProject: (projectId: string) => void;
  refetchProjects: () => Promise<unknown>;
};

const ProjectContext = createContext<ProjectContextValue | null>(null);
const STORAGE_KEY = "roll-active-project-id";

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { data, isLoading, error, refetch } = useListProjects();
  const projects = data ?? [];
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    () => window.localStorage.getItem(STORAGE_KEY),
  );

  const activeProject = useMemo(() => {
    if (!projects.length) return null;
    return (
      projects.find((project) => project.id === selectedProjectId) ??
      projects.find((project) => project.name === "THE LAST FRAME") ??
      projects[0]
    );
  }, [projects, selectedProjectId]);

  useEffect(() => {
    if (!activeProject || activeProject.id === selectedProjectId) return;
    setSelectedProjectId(activeProject.id);
    window.localStorage.setItem(STORAGE_KEY, activeProject.id);
  }, [activeProject, selectedProjectId]);

  const selectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    window.localStorage.setItem(STORAGE_KEY, projectId);
  };

  return (
    <ProjectContext.Provider
      value={{
        projects,
        activeProject,
        projectId: activeProject?.id ?? null,
        isLoading,
        error,
        selectProject,
        refetchProjects: refetch,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useActiveProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useActiveProject must be used within ProjectProvider");
  }
  return context;
}