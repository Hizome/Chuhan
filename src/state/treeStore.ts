import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { produce } from "immer";
import type { TreeNode, TreeState, GameHeaders, Move } from "../types/xiangqi";
import { START_FEN } from "../types/xiangqi";

function createNode(params: Partial<TreeNode> & { fen: string }): TreeNode {
  return {
    fen: params.fen,
    move: params.move ?? null,
    san: params.san ?? null,
    children: params.children ?? [],
    annotations: params.annotations ?? [],
    comment: params.comment ?? "",
    score: params.score ?? null,
    depth: params.depth ?? null,
    shapes: params.shapes ?? [],
    clock: params.clock,
  };
}

function defaultHeaders(): GameHeaders {
  return {
    title: "新对局",
    red: "红方",
    black: "黑方",
    date: new Date().toISOString().split("T")[0],
    result: "*",
  };
}

function defaultTree(): TreeState {
  return {
    root: createNode({ fen: START_FEN }),
    headers: defaultHeaders(),
    position: [],
    dirty: false,
  };
}

export const getNodeAtPath = (node: TreeNode, path: number[]): TreeNode => {
  let current = node;
  for (const index of path) {
    if (!current.children || index >= current.children.length) {
      return current;
    }
    current = current.children[index];
  }
  return current;
};

export interface TreeStore extends TreeState {
  currentNode: () => TreeNode;

  // Navigation
  goToNext: () => void;
  goToPrev: () => void;
  goToFirst: () => void;
  goToLast: () => void;
  goToPath: (path: number[]) => void;

  // Move making
  makeMove: (move: Move, san: string, fen: string) => void;
  deleteMove: () => void;
  promoteVariation: () => void;

  // Annotations
  setComment: (comment: string) => void;
  toggleAnnotation: (annotation: string) => void;
  setShapes: (shapes: TreeNode["shapes"]) => void;
  clearShapes: () => void;

  // Headers
  setHeaders: (headers: Partial<GameHeaders>) => void;

  // Import / Export
  loadTree: (tree: TreeState) => void;
  resetTree: () => void;
}

export const createTreeStore = (id?: string, initialTree?: TreeState) => {
  const storeCreator = (set: (fn: (state: TreeStore) => void) => void, get: () => TreeStore) => ({
    ...(initialTree ?? defaultTree()),

    currentNode: () => getNodeAtPath(get().root, get().position),

    goToNext: () =>
      set((state) => {
        const node = getNodeAtPath(state.root, state.position);
        if (!node.children[0]) return state;
        return { ...state, position: [...state.position, 0] };
      }),

    goToPrev: () =>
      set((state) => {
        if (state.position.length === 0) return state;
        return { ...state, position: state.position.slice(0, -1) };
      }),

    goToFirst: () =>
      set((state) => ({ ...state, position: [] })),

    goToLast: () =>
      set((state) => {
        const path: number[] = [];
        let node = state.root;
        while (node.children[0]) {
          path.push(0);
          node = node.children[0];
        }
        return { ...state, position: path };
      }),

    goToPath: (path: number[]) =>
      set((state) => ({ ...state, position: path })),

    makeMove: (move: Move, san: string, fen: string) =>
      set(
        produce((state: TreeStore) => {
          const node = getNodeAtPath(state.root, state.position);
          const existingIndex = node.children.findIndex(
            (c) => c.san === san && c.fen === fen
          );

          if (existingIndex !== -1) {
            state.position.push(existingIndex);
          } else {
            const newNode = createNode({
              fen,
              move,
              san,
            });
            node.children.push(newNode);
            state.position.push(node.children.length - 1);
          }
          state.dirty = true;
        })
      ),

    deleteMove: () =>
      set(
        produce((state: TreeStore) => {
          if (state.position.length === 0) return;
          const parentPath = state.position.slice(0, -1);
          const childIndex = state.position[state.position.length - 1];
          const parent = getNodeAtPath(state.root, parentPath);
          parent.children.splice(childIndex, 1);
          state.position = parentPath;
          state.dirty = true;
        })
      ),

    promoteVariation: () =>
      set(
        produce((state: TreeStore) => {
          if (state.position.length === 0) return;
          const parentPath = state.position.slice(0, -1);
          const childIndex = state.position[state.position.length - 1];
          if (childIndex === 0) return;
          const parent = getNodeAtPath(state.root, parentPath);
          const [item] = parent.children.splice(childIndex, 1);
          parent.children.unshift(item);
          state.position = [...parentPath, 0];
          state.dirty = true;
        })
      ),

    setComment: (comment: string) =>
      set(
        produce((state: TreeStore) => {
          const node = getNodeAtPath(state.root, state.position);
          node.comment = comment;
          state.dirty = true;
        })
      ),

    toggleAnnotation: (annotation: string) =>
      set(
        produce((state: TreeStore) => {
          const node = getNodeAtPath(state.root, state.position);
          const idx = node.annotations.indexOf(annotation as never);
          if (idx >= 0) {
            node.annotations.splice(idx, 1);
          } else {
            node.annotations.push(annotation as never);
          }
          state.dirty = true;
        })
      ),

    setShapes: (shapes: TreeNode["shapes"]) =>
      set(
        produce((state: TreeStore) => {
          const node = getNodeAtPath(state.root, state.position);
          const [shape] = shapes;
          if (shape) {
            const index = node.shapes.findIndex(
              (item) => item.orig === shape.orig && item.dest === shape.dest
            );
            if (index >= 0) {
              node.shapes.splice(index, 1);
            } else {
              node.shapes.push(shape);
            }
          } else {
            node.shapes = [];
          }
          state.dirty = true;
        })
      ),

    clearShapes: () =>
      set(
        produce((state: TreeStore) => {
          const node = getNodeAtPath(state.root, state.position);
          if (node.shapes.length === 0) return;
          node.shapes = [];
          state.dirty = true;
        })
      ),

    setHeaders: (headers: Partial<GameHeaders>) =>
      set(
        produce((state: TreeStore) => {
          state.headers = { ...state.headers, ...headers };
          state.dirty = true;
        })
      ),

    loadTree: (tree: TreeState) =>
      set({
        root: tree.root,
        headers: tree.headers,
        position: tree.position,
        dirty: false,
      }),

    resetTree: () => set(defaultTree()),
  });

  if (id) {
    return create<TreeStore>()(
      persist(storeCreator, {
        name: `tree-${id}`,
        storage: createJSONStorage(() => sessionStorage),
      })
    );
  }

  return create<TreeStore>(storeCreator);
};
