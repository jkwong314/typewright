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

  addFamily: (name: string, fromScratch?: boolean) => string
  removeFamily: (familyId: string) => void
  renameFamily: (familyId: string, name: string) => void

  addStyle: (familyId: string, style: Omit<FontStyle, 'id' | 'kerningPairs' | 'glyphOverrides' | 'ligatures'>) => string
  removeStyle: (familyId: string, styleId: string) => void
  updateStyleMeta: (familyId: string, styleId: string, meta: Partial<Pick<FontStyle, 'name' | 'weight' | 'italic' | 'widthClass'>>) => void
  duplicateStyle: (familyId: string, styleId: string, newName: string, newWeight: number) => string

  updateMetrics: (familyId: string, styleId: string, metrics: Partial<FontMetrics>) => void

  setKerningPair: (familyId: string, styleId: string, pair: KerningPair) => void
  removeKerningPair: (familyId: string, styleId: string, left: string, right: string) => void

  setGlyphOverride: (familyId: string, styleId: string, override: GlyphOverride) => void
  removeGlyphOverride: (familyId: string, styleId: string, unicode: string) => void

  setLigature: (familyId: string, styleId: string, override: GlyphOverride) => void
  removeLigature: (familyId: string, styleId: string, sequence: string) => void

  loadProject: (project: Project) => void
  clearProject: () => void
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set) => ({
      project: { families: [] },

      addFamily: (name, fromScratch = false) => {
        const id = generateId()
        set((s) => ({
          project: {
            ...s.project,
            families: [...s.project.families, { id, name, styles: [], createdFromScratch: fromScratch }],
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
          ligatures: {},
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
                ? { ...f, styles: f.styles.map((st) => st.id === styleId ? { ...st, ...meta } : st) }
                : f
            ),
          },
        })),

      duplicateStyle: (familyId, styleId, newName, newWeight) => {
        const id = generateId()
        set((s) => {
          const family = s.project.families.find((f) => f.id === familyId)
          const original = family?.styles.find((st) => st.id === styleId)
          if (!original) return s
          const newStyle: FontStyle = {
            ...original,
            id,
            name: newName,
            weight: newWeight,
            kerningPairs: JSON.parse(JSON.stringify(original.kerningPairs)),
            glyphOverrides: JSON.parse(JSON.stringify(original.glyphOverrides)),
            ligatures: JSON.parse(JSON.stringify(original.ligatures ?? {})),
          }
          return {
            project: {
              ...s.project,
              families: s.project.families.map((f) =>
                f.id !== familyId ? f : { ...f, styles: [...f.styles, newStyle] }
              ),
            },
          }
        })
        return id
      },

      updateMetrics: (familyId, styleId, metrics) =>
        set((s) => ({
          project: {
            ...s.project,
            families: s.project.families.map((f) =>
              f.id === familyId
                ? {
                    ...f,
                    styles: f.styles.map((st) =>
                      st.id === styleId ? { ...st, metrics: { ...st.metrics, ...metrics } } : st
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
                        ? { ...st, kerningPairs: st.kerningPairs.filter((p) => !(p.left === left && p.right === right)) }
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
                        ? { ...st, glyphOverrides: { ...st.glyphOverrides, [override.unicode]: override } }
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

      setLigature: (familyId, styleId, override) =>
        set((s) => ({
          project: {
            ...s.project,
            families: s.project.families.map((f) =>
              f.id === familyId
                ? {
                    ...f,
                    styles: f.styles.map((st) =>
                      st.id === styleId
                        ? { ...st, ligatures: { ...(st.ligatures ?? {}), [override.unicode]: override } }
                        : st
                    ),
                  }
                : f
            ),
          },
        })),

      removeLigature: (familyId, styleId, sequence) =>
        set((s) => ({
          project: {
            ...s.project,
            families: s.project.families.map((f) =>
              f.id === familyId
                ? {
                    ...f,
                    styles: f.styles.map((st) => {
                      if (st.id !== styleId) return st
                      const { [sequence]: _, ...rest } = st.ligatures ?? {}
                      return { ...st, ligatures: rest }
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
