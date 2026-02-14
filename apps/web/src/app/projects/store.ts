import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TProjectSortKey } from "@/types/project";

export type ProjectsViewMode = "grid" | "list";

interface ProjectsState {
	searchQuery: string;
	sortKey: TProjectSortKey;
	sortOrder: "asc" | "desc";
	viewMode: ProjectsViewMode;
	selectedProjectIds: string[];
	lastSelectedProjectId: string | null;
	isHydrated: boolean;
	setIsHydrated: ({ isHydrated }: { isHydrated: boolean }) => void;
	setSearchQuery: ({ query }: { query: string }) => void;
	setSortKey: ({ sortKey }: { sortKey: TProjectSortKey }) => void;
	setSortOrder: ({ sortOrder }: { sortOrder: "asc" | "desc" }) => void;
	toggleSortOrder: () => void;
	setViewMode: ({ viewMode }: { viewMode: ProjectsViewMode }) => void;
	setSelectedProjects: ({ projectIds }: { projectIds: string[] }) => void;
	clearSelectedProjects: () => void;
	setProjectSelected: ({
		projectId,
		isSelected,
	}: {
		projectId: string;
		isSelected: boolean;
	}) => void;
	selectProjectRange: ({
		projectId,
		allProjectIds,
	}: {
		projectId: string;
		allProjectIds: string[];
	}) => void;
}

const getNextSelectedProjectIds = ({
	selectedProjectIds,
	projectId,
	isSelected,
}: {
	selectedProjectIds: string[];
	projectId: string;
	isSelected: boolean;
}): string[] => {
	const selectedProjectIdSet = new Set(selectedProjectIds);

	if (isSelected) {
		selectedProjectIdSet.add(projectId);
		return Array.from(selectedProjectIdSet);
	}

	selectedProjectIdSet.delete(projectId);
	return Array.from(selectedProjectIdSet);
};

export const useProjectsStore = create<ProjectsState>()(
	persist(
		(set) => ({
			searchQuery: "",
			sortKey: "updatedAt",
			sortOrder: "desc",
			viewMode: "grid",
			selectedProjectIds: [],
			lastSelectedProjectId: null,
			isHydrated: false,
			setIsHydrated: ({ isHydrated }) => set({ isHydrated }),
			setSearchQuery: ({ query }) => set({ searchQuery: query }),
			setSortKey: ({ sortKey }) => set({ sortKey }),
			setSortOrder: ({ sortOrder }) => set({ sortOrder }),
			toggleSortOrder: () =>
				set((state) => ({
					sortOrder: state.sortOrder === "asc" ? "desc" : "asc",
				})),
			setViewMode: ({ viewMode }) => set({ viewMode }),
			setSelectedProjects: ({ projectIds }) =>
				set({ selectedProjectIds: projectIds }),
			clearSelectedProjects: () =>
				set({ selectedProjectIds: [], lastSelectedProjectId: null }),
			setProjectSelected: ({ projectId, isSelected }) =>
				set((state) => ({
					selectedProjectIds: getNextSelectedProjectIds({
						selectedProjectIds: state.selectedProjectIds,
						projectId,
						isSelected,
					}),
					lastSelectedProjectId: isSelected
						? projectId
						: state.lastSelectedProjectId,
				})),
			selectProjectRange: ({ projectId, allProjectIds }) =>
				set((state) => {
					const anchorId = state.lastSelectedProjectId;
					if (!anchorId) {
						return {
							selectedProjectIds: [projectId],
							lastSelectedProjectId: projectId,
						};
					}

					const anchorIndex = allProjectIds.indexOf(anchorId);
					const targetIndex = allProjectIds.indexOf(projectId);

					if (anchorIndex === -1 || targetIndex === -1) {
						return {
							selectedProjectIds: [projectId],
							lastSelectedProjectId: projectId,
						};
					}

					const startIndex = Math.min(anchorIndex, targetIndex);
					const endIndex = Math.max(anchorIndex, targetIndex);
					const rangeIds = allProjectIds.slice(startIndex, endIndex + 1);

					const merged = new Set([...state.selectedProjectIds, ...rangeIds]);
					return {
						selectedProjectIds: Array.from(merged),
					};
				}),
		}),
		{
			name: "projects-view-mode",
			partialize: (state) => ({
				viewMode: state.viewMode,
				sortKey: state.sortKey,
				sortOrder: state.sortOrder,
			}),
			onRehydrateStorage: () => (state) => {
				state?.setIsHydrated({ isHydrated: true });
			},
		},
	),
);
