import React, {
  useCallback,
  useState,
  useRef,
  useMemo,
  useEffect
} from 'react';
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
  getFamilyTreeMembers,
  createFamilyMember,
  updateIdentifier
} from '@/utils/supabase/queries/family-tree';
import { getQuestions, getOptions } from '@/utils/supabase/queries/question';
import SubmissionDetailsOverlay from '@/components/family-tree-components/submission-details-overlay';
import EditIdentifierDialog from '@/components/family-tree-components/edit-identifier';
import SubmissionDetailsLoadingSkeleton from '@/components/family-tree-components/submission-details-skeleton';
import TutorialOverlay from '@/components/family-tree-components/tutorial';
import { z } from 'zod';
import { toast } from 'sonner';
import { SupabaseClient } from '@supabase/supabase-js';

export const NODE_WIDTH = 172;
export const NODE_HEIGHT = 36;
export const PADDING = 50;
export const VERTICAL_SPACING = 100;

export const MOBILE_NODE_WIDTH = 140;
export const MOBILE_NODE_HEIGHT = 32;
export const MOBILE_PADDING = 20;
export const MOBILE_VERTICAL_SPACING = 60;

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

const proOptions = {
  hideAttribution: true
};

const createStyledEdge = (
  edgeId: string,
  source: string,
  target: string,
  nodes: Node<NodeData>[]
): Edge => {
  const sourceNode = nodes.find((n) => n.id === source);
  const targetNode = nodes.find((n) => n.id === target);
  const isBigToLittle = sourceNode?.data.is_big && targetNode?.data.hasBig;

  const sourceX = sourceNode?.position?.x;
  const targetX = targetNode?.position?.x;

  const isVertical =
    sourceX !== undefined &&
    targetX !== undefined &&
    Math.abs(sourceX - targetX) < 10;

  return {
    id: edgeId,
    type: isVertical ? 'bezier' : 'smoothstep',
    source,
    target,
    style: getEdgeStyle(sourceNode, targetNode),
    animated: isBigToLittle,
    markerEnd: getCustomMarker(isBigToLittle ? 'bigToLittle' : 'general'),
    sourceHandle: isVertical ? 'right' : undefined,
    targetHandle: isVertical ? 'left' : undefined,
    data: {
      relationshipType: isBigToLittle ? 'bigToLittle' : 'general',
      isVertical
    }
  };
};

export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

const getEdgeStyle = (
  sourceNode?: Node<NodeData>,
  targetNode?: Node<NodeData>
) => {
  const isBigToLittle = sourceNode?.data.is_big && targetNode?.data.hasBig;

  return {
    stroke: isBigToLittle
      ? 'url(#bigToLittleGradient)'
      : 'url(#generalGradient)',
    strokeWidth: isBigToLittle ? 3 : 2.5,
    strokeDasharray: isBigToLittle ? 'none' : '5,3',
    filter: isBigToLittle
      ? 'drop-shadow(0 2px 4px rgba(147, 51, 234, 0.2))'
      : 'drop-shadow(0 1px 3px rgba(0, 0, 0, 0.1))',
    transition: 'all 0.3s ease'
  };
};

const getNodeStyle = (data: NodeData, isMobile: boolean) => {
  const base = {
    width: isMobile ? MOBILE_NODE_WIDTH : NODE_WIDTH,
    height: isMobile ? MOBILE_NODE_HEIGHT : NODE_HEIGHT,
    borderRadius: 'var(--radius-md)',
    padding: isMobile ? '0.5rem' : '0.75rem',
    fontSize: isMobile ? '0.7rem' : '0.875rem',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center' as const,
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxSizing: 'border-box' as const,
    overflow: 'visible',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)'
  };

  if (data.is_big && data.hasBig) {
    return {
      ...base,
      background: 'linear-gradient(135deg, var(--secondary), #6d28d9)',
      color: '#fff',
      border: isMobile
        ? '1px solid var(--secondary)'
        : '2px solid var(--secondary)'
    };
  } else if (data.is_big) {
    return {
      ...base,
      background: 'linear-gradient(135deg, var(--primary), #4f46e5)',
      color: '#fff',
      border: isMobile ? '1px solid var(--primary)' : '2px solid var(--primary)'
    };
  } else if (data.hasBig) {
    return {
      ...base,
      background: 'linear-gradient(135deg, #10b981, #047857)',
      color: '#fff',
      border: isMobile ? '1px solid #065f46' : '2px solid #065f46'
    };
  } else {
    return {
      ...base,
      background: 'linear-gradient(135deg, #f3f4f6, #e5e7eb)',
      color: 'var(--foreground)',
      border: isMobile ? '1px solid var(--border)' : '2px solid var(--border)'
    };
  }
};

