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

export type EditorDialog = "shortcuts" | "about" | "reset";

type UIState = {
  /** Instance id of the selected device, or null. */
  selectedDeviceId: string | null;
  /** Instance id of the device whose screenshot is being cropped, or null. */
  croppingDeviceId: string | null;
  exportSettings: ExportSettings;
  exporting: boolean;
  /** Share of a video export done (0–1), or null when no video is being exported. */
  videoProgress: number | null;
  /** True once the persisted project has been restored. */
  hydrated: boolean;
  /** True while a screenshot is being decoded. */
  importing: boolean;
  /** The modal dialog that is open, or null. */
  dialog: EditorDialog | null;
  setDialog: (dialog: EditorDialog | null) => void;
  /** Selects a device; leaves crop mode unless it stays on the same device. */
  select: (id: string | null) => void;
  setCropping: (id: string | null) => void;
  setExportSettings: (patch: Partial<ExportSettings>) => void;
  setExporting: (exporting: boolean) => void;
  setVideoProgress: (progress: number | null) => void;
  setImporting: (importing: boolean) => void;
  setHydrated: () => void;
};

export const useUIStore = create<UIState>((set) => ({
  selectedDeviceId: null,
  croppingDeviceId: null,
  exportSettings: DEFAULT_EXPORT_SETTINGS,
  exporting: false,
  videoProgress: null,
  hydrated: false,
  importing: false,
  dialog: null,
  setDialog: (dialog) => set({ dialog }),
  select: (selectedDeviceId) =>
    set((state) => ({
      selectedDeviceId,
      croppingDeviceId: state.croppingDeviceId === selectedDeviceId ? state.croppingDeviceId : null,
    })),
  setCropping: (croppingDeviceId) =>
    set((state) => ({ croppingDeviceId, selectedDeviceId: croppingDeviceId ?? state.selectedDeviceId })),
  setExportSettings: (patch) => set((state) => ({ exportSettings: { ...state.exportSettings, ...patch } })),
  setExporting: (exporting) => set({ exporting }),
  setVideoProgress: (videoProgress) => set({ videoProgress }),
  setImporting: (importing) => set({ importing }),
  setHydrated: () => set({ hydrated: true }),
}));
