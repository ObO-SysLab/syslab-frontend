'use client';
import { createContext, useContext } from 'react';
import type { EditTarget } from './nodeEdit';

/**
 * Present only while the editor can change values: the base drawing (속성 탭) or a selected scene (장면 탭).
 * Read-only players never provide it, so nodes stay plain there.
 */
export interface NodeEditApi {
  /** Apply directly (toggles). Returns an error message when refused. */
  edit?: (id: string, patch: Record<string, unknown>) => string | null;
  /** Open the value dialog for a part of the element. */
  open?: (id: string, target: EditTarget) => void;
}
export const NodeEditContext = createContext<NodeEditApi>({});
export const useNodeEdit = () => useContext(NodeEditContext);
export const editableClass = 'nodrag nopan cursor-pointer hover:ring-2 hover:ring-indigo-300';