const getRoleIcon = (data: NodeData) => {
  if (data.is_big && data.hasBig) return '👑🌱';
  if (data.is_big) return '⭐';
  if (data.hasBig) return '🌱';
  return '⚪';
};

const getCustomMarker = (type: 'bigToLittle' | 'general') => ({
  type: MarkerType.ArrowClosed,
  color: type === 'bigToLittle' ? '#8b5cf6' : '#64748b',
  width: 16,
  height: 16,
  strokeWidth: 1.5
});

const CustomNode: React.FC<{ data: NodeData; selected: boolean }> = ({
  data,
  selected
}) => {
  const isMobile = useIsMobile();
  const fullName = data.label.split(' ').slice(1).join(' ');
  const roleIcon = data.label.split(' ')[0];

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  };

  const getMaxTextLength = () => {
    if (isMobile) {
      const availableWidth = MOBILE_NODE_WIDTH - 24;
      const avgCharWidth = 6;
      return Math.floor(availableWidth / avgCharWidth);
    } else {
      const availableWidth = NODE_WIDTH - 32;
      const avgCharWidth = 7;
      return Math.floor(availableWidth / avgCharWidth);
    }
  };

  const maxLength = getMaxTextLength();
  const truncatedName = truncateText(fullName, maxLength);
  const displayText = `${roleIcon} ${truncatedName}`;

  return (
    <div
      style={{
        ...getNodeStyle(data, isMobile),
        minWidth: isMobile ? MOBILE_NODE_WIDTH : NODE_WIDTH,
        maxWidth: isMobile ? MOBILE_NODE_WIDTH : NODE_WIDTH,
        minHeight: isMobile ? MOBILE_NODE_HEIGHT : NODE_HEIGHT,
        maxHeight: isMobile ? MOBILE_NODE_HEIGHT : NODE_HEIGHT,
        lineHeight: isMobile ? '1.4' : '1.3',
        position: 'relative'
      }}
      className={`react-flow__node-custom ${selected ? 'selected' : ''}`}
      title={`${roleIcon} ${fullName}`}>
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: 'linear-gradient(135deg, var(--primary), var(--accent))',
          width: isMobile ? 10 : 14,
          height: isMobile ? 10 : 14,
          border: '2px solid #fff',
          borderRadius: '50%',
          boxShadow: '0 0 8px rgba(64, 66, 209, 0.5)',
          top: isMobile ? -6 : -8,
          zIndex: 10,
          transition: 'all 0.3s ease'
        }}
      />
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontSize: isMobile ? '0.7rem' : '0.875rem',
          fontWeight: '500',
          padding: isMobile ? '0 0.5rem' : '0 0.75rem'
        }}>
        {displayText}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: 'linear-gradient(135deg, var(--primary), var(--accent))',
          width: isMobile ? 10 : 14,
          height: isMobile ? 10 : 14,
          border: '2px solid #fff',
          borderRadius: '50%',
          boxShadow: '0 0 8px rgba(64, 66, 209, 0.5)',
          bottom: isMobile ? -6 : -8,
          zIndex: 10,
          transition: 'all 0.3s ease'
        }}
      />
    </div>
  );
};

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

  const orphanIds = nodes
    .filter(
      (node) =>
        !bigToLittles.has(node.id) &&
        !littleToBig.has(node.id) &&
        edges.every((e) => e.source !== node.id && e.target !== node.id)
    )
    .map((node) => node.id);

  const roots = nodes.filter(
    (node) => !littleToBig.has(node.id) && !orphanIds.includes(node.id)
  );

  const subtreeWidths = new Map<string, number>();
  const calculateSubtreeWidth = (nodeId: string): number => {
    if (subtreeWidths.has(nodeId)) return subtreeWidths.get(nodeId)!;
    const children = bigToLittles.get(nodeId) || [];
    if (children.length === 0) {
      subtreeWidths.set(nodeId, NODE_WIDTH);
      return NODE_WIDTH;
    }
    const childrenWidths = children.map((childId) =>
      calculateSubtreeWidth(childId)
    );
    const totalChildWidth =
      childrenWidths.reduce((sum, width) => sum + width, 0) +
      (children.length - 1) * PADDING;
    const width = Math.max(NODE_WIDTH, totalChildWidth);
    subtreeWidths.set(nodeId, width);
    return width;
  };
  roots.forEach((root) => calculateSubtreeWidth(root.id));

  const positions = new Map<string, { x: number; y: number }>();
  const positionNode = (
    nodeId: string,
    x: number,
    y: number,
    availableWidth: number
  ) => {
    positions.set(nodeId, {
      x: x + availableWidth / 2 - NODE_WIDTH / 2,
      y
    });
    const children = bigToLittles.get(nodeId) || [];
    if (children.length === 0) return;

    const totalChildWidth =
      children
        .map((childId) => subtreeWidths.get(childId) || NODE_WIDTH)
        .reduce((sum, width) => sum + width, 0) +
      (children.length - 1) * PADDING;

    let childX = x + (availableWidth - totalChildWidth) / 2;

    children.forEach((childId) => {
      const childWidth = subtreeWidths.get(childId) || NODE_WIDTH;
      positionNode(
        childId,
        childX,
        y + NODE_HEIGHT + VERTICAL_SPACING,
        childWidth
      );
      childX += childWidth + PADDING;
    });
  };

  let orphanX = PADDING;
  const orphanY = PADDING;
  orphanIds.forEach((id) => {
    positions.set(id, { x: orphanX, y: orphanY });
    orphanX += NODE_WIDTH + PADDING;
  });

  const treeStartY =
    orphanY +
    NODE_HEIGHT +
    (orphanIds.length > 0 ? VERTICAL_SPACING * 2 : VERTICAL_SPACING);
  let currentRootX = PADDING;
  roots.forEach((root) => {
    const rootWidth = subtreeWidths.get(root.id) || NODE_WIDTH;
    positionNode(root.id, currentRootX, treeStartY, rootWidth);
    currentRootX += rootWidth + PADDING * 2;
  });

  const allPositions = Array.from(positions.values());
  const minX = Math.min(...allPositions.map((p) => p.x));
  const maxX = Math.max(...allPositions.map((p) => p.x + NODE_WIDTH));
  const totalLayoutWidth = maxX - minX;
  const offsetX =
    totalLayoutWidth < containerWidth
      ? (containerWidth - totalLayoutWidth) / 2 - minX
      : 0;

  const updatedNodes = nodes.map((node) => {
    const pos = positions.get(node.id) || { x: 0, y: 0 };
    const x = Math.max(
      PADDING,
      Math.min(pos.x + offsetX, containerWidth - NODE_WIDTH - PADDING)
    );
    const y = Math.max(
      PADDING,
      Math.min(pos.y, containerHeight - NODE_HEIGHT - PADDING)
    );
    return {
      ...node,
      position: { x, y },
      data: { ...node.data, position_x: x, position_y: y }
    };
  });

  return updatedNodes;
};

