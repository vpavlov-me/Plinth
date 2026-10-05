import { create } from "zustand";

export type ExportFormat = "png" | "jpeg";
export type ExportScale = 1 | 2 | 3;

export type ExportSettings = {
  format: ExportFormat;
  scale: ExportScale;
  /** JPG quality, 0.5–1. */
  quality: number;
};

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = { format: "png", scale: 2, quality: 0.92 };

type UIState = {
  /** Instance id of the selected device, or null. */
  selectedDeviceId: string | null;
  exportSettings: ExportSettings;
  exporting: boolean;
  /** True once the persisted project has been restored. */
  hydrated: boolean;
  /** True while a screenshot is being decoded. */
  importing: boolean;
  /** Visibility of the floating side panels. */
  panels: { library: boolean; inspector: boolean };
  togglePanel: (panel: "library" | "inspector") => void;
  select: (id: string | null) => void;
  setExportSettings: (patch: Partial<ExportSettings>) => void;
  setExporting: (exporting: boolean) => void;
  setImporting: (importing: boolean) => void;
  setHydrated: () => void;
};

export const useUIStore = create<UIState>((set) => ({
  selectedDeviceId: null,
  exportSettings: DEFAULT_EXPORT_SETTINGS,
  exporting: false,
  hydrated: false,
  importing: false,
  panels: { library: true, inspector: true },
  togglePanel: (panel) => set((state) => ({ panels: { ...state.panels, [panel]: !state.panels[panel] } })),
  select: (selectedDeviceId) => set({ selectedDeviceId }),
  setExportSettings: (patch) => set((state) => ({ exportSettings: { ...state.exportSettings, ...patch } })),
  setExporting: (exporting) => set({ exporting }),
  setImporting: (importing) => set({ importing }),
  setHydrated: () => set({ hydrated: true }),
}));
