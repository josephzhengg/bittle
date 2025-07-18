import React, { useCallback, useState, useRef } from 'react';
import ReactFlow, {
  useNodesState,
  useEdgesState,
  addEdge,
  MiniMap,
  Controls,
  Background,
  Node,
  Edge,
  Connection,
  BackgroundVariant,
  useReactFlow,
  Handle,
  Position,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useSupabase } from '@/lib/supabase';
import { TreeMember } from '@/utils/supabase/models/tree-member';
import { QuestionOption } from '@/utils/supabase/models/question-option';
import {
  createConnection,
  removeConnection,
  refetchSubmissions,
  toggleBig,
  getFamilyTreeMembers
} from '@/utils/supabase/queries/family-tree';
import { getQuestions, getOptions } from '@/utils/supabase/queries/question';
import SubmissionDetailsOverlay from '@/components/family-tree-components/submission-details-overlay';
import EditIdentifierDialog from '@/components/family-tree-components/edit-identifier';
import { updateIdentifier } from '@/utils/supabase/queries/family-tree';
import SubmissionDetailsLoadingSkeleton from '@/components/family-tree-components/submission-details-skeleton';
import { z } from 'zod';
import { toast } from 'sonner';

export const NODE_WIDTH = 172;
export const NODE_HEIGHT = 36;
export const PADDING = 50;
export const VERTICAL_SPACING = 100;

interface NodeData {
  label: string;
  position_x: number | null;
  position_y: number | null;
  is_big: boolean;
  hasLittles: boolean;
  hasBig: boolean;
  form_submission_id?: string | null;
}

interface ContextMenuData {
  id: string;
  type: 'node' | 'edge';
  position: { x: number; y: number };
}

interface FamilyTreeFlowProps {
  familyTreeId: string;
  initialNodes: Node<NodeData>[];
  initialEdges: Edge[];
}

const getNodeStyle = (data: NodeData) => {
  const base = {
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
    borderRadius: '6px',
    padding: '8px',
    fontSize: '12px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center' as const,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.2s ease'
  };

  if (data.is_big && data.hasLittles && data.hasBig) {
    return {
      ...base,
      background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
      color: '#fff',
      border: '2px solid #5b21b6'
    };
  } else if (data.is_big && data.hasLittles) {
    return {
      ...base,
      background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
      color: '#fff',
      border: '2px solid #1e40af'
    };
  } else if (data.is_big) {
    return {
      ...base,
      background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
      color: '#fff',
      border: '2px solid #4338ca'
    };
  } else if (data.hasBig) {
    return {
      ...base,
      background: 'linear-gradient(135deg, #10b981, #047857)',
      color: '#fff',
      border: '2px solid #065f46'
    };
  } else {
    return {
      ...base,
      background: 'linear-gradient(135deg, #f3f4f6, #e5e7eb)',
      color: '#374151',
      border: '2px solid #d1d5db'
    };
  }
};

const getRoleIcon = (data: NodeData) => {
  if (data.is_big && data.hasLittles && data.hasBig) return '👑🌱';
  if (data.is_big && data.hasLittles) return '👑';
  if (data.is_big) return '⭐';
  if (data.hasBig) return '🌱';
  return '⚪';
};

const CustomNode: React.FC<{ data: NodeData; selected: boolean }> = ({
  data,
  selected
}) => (
  <div style={getNodeStyle(data)} className={selected ? 'selected' : ''}>
    <Handle
      type="target"
      position={Position.Top}
      style={{
        background: '#374151',
        width: 8,
        height: 8,
        border: '2px solid #fff',
        top: -4
      }}
    />
    <div>{data.label}</div>
    <Handle
      type="source"
      position={Position.Bottom}
      style={{
        background: '#374151',
        width: 8,
        height: 8,
        border: '2px solid #fff',
        bottom: -4
      }}
    />
  </div>
);

const nodeTypes = { custom: CustomNode };

const getNodePosition = (
  member: z.infer<typeof TreeMember>,
  containerHeight: number
) => ({
  x: member.position_x ?? 0,
  y: Math.min(member.position_y ?? 0, containerHeight - NODE_HEIGHT - PADDING)
});