const AddMemberDialog: React.FC<{
  isOpen: boolean;
  familyTreeId: string;
  onSave: (identifier: string) => Promise<void>;
  onCancel: () => void;
}> = ({ isOpen, onSave, onCancel }) => {
  const [identifier, setIdentifier] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      toast.error('Please enter a valid identifier');
      return;
    }
    setIsSubmitting(true);
    try {
      await onSave(identifier);
      setIdentifier('');
    } catch (err) {
      toast.error(
        `Failed to add member: ${
          err instanceof Error ? err.message : 'Unknown error'
        }`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Add New Member
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Identifier
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter identifier..."
              disabled={isSubmitting}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || identifier.trim().length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50">
              {isSubmitting ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const useFamilyTreeData = (
  familyTreeId: string,
  setNodes: React.Dispatch<React.SetStateAction<Node<NodeData>[]>>,
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>,
  fitView: (options?: import('reactflow').FitViewOptions) => void,
  getContainerSize: () => { width: number; height: number },
  initialEdges: Edge[]
) => {
  const supabase = useSupabase();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadInitialMembers = async () => {
      setIsLoading(true);
      try {
        const members = await getFamilyTreeMembers(supabase, familyTreeId);
        const { height } = getContainerSize();
        const nodes = members.map((member) => {
          const data: NodeData = {
            label: member.identifier,
            position_x: member.position_x,
            position_y: member.position_y,
            is_big: !!member.is_big,
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
        setNodes(nodes);
        await updateNodeRoles(
          nodes,
          initialEdges,
          setNodes,
          setEdges,
          supabase
        );
        setTimeout(() => fitView({ padding: 0.4 }), 100);
      } catch (err) {
        toast.error(
          `Failed to load members: ${
            err instanceof Error ? err.message : 'Unknown error'
          }`
        );
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialMembers();
  }, [
    familyTreeId,
    supabase,
    setNodes,
    setEdges,
    fitView,
    getContainerSize,
    initialEdges
  ]);

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

const updateNodeRoles = async (
  nodes: Node<NodeData>[],
  edges: Edge[],
  setNodes: React.Dispatch<React.SetStateAction<Node<NodeData>[]>>,
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>,
  supabase: SupabaseClient
) => {
  const bigToLittles = new Map<string, string[]>();
  const littleToBig = new Map<string, string>();

  edges.forEach((edge) => {
    if (!bigToLittles.has(edge.source)) bigToLittles.set(edge.source, []);
    bigToLittles.get(edge.source)?.push(edge.target);
    littleToBig.set(edge.target, edge.source);
  });

  const shouldBeBig = new Set<string>();
  edges.forEach((edge) => {
    shouldBeBig.add(edge.source);
  });

  const updates: { id: string; is_big: boolean }[] = [];

  const updatedNodes = nodes.map((node) => {
    const hasLittles =
      bigToLittles.has(node.id) && bigToLittles.get(node.id)!.length > 0;
    const hasBig = littleToBig.has(node.id);
    const newIsBig = shouldBeBig.has(node.id);

    if (node.data.is_big !== newIsBig) {
      updates.push({ id: node.id, is_big: newIsBig });
    }

    const updatedData = {
      ...node.data,
      hasLittles,
      hasBig,
      is_big: newIsBig
    };

    return {
      ...node,
      data: {
        ...updatedData,
        label: `${getRoleIcon(updatedData)} ${node.data.label
          .split(' ')
          .slice(1)
          .join(' ')}`
      }
    };
  });

  const updatedEdges = edges.map((edge) => {
    const sourceNode = updatedNodes.find((n) => n.id === edge.source);
    const targetNode = updatedNodes.find((n) => n.id === edge.target);
    const isBigToLittle = sourceNode?.data.is_big && targetNode?.data.hasBig;

    return {
      ...edge,
      type: 'smoothstep',
      style: getEdgeStyle(sourceNode, targetNode),
      animated: isBigToLittle,
      markerEnd: getCustomMarker(isBigToLittle ? 'bigToLittle' : 'general'),
      data: {
        relationshipType: isBigToLittle ? 'bigToLittle' : 'general'
      }
    };
  });

  if (updates.length > 0) {
    try {
      const { error } = await supabase
        .from('tree_member')
        .upsert(updates, { onConflict: 'id' });

      if (error) {
        console.error('Failed to update big status:', error);
      }
    } catch (err) {
      console.error('Error updating big status:', err);
    }
  }

  setNodes(updatedNodes);
  setEdges(updatedEdges);
};

const FamilyTreeFlow: React.FC<FamilyTreeFlowProps> = ({
  familyTreeId,
  initialNodes,
  initialEdges
}) => {
  const supabase = useSupabase();
  const styledInitialEdges = useMemo(
    () =>
      initialEdges.map((edge) => {
        const sourceNode = initialNodes.find((n) => n.id === edge.source);
        const targetNode = initialNodes.find((n) => n.id === edge.target);
        const isBigToLittle =
          sourceNode?.data.is_big && targetNode?.data.hasBig;

        return {
          ...edge,
          type: 'smoothstep',
          style: getEdgeStyle(sourceNode, targetNode),
          animated: isBigToLittle,
          markerEnd: getCustomMarker(isBigToLittle ? 'bigToLittle' : 'general'),
          data: {
            ...edge.data,
            relationshipType: isBigToLittle ? 'bigToLittle' : 'general'
          }
        };
      }),
    [initialEdges, initialNodes]
  );

  const styledInitialNodes = useMemo(
    () =>
      initialNodes.map((node) => ({
        ...node,
        position: {
          x: node.data.position_x ?? 0,
          y: node.data.position_y ?? 0
        }
      })),
    [initialNodes]
  );

  const [nodes, setNodes, onNodesChange] =
    useNodesState<NodeData>(styledInitialNodes);
  const [edges, setEdges, onEdgesChange] =
    useEdgesState<Edge>(styledInitialEdges);
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
  const [addMemberDialog, setAddMemberDialog] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const { fitView, getViewport } = useReactFlow();

  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('hasSeenFamilyTreeTutorial');
    if (!hasSeenTutorial) {
      setShowTutorial(true);
      localStorage.setItem('hasSeenFamilyTreeTutorial', 'true');
    }
  }, []);

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
    setEdges,
    fitView,
    getContainerSize,
    styledInitialEdges
  );

  const handleAddMember = useCallback(
    async (identifier: string) => {
      try {
        const { width, height } = getContainerSize();
        const newMember = await createFamilyMember(
          supabase,
          familyTreeId,
          identifier
        );

        const position = findEmptySpace(nodes, newMember.id, width, height);
        const data: NodeData = {
          label: newMember.identifier,
          position_x: position.x,
          position_y: position.y,
          is_big: false,
          hasLittles: false,
          hasBig: false,
          form_submission_id: newMember.form_submission_id
        };

        const newNode = {
          id: newMember.id,
          type: 'custom',
          data: {
            ...data,
            label: `${getRoleIcon(data)} ${newMember.identifier}`
          },
          position,
          draggable: true,
          selectable: true
        };

        setNodes((nds) => [...nds, newNode]);
        setAddMemberDialog(false);
        setTimeout(() => fitView({ padding: 0.4 }), 100);
        toast.success('New member added successfully');
      } catch (err) {
        toast.error(
          `Failed to add member: ${
            err instanceof Error ? err.message : 'Unknown error'
          }`
        );
      }
    },
    [supabase, familyTreeId, setNodes, fitView, getContainerSize, nodes]
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

        const newEdge = createStyledEdge(
          result[0].id,
          connection.source,
          connection.target,
          nodes
        );

        setEdges((eds) => {
          const updatedEdges = addEdge(newEdge, eds);
          setTimeout(async () => {
            await updateNodeRoles(
              nodes,
              updatedEdges,
              setNodes,
              setEdges,
              supabase
            );
          }, 0);
          return updatedEdges;
        });
        toast.success('Connection created');
      } catch {
        toast.error('Duplicate connection detected');
      }
    },
    [setEdges, supabase, nodes, setNodes]
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

        const updatedNodes = nodes.map((n) =>
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
        );

        setNodes(updatedNodes);

        setEdges((eds) =>
          eds.map((edge) => {
            const sourceNode = updatedNodes.find((n) => n.id === edge.source);
            const targetNode = updatedNodes.find((n) => n.id === edge.target);
            const isBigToLittle =
              sourceNode?.data.is_big && targetNode?.data.hasBig;

            const updatedEdge: Edge = {
              ...edge,
              type: 'smoothstep',
              style: getEdgeStyle(sourceNode, targetNode),
              animated: isBigToLittle,
              markerEnd: getCustomMarker(
                isBigToLittle ? 'bigToLittle' : 'general'
              ),
              data: {
                ...(edge.data as Edge),
                relationshipType: isBigToLittle ? 'bigToLittle' : 'general'
              }
            };
            return updatedEdge;
          })
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
    [nodes, setNodes, setEdges, supabase]
  );

  const handleDelete = useCallback(
    async (id: string, type: 'node' | 'edge') => {
      try {
        if (type === 'node') {
          await supabase.from('tree_member').delete().eq('id', id);
          setNodes((nds) => nds.filter((n) => n.id !== id));
          setEdges((eds) => {
            const updatedEdges = eds.filter(
              (e) => e.source !== id && e.target !== id
            );
            setTimeout(async () => {
              const remainingNodes = nodes.filter((n) => n.id !== id);
              await updateNodeRoles(
                remainingNodes,
                updatedEdges,
                setNodes,
                setEdges,
                supabase
              );
            }, 0);
            return updatedEdges;
          });
          toast.success('Member deleted');
        } else {
          const edge = edges.find((e) => e.id === id);
          if (edge) {
            await removeConnection(supabase, edge.target, edge.source);
            setEdges((eds) => {
              const updatedEdges = eds.filter((e) => e.id !== id);
              setTimeout(async () => {
                await updateNodeRoles(
                  nodes,
                  updatedEdges,
                  setNodes,
                  setEdges,
                  supabase
                );
              }, 0);
              return updatedEdges;
            });
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
    [edges, setNodes, setEdges, supabase, nodes]
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
        toast(
          'No nodes to reset layout for. Please refetch submissions or add members.'
        );
        return;
      }
      if (!nodes.every((n) => n.id && n.data && n.data.label)) {
        throw new Error(
          'Invalid node data: some nodes are missing id or label'
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
        const update: {
          id: string;
          position_x: number;
          position_y: number;
          identifier: string;
          form_submission_id?: string | null;
        } = {
          id: node.id,
          position_x: Math.round(node.position.x),
          position_y: Math.round(node.position.y),
          identifier
        };
        if (node.data.form_submission_id) {
          update.form_submission_id = node.data.form_submission_id;
        }
        return update;
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
          toast(
            `Failed to fetch submission details: ${
              err instanceof Error ? err.message : 'Unknown error'
            }`
          );
        }
      } else {
        toast.info('No submission details available for this member');
        setSelectedSubmission(null);
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
      <div
        className={`layout-controls ${
          isMobile
            ? 'flex flex-wrap gap-1 p-2 backdrop-blur-sm rounded-lg shadow-md mx-2 mt-2 justify-center items-center fixed top-0 left-0 right-0 z-10'
            : 'flex gap-3 p-3'
        }`}>
        <button
          onClick={resetLayout}
          disabled={isLoading}
          className={`${
            isMobile
              ? 'px-2 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 flex-1 min-w-0 flex items-center justify-center'
              : 'px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50'
          }`}>
          {isMobile ? 'Layout' : 'Auto Layout'}
        </button>
        <button
          onClick={() => {
            setTimeout(() => fitView({ padding: 0.4 }), 100);
            toast.success('View recentered');
          }}
          disabled={isLoading}
          className={`${
            isMobile
              ? 'px-2 py-1.5 text-xs font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50 flex-1 min-w-0 flex items-center justify-center'
              : 'px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50'
          }`}>
          {isMobile ? 'Center' : 'Recenter'}
        </button>
        <button
          onClick={refetchNewSubmissions}
          disabled={isLoading}
          className={`${
            isMobile
              ? 'px-2 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 flex-1 min-w-0 flex items-center justify-center'
              : 'px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50'
          }`}>
          {isMobile ? 'Refetch' : 'Refetch Submissions'}
        </button>
        <button
          onClick={() => setAddMemberDialog(true)}
          disabled={isLoading}
          className={`${
            isMobile
              ? 'px-2 py-1.5 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-1 focus:ring-green-500 disabled:opacity-50 flex-1 min-w-0 flex items-center justify-center'
              : 'px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50'
          }`}>
          {isMobile ? 'Add' : 'Add Member'}
        </button>
        <button
          onClick={() => setShowTutorial(true)}
          disabled={isLoading}
          className={`${
            isMobile
              ? 'px-2 py-1.5 text-xs font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-50 flex-1 min-w-0 flex items-center justify-center'
              : 'px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50'
          }`}>
          Tutorial
        </button>
      </div>

      <div
        className={`absolute ${
          isMobile
            ? 'bottom-2 right-2 scale-90 origin-bottom-right'
            : 'bottom-4 left-4'
        } z-10`}>
        <div
          className={`bg-gradient-to-br from-white via-gray-50 to-gray-100 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-200/50 ${
            isMobile
              ? 'p-2 text-xs min-w-[160px] max-w-[180px]'
              : 'p-4 text-sm min-w-[220px]'
          }`}>
          <div
            className={`flex items-center gap-2 pb-2 border-b border-gray-200/70 ${
              isMobile ? 'mb-2' : 'mb-3'
            }`}>
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-600"></div>
            <span
              className={`font-bold text-gray-800 tracking-wide ${
                isMobile ? 'text-[10px]' : ''
              }`}>
              {isMobile ? 'LEGEND' : 'FAMILY TREE LEGEND'}
            </span>
          </div>
          <div className={`${isMobile ? 'space-y-1.5' : 'space-y-2.5'}`}>
            <div
              className={`flex items-center rounded-lg hover:bg-gray-100/60 transition-colors duration-200 ${
                isMobile ? 'gap-2 p-1' : 'gap-3 p-2'
              }`}>
              <div
                className={`flex flex-row items-center justify-center bg-gradient-to-r from-purple-500 to-purple-700 rounded text-white font-medium gap-1 ${
                  isMobile ? 'w-12 h-5 text-[8px]' : 'w-18 h-7 text-xs'
                }`}>
                <span>👑</span>
                <span>🌱</span>
              </div>
              <span
                className={`text-gray-700 font-medium ${
                  isMobile ? 'text-[10px]' : ''
                }`}>
                {isMobile ? 'Big+Little' : 'Big and Little'}
              </span>
            </div>
            <div
              className={`flex items-center rounded-lg hover:bg-gray-100/60 transition-colors duration-200 ${
                isMobile ? 'gap-2 p-1' : 'gap-3 p-2'
              }`}>
              <div
                className={`flex items-center justify-center bg-gradient-to-r from-indigo-500 to-indigo-700 rounded text-white font-medium ${
                  isMobile ? 'w-12 h-5 text-[8px]' : 'w-16 h-7 text-xs'
                }`}>
                ⭐
              </div>
              <span
                className={`text-gray-700 font-medium ${
                  isMobile ? 'text-[10px]' : ''
                }`}>
                Big
              </span>
            </div>
            <div
              className={`flex items-center rounded-lg hover:bg-gray-100/60 transition-colors duration-200 ${
                isMobile ? 'gap-2 p-1' : 'gap-3 p-2'
              }`}>
              <div
                className={`flex items-center justify-center bg-gradient-to-r from-green-500 to-green-700 rounded text-white font-medium ${
                  isMobile ? 'w-12 h-5 text-[8px]' : 'w-16 h-7 text-xs'
                }`}>
                🌱
              </div>
              <span
                className={`text-gray-700 font-medium ${
                  isMobile ? 'text-[10px]' : ''
                }`}>
                Little
              </span>
            </div>
            <div
              className={`flex items-center rounded-lg hover:bg-gray-100/60 transition-colors duration-200 ${
                isMobile ? 'gap-2 p-1' : 'gap-3 p-2'
              }`}>
              <div
                className={`flex items-center justify-center bg-gradient-to-r from-gray-400 to-gray-500 rounded text-white font-medium ${
                  isMobile ? 'w-12 h-5 text-[8px]' : 'w-16 h-7 text-xs'
                }`}>
                ⚪
              </div>
              <span
                className={`text-gray-700 font-medium ${
                  isMobile ? 'text-[10px]' : ''
                }`}>
                Unconnected
              </span>
            </div>
          </div>
          <div
            className={`border-t border-gray-200/70 ${
              isMobile ? 'mt-2 pt-1' : 'mt-3 pt-2'
            }`}>
            <div
              className={`text-gray-500 text-center ${
                isMobile ? 'text-[9px] leading-tight' : 'text-xs'
              }`}>
              {isMobile
                ? 'Double-tap to edit members'
                : 'Double-click nodes to edit • Right-click for options'}
            </div>
          </div>
        </div>
      </div>

      {selectedSubmission && selectedSubmission.formId && !isMobile && (
        <div className="z-50">
          <SubmissionDetailsOverlay
            formSubmissionId={selectedSubmission.formSubmissionId}
            formId={selectedSubmission.formId}
            allOptions={selectedSubmission.allOptions}
            onClose={() => setSelectedSubmission(null)}
          />
        </div>
      )}

      {selectedSubmission && !selectedSubmission.formId && !isMobile && (
        <div className="z-50">
          <SubmissionDetailsLoadingSkeleton
            onClose={() => setSelectedSubmission(null)}
          />
        </div>
      )}

      {showTutorial && (
        <TutorialOverlay
          onComplete={() => {
            setShowTutorial(false);
            localStorage.setItem('hasSeenFamilyTreeTutorial', 'true');
          }}
        />
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
            setAddMemberDialog(false);
          }}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{
            padding: isMobile ? 0.2 : 0.4,
            maxZoom: isMobile ? 2 : 1
          }}
          minZoom={isMobile ? 0.1 : 0.2}
          maxZoom={isMobile ? 6 : 4}
          proOptions={proOptions}>
          <svg style={{ position: 'absolute', width: 0, height: 0 }}>
            <defs>
              <linearGradient
                id="bigToLittleGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.8} />
                <stop offset="50%" stopColor="#a855f7" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.8} />
              </linearGradient>
              <linearGradient
                id="generalGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%">
                <stop offset="0%" stopColor="#64748b" stopOpacity={0.6} />
                <stop offset="50%" stopColor="#94a3b8" stopOpacity={0.7} />
                <stop offset="100%" stopColor="#475569" stopOpacity={0.6} />
              </linearGradient>
            </defs>
          </svg>
          {!isMobile && <MiniMap />}
          <Controls
            showZoom={!isMobile}
            showFitView={true}
            showInteractive={!isMobile}
          />
          <Background
            variant={BackgroundVariant.Dots}
            gap={isMobile ? 15 : 20}
          />
        </ReactFlow>
      </div>

      {contextMenu && (
        <div
          className={`absolute bg-white/95 backdrop-blur-md border border-gray-200/50 rounded-xl shadow-2xl py-3 z-[100] ${
            isMobile ? 'min-w-[160px] text-sm' : 'min-w-[200px]'
          } animate-in fade-in-0 zoom-in-95 duration-150`}
          style={{
            left: isMobile
              ? Math.min(contextMenu.position.x, window.innerWidth - 170)
              : contextMenu.position.x + 10,
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
              <>
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
              </>
            )}
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
      {addMemberDialog && (
        <AddMemberDialog
          isOpen={addMemberDialog}
          familyTreeId={familyTreeId}
          onSave={handleAddMember}
          onCancel={() => setAddMemberDialog(false)}
        />
      )}
    </div>
  );
};

export default FamilyTreeFlow;
