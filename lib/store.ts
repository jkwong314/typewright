import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Project, FontFamily, FontStyle, FontMetrics, KerningPair, GlyphOverride } from './types'

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

const defaultMetrics: FontMetrics = {
  unitsPerEm: 1000,
  ascender: 800,
  descender: -200,
  capHeight: 700,
  xHeight: 500,
  lineGap: 0,
}

interface ProjectStore {
  project: Project

  addFamily: (name: string) => string
  removeFamily: (familyId: string) => void
  renameFamily: (familyId: string, name: string) => void

  addStyle: (familyId: string, style: Omit<FontStyle, 'id' | 'kerningPairs' | 'glyphOverrides'>) => string
  removeStyle: (familyId: string, styleId: string) => void
  updateStyleMeta: (familyId: string, styleId: string, meta: Partial<Pick<FontStyle, 'name' | 'weight' | 'italic' | 'widthClass'>>) => void

  updateMetrics: (familyId: string, styleId: string, metrics: Partial<FontMetrics>) => void

  setKerningPair: (familyId: string, styleId: string, pair: KerningPair) => void
  removeKerningPair: (familyId: string, styleId: string, left: string, right: string) => void

  setGlyphOverride: (familyId: string, styleId: string, override: GlyphOverride) => void
  removeGlyphOverride: (familyId: string, styleId: string, unicode: string) => void

  loadProject: (project: Project) => void
  clearProject: () => void
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set) => ({
      project: { families: [] },

      addFamily: (name) => {
        const id = generateId()
        set((s) => ({
          project: {
            ...s.project,
            families: [...s.project.families, { id, name, styles: [] }],
          },
        }))
        return id
      },

      removeFamily: (familyId) =>
        set((s) => ({
          project: {
            ...s.project,
            families: s.project.families.filter((f) => f.id !== familyId),
          },
        })),

      renameFamily: (familyId, name) =>
        set((s) => ({
          project: {
            ...s.project,
            families: s.project.families.map((f) =>
              f.id === familyId ? { ...f, name } : f
            ),
          },
        })),

      addStyle: (familyId, style) => {
        const id = generateId()
        const newStyle: FontStyle = {
          ...style,
          id,
          kerningPairs: [],
          glyphOverrides: {},
        }
        set((s) => ({
          project: {
            ...s.project,
            families: s.project.families.map((f) =>
              f.id === familyId ? { ...f, styles: [...f.styles, newStyle] } : f
            ),
          },
        }))
        return id
      },

      removeStyle: (familyId, styleId) =>
        set((s) => ({
          project: {
            ...s.project,
            families: s.project.families.map((f) =>
              f.id === familyId
                ? { ...f, styles: f.styles.filter((st) => st.id !== styleId) }
                : f
            ),
          },
        })),

      updateStyleMeta: (familyId, styleId, meta) =>
        set((s) => ({
          project: {
            ...s.project,
            families: s.project.families.map((f) =>
              f.id === familyId
                ? {
                    ...f,
                    styles: f.styles.map((st) =>
                      st.id === styleId ? { ...st, ...meta } : st
                    ),
                  }
                : f
            ),
          },
        })),

      updateMetrics: (familyId, styleId, metrics) =>
        set((s) => ({
          project: {
            ...s.project,
            families: s.project.families.map((f) =>
              f.id === familyId
                ? {
                    ...f,
                    styles: f.styles.map((st) =>
                      st.id === styleId
                        ? { ...st, metrics: { ...st.metrics, ...metrics } }
                        : st
                    ),
                  }
                : f
            ),
          },
        })),

      setKerningPair: (familyId, styleId, pair) =>
        set((s) => ({
          project: {
            ...s.project,
            families: s.project.families.map((f) =>
              f.id === familyId
                ? {
                    ...f,
                    styles: f.styles.map((st) => {
                      if (st.id !== styleId) return st
                      const existing = st.kerningPairs.filter(
                        (p) => !(p.left === pair.left && p.right === pair.right)
                      )
                      return { ...st, kerningPairs: [...existing, pair] }
                    }),
                  }
                : f
            ),
          },
        })),

      removeKerningPair: (familyId, styleId, left, right) =>
        set((s) => ({
          project: {
            ...s.project,
            families: s.project.families.map((f) =>
              f.id === familyId
                ? {
                    ...f,
                    styles: f.styles.map((st) =>
                      st.id === styleId
                        ? {
                            ...st,
                            kerningPairs: st.kerningPairs.filter(
                              (p) => !(p.left === left && p.right === right)
                            ),
                          }
                        : st
                    ),
                  }
                : f
            ),
          },
        })),

      setGlyphOverride: (familyId, styleId, override) =>
        set((s) => ({
          project: {
            ...s.project,
            families: s.project.families.map((f) =>
              f.id === familyId
                ? {
                    ...f,
                    styles: f.styles.map((st) =>
                      st.id === styleId
                        ? {
                            ...st,
                            glyphOverrides: {
                              ...st.glyphOverrides,
                              [override.unicode]: override,
                            },
                          }
                        : st
                    ),
                  }
                : f
            ),
          },
        })),

      removeGlyphOverride: (familyId, styleId, unicode) =>
        set((s) => ({
          project: {
            ...s.project,
            families: s.project.families.map((f) =>
              f.id === familyId
                ? {
                    ...f,
                    styles: f.styles.map((st) => {
                      if (st.id !== styleId) return st
                      const { [unicode]: _, ...rest } = st.glyphOverrides
                      return { ...st, glyphOverrides: rest }
                    }),
                  }
                : f
            ),
          },
        })),

      loadProject: (project) => set({ project }),
      clearProject: () => set({ project: { families: [] } }),
    }),
    {
      name: 'typproject',
      partialize: (state) => ({ project: state.project }),
    }
  )
)