const findEmptySpace = (
  nodes: Node[],
  targetId: string,
  containerWidth: number,
  containerHeight: number
) => {
  let x = 0,
    y = 0;
  const isOverlapping = (testX: number, testY: number) =>
    nodes.some(
      (n) =>
        n.id !== targetId &&
        testX < n.position.x + NODE_WIDTH + PADDING &&
        testX + NODE_WIDTH > n.position.x &&
        testY < n.position.y + NODE_HEIGHT + PADDING &&
        testY + NODE_HEIGHT > n.position.y
    );

  const directions = [
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: -1 }
  ];
  let attempt = 0,
    directionIndex = 0;

  while (isOverlapping(x, y) && attempt < 100) {
    const { dx, dy } = directions[directionIndex % directions.length];
    x += dx * 50;
    y += dy * 50;
    directionIndex++;
    attempt++;
    x = Math.max(0, Math.min(x, containerWidth - NODE_WIDTH - PADDING));
    y = Math.max(0, Math.min(y, containerHeight - NODE_HEIGHT - PADDING));
  }

  return { x, y: Math.min(y, containerHeight - NODE_HEIGHT - PADDING) };
};

const autoLayout = (
  nodes: Node<NodeData>[],
  edges: Edge[],
  containerWidth: number,
  containerHeight: number
) => {
  const bigToLittles = new Map<string, string[]>();
  const littleToBig = new Map<string, string>();
  edges.forEach((edge) => {
    if (!bigToLittles.has(edge.source)) bigToLittles.set(edge.source, []);
    bigToLittles.get(edge.source)?.push(edge.target);
    littleToBig.set(edge.target, edge.source);
  });

  const roots = nodes.filter(
    (node) => !littleToBig.has(node.id) || !node.data.hasBig
  );

  const levels = new Map<string, number>();
  const assignLevels = (nodeId: string, level: number) => {
    if (!levels.has(nodeId)) {
      levels.set(nodeId, level);
      const littles = bigToLittles.get(nodeId) || [];
      littles.forEach((littleId) => assignLevels(littleId, level + 1));
    }
  };

  roots.forEach((root) => assignLevels(root.id, 0));
  nodes.forEach((node) => {
    if (!levels.has(node.id)) {
      levels.set(node.id, 0);
    }
  });

  const levelGroups = new Map<number, Node<NodeData>[]>();
  nodes.forEach((node) => {
    const level = levels.get(node.id) || 0;
    if (!levelGroups.has(level)) levelGroups.set(level, []);
    levelGroups.get(level)?.push(node);
  });

  const maxLevelWidth = Math.max(
    ...Array.from(levelGroups.values()).map((group) => group.length)
  );
  const totalWidth = maxLevelWidth * (NODE_WIDTH + PADDING);
  const offsetX = Math.max(0, (containerWidth - totalWidth) / 2);

  const updatedNodes = nodes.map((node) => {
    const level = levels.get(node.id) || 0;
    const levelNodes = levelGroups.get(level) || [];
    const index = levelNodes.findIndex((n) => n.id === node.id);
    const levelWidth = levelNodes.length * (NODE_WIDTH + PADDING) - PADDING;
    const startX = offsetX + (containerWidth - levelWidth) / 2;
    const x = startX + index * (NODE_WIDTH + PADDING);
    const y = PADDING + level * (NODE_HEIGHT + VERTICAL_SPACING);
    const constrainedY = Math.min(y, containerHeight - NODE_HEIGHT - PADDING);

    return {
      ...node,
      position: { x, y: constrainedY },
      data: { ...node.data, position_x: x, position_y: constrainedY }
    };
  });

  return updatedNodes;
};

const useFamilyTreeData = (
  familyTreeId: string,
  setNodes: React.Dispatch<React.SetStateAction<Node<NodeData>[]>>,
  fitView: (options?: import('reactflow').FitViewOptions) => void,
  getContainerSize: () => { width: number; height: number }
) => {
  const supabase = useSupabase();
  const [isLoading, setIsLoading] = useState(false);

  const refetchNewSubmissions = useCallback(async () => {
    if (!familyTreeId) return;
    setIsLoading(true);

    try {
      const [members, submissions, { data: familyTree }] = await Promise.all([
        getFamilyTreeMembers(supabase, familyTreeId),
        refetchSubmissions(supabase, familyTreeId),
        supabase
          .from('family_tree')
          .select('form_id, question_id')
          .eq('id', familyTreeId)
          .single()
      ]);

      if (!familyTree) {
        toast.error('Family tree data not found');
        return;
      }

      const existingIds = new Set(
        members.map((m) => m.form_submission_id).filter(Boolean)
      );
      const newSubmissions = submissions.filter((s) => !existingIds.has(s.id));

      if (!newSubmissions.length) {
        toast.info('No new submissions found');
        return;
      }

      const { data: responses } = await supabase
        .from('question_response')
        .select('free_text, form_submission_id')
        .eq('form_id', familyTree.form_id)
        .eq('question_id', familyTree.question_id)
        .in(
          'form_submission_id',
          newSubmissions.map((s) => s.id)
        );

      const { width, height } = getContainerSize();
      const currentNodes = await new Promise<Node[]>((resolve) => {
        setNodes((nds: Node[]) => {
          resolve(nds);
          return nds;
        });
      });

      const newMembers =
        responses?.map((response, index) => {
          const position = findEmptySpace(
            currentNodes,
            `temp-${index}`,
            width,
            height
          );
          return {
            family_tree_id: familyTreeId,
            identifier: response.free_text,
            form_submission_id: response.form_submission_id,
            is_big: false,
            position_x: position.x,
            position_y: position.y
          };
        }) ?? [];

      const { data: newMembersData } = await supabase
        .from('tree_member')
        .insert(newMembers)
        .select();

      const newNodes = TreeMember.array()
        .parse(newMembersData)
        .map((member) => {
          const data: NodeData = {
            label: member.identifier,
            position_x: member.position_x,
            position_y: member.position_y,
            is_big: false,
            hasLittles: false,
            hasBig: false,
            form_submission_id: member.form_submission_id
          };

          return {
            id: member.id,
            type: 'custom',
            data: {
              ...data,
              label: `${getRoleIcon(data)} ${member.identifier}`
            },
            position: getNodePosition(member, height),
            draggable: true,
            selectable: true
          };
        });

      setNodes((nds: Node[]) => [...nds, ...newNodes]);
      setTimeout(() => fitView({ padding: 0.4 }), 100);
      toast.success(`Added ${newMembers.length} new members`);
    } catch (err) {
      toast.error(
        `Failed to refetch submissions: ${
          err instanceof Error ? err.message : 'Unknown error'
        }`
      );
    } finally {
      setIsLoading(false);
    }
  }, [familyTreeId, supabase, setNodes, fitView, getContainerSize]);

  return { refetchNewSubmissions, isLoading };
};

const FamilyTreeFlow: React.FC<FamilyTreeFlowProps> = ({
  familyTreeId,
  initialNodes,
  initialEdges
}) => {
  const supabase = useSupabase();
  const [nodes, setNodes, onNodesChange] =
    useNodesState<NodeData>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);
  const [contextMenu, setContextMenu] = useState<ContextMenuData | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<{
    formSubmissionId: string | null;
    formId: string | null;
    allOptions: Record<string, QuestionOption[]>;
  } | null>(null);
  const [editDialog, setEditDialog] = useState<{
    isOpen: boolean;
    nodeId: string;
    currentIdentifier: string;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { fitView, getViewport } = useReactFlow();

  const getContainerSize = useCallback(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      return { width, height };
    }
    return { width: window.innerWidth, height: window.innerHeight };
  }, []);

  const { refetchNewSubmissions, isLoading } = useFamilyTreeData(
    familyTreeId,
    setNodes,
    fitView,
    getContainerSize
  );

  const onConnect = useCallback(
    async (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      try {
        const result = await createConnection(
          supabase,
          connection.source,
          connection.target
        );
        const newEdge = {
          id: result[0].id,
          type: 'smoothstep',
          source: connection.source,
          target: connection.target,
          style: {
            strokeWidth: 4,
            stroke: '#6b7280',
            transition: 'all 0.2s ease'
          },
          animated: true,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#6b7280',
            width: 20,
            height: 20
          }
        };

        setEdges((eds) => addEdge(newEdge, eds));
        toast.success('Connection created');
      } catch (err) {
        toast.error(
          `Failed to create connection: ${
            err instanceof Error ? err.message : 'Unknown error'
          }`
        );
      }
    },
    [setEdges, supabase]
  );

  const handleToggleBig = useCallback(
    async (nodeId: string) => {
      try {
        const node = nodes.find((n) => n.id === nodeId);
        if (!node) return;

        const newIsBig = !node.data.is_big;
        await toggleBig(supabase, nodeId, newIsBig);
        toast.success(
          `Member ${newIsBig ? 'promoted to big' : 'demoted from big'}`
        );

        setNodes((nds) =>
          nds.map((n) =>
            n.id === nodeId
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    is_big: newIsBig,
                    label: `${getRoleIcon({
                      ...n.data,
                      is_big: newIsBig
                    })} ${n.data.label.split(' ').slice(1).join(' ')}`
                  }
                }
              : n
          )
        );
      } catch (err) {
        toast.error(
          `Failed to toggle big status: ${
            err instanceof Error ? err.message : 'Unknown error'
          }`
        );
      } finally {
        setContextMenu(null);
      }
    },
    [nodes, setNodes, supabase]
  );

  const handleDelete = useCallback(
    async (id: string, type: 'node' | 'edge') => {
      try {
        if (type === 'node') {
          await supabase.from('tree_member').delete().eq('id', id);
          setNodes((nds) => nds.filter((n) => n.id !== id));
          setEdges((eds) =>
            eds.filter((e) => e.source !== id && e.target !== id)
          );
          toast.success('Member deleted');
        } else {
          const edge = edges.find((e) => e.id === id);
          if (edge) {
            await removeConnection(supabase, edge.target, edge.source);
            setEdges((eds) => eds.filter((e) => e.id !== id));
            toast.success('Connection deleted');
          }
        }
      } catch (err) {
        toast.error(
          `Failed to delete: ${
            err instanceof Error ? err.message : 'Unknown error'
          }`
        );
      } finally {
        setContextMenu(null);
      }
    },
    [edges, setNodes, setEdges, supabase]
  );

  const resetLayout = useCallback(async () => {
    if (!containerRef.current) {
      toast.error('Container not ready. Please try again.');
      return;
    }

    try {
      const { width, height } = getContainerSize();
      if (width <= 0 || height <= 0) {
        throw new Error(
          'Invalid container dimensions: width or height is zero or negative'
        );
      }

      if (!nodes?.length) {
        toast('No nodes to reset layout for. Please refetch submissions.');
        return;
      }
      if (
        !nodes.every(
          (n) => n.id && n.data && n.data.label && n.data.form_submission_id
        )
      ) {
        throw new Error(
          'Invalid node data: some nodes are missing id, label, or form_submission_id'
        );
      }

      const updatedNodes = autoLayout(nodes, edges, width, height);
      if (!updatedNodes.length) {
        throw new Error('Auto-layout returned no nodes');
      }

      const updates = updatedNodes.map((node) => {
        const identifier = node.data.label.split(' ').slice(1).join(' ').trim();
        if (!identifier) {
          throw new Error(
            `Invalid identifier for node ID ${node.id}: identifier is empty`
          );
        }
        if (node.data.form_submission_id === null) {
          throw new Error(
            `Invalid form_submission_id for node ID ${node.id}: value is null`
          );
        }
        return {
          id: node.id,
          position_x: Math.round(node.position.x),
          position_y: Math.round(node.position.y),
          identifier,
          form_submission_id: node.data.form_submission_id
        };
      });

      const { error } = await supabase
        .from('tree_member')
        .upsert(updates, { onConflict: 'id' });

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(`Supabase error: ${error.message}`);
      }

      setNodes(updatedNodes);
      setTimeout(() => fitView({ padding: 0.4 }), 100);
      toast.success('Layout reset and positions saved');
    } catch (err) {
      console.error('Reset layout error:', err);
      toast.error(
        `Failed to save node positions: ${
          err instanceof Error ? err.message : 'Unknown error'
        }`
      );
    }
  }, [nodes, edges, setNodes, fitView, getContainerSize, supabase]);

  const onNodeDragStop = useCallback(
    async (_: React.MouseEvent, node: Node) => {
      try {
        const { x, y } = node.positionAbsolute ?? node.position;
        const { height } = getContainerSize();
        const constrainedY = Math.min(y, height - NODE_HEIGHT - PADDING);

        await supabase
          .from('tree_member')
          .update({ position_x: x, position_y: constrainedY })
          .eq('id', node.id);
        setNodes((nds) =>
          nds.map((n) =>
            n.id === node.id ? { ...n, position: { x, y: constrainedY } } : n
          )
        );
      } catch (err) {
        toast(
          `Failed to update position: ${
            err instanceof Error ? err.message : 'Unknown error'
          }`
        );
      }
    },
    [setNodes, supabase, getContainerSize]
  );

  const handleSaveIdentifier = useCallback(
    async (nodeId: string, newIdentifier: string) => {
      try {
        await updateIdentifier(supabase, nodeId, newIdentifier);

        setNodes((nds) =>
          nds.map((n) =>
            n.id === nodeId
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    label: `${getRoleIcon(n.data)} ${newIdentifier}`
                  }
                }
              : n
          )
        );

        toast.success('Identifier updated successfully');
        setEditDialog(null);
      } catch (err) {
        toast.error(
          `Failed to update identifier: ${
            err instanceof Error ? err.message : 'Unknown error'
          }`
        );
      }
    },
    [setNodes, supabase]
  );

  const handleNodeClick = useCallback(
    async (e: React.MouseEvent, node: Node<NodeData>) => {
      e.stopPropagation();
      setNodes((nds) => nds.map((n) => ({ ...n, selected: n.id === node.id })));
      setEdges((eds) => eds.map((e) => ({ ...e, selected: false })));
      setContextMenu(null);

      if (e.detail === 2) {
        const cleanIdentifier = node.data.label.split(' ').slice(1).join(' ');
        setEditDialog({
          isOpen: true,
          nodeId: node.id,
          currentIdentifier: cleanIdentifier
        });
        return;
      }

      if (node.data.form_submission_id) {
        try {
          setSelectedSubmission({
            formSubmissionId: node.data.form_submission_id,
            formId: null,
            allOptions: {}
          });

          const { data: familyTree } = await supabase
            .from('family_tree')
            .select('form_id')
            .eq('id', familyTreeId)
            .single();

          if (!familyTree?.form_id) {
            throw new Error('Form ID not found for this family tree');
          }

          const questions = await getQuestions(supabase, familyTree.form_id);
          const allOptions: Record<string, QuestionOption[]> = {};
          for (const question of questions) {
            if (
              question.type === 'MULTIPLE_CHOICE' ||
              question.type === 'SELECT_ALL'
            ) {
              const options = await getOptions(supabase, question.id);
              allOptions[question.id] = options;
            }
          }

          setSelectedSubmission({
            formSubmissionId: node.data.form_submission_id,
            formId: familyTree.form_id,
            allOptions
          });
        } catch (err) {
          setSelectedSubmission(null);
          toast.error(
            `Failed to fetch submission details: ${
              err instanceof Error ? err.message : 'Unknown error'
            }`
          );
        }
      } else {
        toast.info('No submission details available for this member');
      }
    },
    [setNodes, setEdges, supabase, familyTreeId]
  );

  if (isLoading)
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading family tree...</p>
      </div>
    );

  return (
    <div className="family-tree-container">
      <div className="layout-controls">
        <button onClick={resetLayout} disabled={isLoading}>
          Auto Layout
        </button>
        <button
          onClick={() => {
            setTimeout(() => fitView({ padding: 0.4 }), 100);
            toast.success('View recentered');
          }}
          disabled={isLoading}>
          Recenter
        </button>
        <button onClick={refetchNewSubmissions} disabled={isLoading}>
          Refetch Submissions
        </button>
      </div>

      <div className="absolute bottom-4 left-4 z-10">
        <div className="bg-gradient-to-br from-white via-gray-50 to-gray-100 backdrop-blur-sm p-4 rounded-xl shadow-2xl border border-gray-200/50 text-sm min-w-[220px]">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200/70">
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-600"></div>
            <span className="font-bold text-gray-800 tracking-wide">
              FAMILY TREE LEGEND
            </span>
          </div>
          <div className="space-y-2.5">
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100/60 transition-colors duration-200">
              <div className="flex flex-row items-center justify-center w-18 h-7 bg-gradient-to-r from-purple-500 to-purple-700 rounded text-white text-xs font-medium gap-1">
                <span>👑</span>
                <span>🌱</span>
              </div>
              <span className="text-gray-700 font-medium">Big and Little</span>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100/60 transition-colors duration-200">
              <div className="flex items-center justify-center w-16 h-7 bg-gradient-to-r from-blue-500 to-blue-700 rounded text-white text-xs font-medium">
                👑
              </div>
              <span className="text-gray-700 font-medium">
                Big with Littles
              </span>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100/60 transition-colors duration-200">
              <div className="flex items-center justify-center w-16 h-7 bg-gradient-to-r from-indigo-500 to-indigo-700 rounded text-white text-xs font-medium">
                ⭐
              </div>
              <span className="text-gray-700 font-medium">
                Big without Littles
              </span>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100/60 transition-colors duration-200">
              <div className="flex items-center justify-center w-16 h-7 bg-gradient-to-r from-green-500 to-green-700 rounded text-white text-xs font-medium">
                🌱
              </div>
              <span className="text-gray-700 font-medium">Little</span>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100/60 transition-colors duration-200">
              <div className="flex items-center justify-center w-16 h-7 bg-gradient-to-r from-gray-400 to-gray-500 rounded text-white text-xs font-medium">
                ⚪
              </div>
              <span className="text-gray-700 font-medium">Unconnected</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-gray-200/70">
            <div className="text-xs text-gray-500 text-center">
              Double-click nodes to edit • Right-click for options
            </div>
          </div>
        </div>
      </div>

      {selectedSubmission && selectedSubmission.formId && (
        <div className="z-50">
          <SubmissionDetailsOverlay
            formSubmissionId={selectedSubmission.formSubmissionId}
            formId={selectedSubmission.formId}
            allOptions={selectedSubmission.allOptions}
            onClose={() => setSelectedSubmission(null)}
          />
        </div>
      )}

      {selectedSubmission && !selectedSubmission.formId && (
        <div className="z-50">
          <SubmissionDetailsLoadingSkeleton
            onClose={() => setSelectedSubmission(null)}
          />
        </div>
      )}

      <div
        ref={containerRef}
        className="react-flow-container"
        onClick={() => {
          setContextMenu(null);
          setSelectedSubmission(null);
        }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDragStop={onNodeDragStop}
          onConnect={onConnect}
          onNodeContextMenu={(e, node) => {
            e.preventDefault();
            setNodes((nds) =>
              nds.map((n) => ({ ...n, selected: n.id === node.id }))
            );

            const containerBounds =
              containerRef.current?.getBoundingClientRect();
            if (!containerBounds) return;

            const viewport = getViewport();
            const { x: panX, y: panY, zoom } = viewport;

            const nodeScreenX =
              (node.position.x + NODE_WIDTH / 2) * zoom + panX;
            const nodeScreenY =
              (node.position.y + NODE_HEIGHT / 2) * zoom + panY;

            const menuX = Math.max(
              10,
              Math.min(nodeScreenX + 20, containerBounds.width - 220)
            );
            const menuY = Math.max(
              10,
              Math.min(nodeScreenY - 50, containerBounds.height - 200)
            );

            setContextMenu({
              id: node.id,
              type: 'node',
              position: { x: menuX, y: menuY }
            });
          }}
          onEdgeContextMenu={(e, edge) => {
            e.preventDefault();
            setEdges((eds) =>
              eds.map((e) => ({ ...e, selected: e.id === edge.id }))
            );
            setContextMenu({
              id: edge.id,
              type: 'edge',
              position: { x: e.clientX, y: e.clientY }
            });
          }}
          onEdgeClick={(e, edge) => {
            e.preventDefault();
            e.stopPropagation();
            setEdges((eds) =>
              eds.map((e) => ({ ...e, selected: e.id === edge.id }))
            );
            setContextMenu({
              id: edge.id,
              type: 'edge',
              position: { x: e.clientX, y: e.clientY }
            });
          }}
          onNodeClick={handleNodeClick}
          onPaneClick={() => {
            setNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
            setEdges((eds) => eds.map((e) => ({ ...e, selected: false })));
            setContextMenu(null);
            setSelectedSubmission(null);
            setEditDialog(null);
          }}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.4, maxZoom: 1 }}
          minZoom={0.2}
          maxZoom={4}>
          <MiniMap />
          <Controls />
          <Background variant={BackgroundVariant.Dots} />
        </ReactFlow>
      </div>

      {contextMenu && (
        <div
          className="absolute bg-white/95 backdrop-blur-md border border-gray-200/50 rounded-xl shadow-2xl py-3 z-[100] min-w-[200px] animate-in fade-in-0 zoom-in-95 duration-150"
          style={{
            left: contextMenu.position.x + 10,
            top: contextMenu.position.y + 10,
            transform: 'translate(0, 0)'
          }}>
          <div className="px-4 py-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-600"></div>
              <span className="font-semibold text-gray-800 text-sm">
                {contextMenu.type === 'node'
                  ? 'Member Options'
                  : 'Connection Options'}
              </span>
            </div>
          </div>

          <div className="py-2">
            {contextMenu.type === 'node' && (
              <button
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:text-blue-700 transition-all duration-150 group"
                onClick={() => handleToggleBig(contextMenu.id)}>
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs group-hover:shadow-lg transition-shadow">
                  {nodes.find((n) => n.id === contextMenu.id)?.data.is_big
                    ? '👑'
                    : '⭐'}
                </div>
                <span className="font-medium">
                  {nodes.find((n) => n.id === contextMenu.id)?.data.is_big
                    ? 'Demote from Big'
                    : 'Promote to Big'}
                </span>
              </button>
            )}

            <button
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-green-50 hover:text-emerald-700 transition-all duration-150 group"
              onClick={() => {
                const node = nodes.find((n) => n.id === contextMenu.id);
                if (node) {
                  const cleanIdentifier = node.data.label
                    .split(' ')
                    .slice(1)
                    .join(' ');
                  setEditDialog({
                    isOpen: true,
                    nodeId: contextMenu.id,
                    currentIdentifier: cleanIdentifier
                  });
                  setContextMenu(null);
                }
              }}>
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-emerald-500 to-green-600 text-white text-xs group-hover:shadow-lg transition-shadow">
                ✏️
              </div>
              <span className="font-medium">Edit Identifier</span>
            </button>

            <div className="mx-2 my-2 border-t border-gray-100"></div>

            <button
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 hover:text-red-700 transition-all duration-150 group"
              onClick={() => handleDelete(contextMenu.id, contextMenu.type)}>
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-red-500 to-pink-600 text-white text-xs group-hover:shadow-lg transition-shadow">
                🗑️
              </div>
              <span className="font-medium">
                Delete {contextMenu.type === 'node' ? 'Member' : 'Connection'}
              </span>
            </button>
          </div>
        </div>
      )}
      {editDialog && (
        <EditIdentifierDialog
          isOpen={editDialog.isOpen}
          nodeId={editDialog.nodeId}
          currentIdentifier={editDialog.currentIdentifier}
          onSave={handleSaveIdentifier}
          onCancel={() => setEditDialog(null)}
        />
      )}
    </div>
  );
};

export default FamilyTreeFlow;
