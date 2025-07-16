import React, { useCallback, useState, useRef, useEffect } from 'react';
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
import {
  createConnection,
  removeConnection,
  getFamilyTreeMembers,
  refetchSubmissions,
  toggleBig
} from '@/utils/supabase/queries/family-tree';
import { z } from 'zod';
import { toast } from 'sonner';

const NODE_WIDTH = 172;
const NODE_HEIGHT = 36;
const PADDING = 50;
const VERTICAL_SPACING = 100;

interface NodeData {
  label: string;
  position_x: number | null;
  position_y: number | null;
  is_big: boolean;
  hasLittles: boolean;
  hasBig: boolean;
}

interface ContextMenuData {
  id: string;
  type: 'node' | 'edge';
  position: { x: number; y: number };
}

// Node styling based on role
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

// Position utilities
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
  // Build adjacency lists
  const bigToLittles = new Map<string, string[]>();
  const littleToBig = new Map<string, string>();
  edges.forEach((edge) => {
    if (!bigToLittles.has(edge.source)) bigToLittles.set(edge.source, []);
    bigToLittles.get(edge.source)?.push(edge.target);
    littleToBig.set(edge.target, edge.source);
  });

  // Find root nodes (bigs with no big or unconnected nodes)
  const roots = nodes.filter(
    (node) => !littleToBig.has(node.id) || !node.data.hasBig
  );

  // Assign levels based on hierarchy
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
      levels.set(node.id, 0); // Unconnected nodes at top
    }
  });

  // Group nodes by level
  const levelGroups = new Map<number, Node<NodeData>[]>();
  nodes.forEach((node) => {
    const level = levels.get(node.id) || 0;
    if (!levelGroups.has(level)) levelGroups.set(level, []);
    levelGroups.get(level)?.push(node);
  });

  // Calculate max width needed
  const maxLevelWidth = Math.max(
    ...Array.from(levelGroups.values()).map((group) => group.length)
  );
  const totalWidth = maxLevelWidth * (NODE_WIDTH + PADDING);
  const offsetX = Math.max(0, (containerWidth - totalWidth) / 2);

  // Assign positions
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

// Data loading hook
const useFamilyTreeData = (
  familyTreeId: string,
  setNodes: React.Dispatch<React.SetStateAction<Node<NodeData>[]>>,
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>,
  fitView: (options?: import('reactflow').FitViewOptions) => void,
  getContainerSize: () => { width: number; height: number }
) => {
  const supabase = useSupabase();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFamilyTree = useCallback(async () => {
    if (!familyTreeId) return;
    setIsLoading(true);
    setError(null);

    try {
      const [members, { data: connections }] = await Promise.all([
        getFamilyTreeMembers(supabase, familyTreeId),
        supabase
          .from('connections')
          .select('id, big_id, little_id')
          .eq('family_tree_id', familyTreeId)
      ]);

      const { height } = getContainerSize();
      const bigToLittles = new Map<string, string[]>();
      const littleToBig = new Map<string, string>();

      connections?.forEach((conn) => {
        if (!bigToLittles.has(conn.big_id)) bigToLittles.set(conn.big_id, []);
        bigToLittles.get(conn.big_id)?.push(conn.little_id);
        littleToBig.set(conn.little_id, conn.big_id);
      });

      const nodes: Node[] = members.map((member) => {
        const hasLittles = bigToLittles.has(member.id);
        const hasBig = littleToBig.has(member.id);
        const data: NodeData = {
          label: member.identifier,
          position_x: member.position_x,
          position_y: member.position_y,
          is_big: member.is_big ?? false,
          hasLittles,
          hasBig
        };

        return {
          id: member.id,
          type: 'custom',
          data: { ...data, label: `${getRoleIcon(data)} ${member.identifier}` },
          position: getNodePosition(member, height),
          draggable: true,
          selectable: true
        };
      });

      const edges: Edge[] =
        connections?.map((conn) => ({
          id: conn.id,
          type: 'smoothstep',
          source: conn.big_id,
          target: conn.little_id,
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
        })) ?? [];

      setNodes(nodes); // Use stored positions instead of autoLayout
      setEdges(edges);
      setTimeout(() => fitView({ padding: 0.4 }), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      toast.error('Failed to load family tree');
    } finally {
      setIsLoading(false);
    }
  }, [familyTreeId, supabase, setNodes, setEdges, fitView, getContainerSize]);

  const refetchNewSubmissions = useCallback(async () => {
    if (!familyTreeId) return;
    setIsLoading(true);

    try {
      const [members, submissions] = await Promise.all([
        getFamilyTreeMembers(supabase, familyTreeId),
        refetchSubmissions(supabase, familyTreeId)
      ]);

      const existingIds = new Set(
        members.map((m) => m.form_submission_id).filter(Boolean)
      );
      const newSubmissions = submissions.filter((s) => !existingIds.has(s.id));

      if (!newSubmissions.length) {
        toast.info('No new submissions found');
        return;
      }

      const { data: familyTree } = await supabase
        .from('family_tree')
        .select('form_id, question_id')
        .eq('id', familyTreeId)
        .single();

      if (!familyTree) {
        toast.error('Family tree data not found');
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
            hasBig: false
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

  return { loadFamilyTree, refetchNewSubmissions, isLoading, error };
};

interface FamilyTreeFlowProps {
  familyTreeId: string;
}

const FamilyTreeFlow: React.FC<FamilyTreeFlowProps> = ({ familyTreeId }) => {
  const supabase = useSupabase();
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [contextMenu, setContextMenu] = useState<ContextMenuData | null>(null);
  const { fitView } = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);

  const getContainerSize = useCallback(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      return { width, height };
    }
    return { width: window.innerWidth, height: window.innerHeight };
  }, []);

  const { loadFamilyTree, refetchNewSubmissions, isLoading, error } =
    useFamilyTreeData(
      familyTreeId,
      setNodes,
      setEdges,
      fitView,
      getContainerSize
    );

  useEffect(() => {
    if (familyTreeId) loadFamilyTree();
  }, [loadFamilyTree, familyTreeId]);

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
        loadFamilyTree();
      } catch (err) {
        toast.error(
          `Failed to create connection: ${
            err instanceof Error ? err.message : 'Unknown error'
          }`
        );
      }
    },
    [setEdges, supabase, loadFamilyTree]
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
            loadFamilyTree();
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
    [edges, setNodes, setEdges, supabase, loadFamilyTree]
  );

  const resetLayout = useCallback(async () => {
    const { width, height } = getContainerSize();
    const updatedNodes = autoLayout(nodes, edges, width, height);

    try {
      // Update nodes one by one to avoid conflicts
      for (const node of updatedNodes) {
        const { error } = await supabase
          .from('tree_member')
          .update({
            position_x: node.position.x,
            position_y: node.position.y,
            identifier: node.data.label.split(' ').slice(1).join(' ') // Extract identifier without the emoji
          })
          .eq('id', node.id);

        if (error) throw error;
      }

      setNodes(updatedNodes);
      setTimeout(() => fitView({ padding: 0.4 }), 100);
      toast.success('Layout reset and positions saved');
    } catch (err) {
      console.error('Error resetting layout:', err);
      toast.error(
        `Failed to save node positions: ${
          err instanceof Error ? err.message : JSON.stringify(err)
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
        toast.success('Position updated');
      } catch (err) {
        toast.error(
          `Failed to update position: ${
            err instanceof Error ? err.message : 'Unknown error'
          }`
        );
      }
    },
    [setNodes, supabase, getContainerSize]
  );

  if (isLoading)
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading family tree...</p>
      </div>
    );
  if (error)
    return (
      <div className="error-container">
        <p>Error: {error}</p>
      </div>
    );

  return (
    <div className="family-tree-container">
      <style>{`
        .family-tree-container {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          background: #f8fafc;
        }
      
        .loading-container, .error-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
        }
        
        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e5e7eb;
          border-top: 3px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .error-container p {
          color: #dc2626;
          font-size: 16px;
          margin: 0;
        }
        
        .loading-container p {
          color: #6b7280;
          font-size: 16px;
          margin: 0;
        }
        
        .react-flow__node-custom { 
          background: transparent !important; 
          border: none !important; 
          padding: 0 !important; 
          width: ${NODE_WIDTH}px !important; 
          height: ${NODE_HEIGHT}px !important; 
        }
        
        .react-flow__node-custom.selected { 
          transform: scale(1.05); 
        }
        
        .react-flow__node-custom:hover { 
          transform: scale(1.02); 
        }
        
        .react-flow__attribution {
          display: none !important;
        }
        
        .react-flow__renderer {
          background: transparent;
        }
        
        .react-flow__pane {
          cursor: grab;
        }
        
        .react-flow__pane.dragging {
          cursor: grabbing;
        }
        
        .react-flow__edge-path:hover {
          stroke: #3b82f6 !important;
          stroke-width: 6 !important;
          cursor: pointer;
        }
        
        .layout-controls { 
          display: flex; 
          gap: 8px; 
          padding: 10px; 
          position: absolute; 
          top: 16px; 
          left: 16px; 
          z-index: 1000; 
          background: rgba(255, 255, 255, 0.95); 
          border-radius: 8px; 
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          backdrop-filter: blur(10px);
        }
        
        .layout-controls button { 
          padding: 8px 12px; 
          border: 1px solid #e5e7eb; 
          background: #fff; 
          border-radius: 6px; 
          cursor: pointer; 
          font-size: 12px; 
          color: #374151; 
          transition: all 0.2s; 
          font-weight: 500;
          white-space: nowrap;
        }
        
        .layout-controls button:hover { 
          background: #f3f4f6; 
          border-color: #d1d5db; 
        }
        
        .layout-controls button:disabled { 
          opacity: 0.5; 
          cursor: not-allowed; 
        }
        
        .context-menu { 
          display: flex; 
          flex-direction: column; 
          gap: 4px; 
          padding: 8px; 
          background: rgba(255, 255, 255, 0.95); 
          border: 1px solid #e5e7eb; 
          border-radius: 8px; 
          box-shadow: 0 4px 12px rgba(0,0,0,0.15); 
          position: fixed; 
          z-index: 1000; 
          min-width: 140px;
          backdrop-filter: blur(10px);
        }
        
        .context-menu button { 
          padding: 6px 10px; 
          border: none; 
          background: #fff; 
          text-align: left; 
          cursor: pointer; 
          font-size: 12px; 
          color: #374151; 
          border-radius: 4px; 
          transition: background 0.2s; 
          font-weight: 500; 
        }
        
        .context-menu button:hover { 
          background: #f3f4f6; 
        }
        
        .context-menu .title { 
          font-weight: 600; 
          color: #6b7280; 
          padding: 4px 10px 6px; 
          border-bottom: 1px solid #e5e7eb; 
          font-size: 11px; 
          text-transform: uppercase; 
        }
        
        .legend { 
          position: absolute; 
          top: 16px; 
          right: 16px; 
          background: rgba(255, 255, 255, 0.95); 
          border-radius: 8px; 
          box-shadow: 0 2px 8px rgba(0,0,0,0.1); 
          padding: 12px; 
          z-index: 1000; 
          font-size: 11px; 
          color: #374151; 
          min-width: 180px;
          backdrop-filter: blur(10px);
        }
        
        .legend-title { 
          font-weight: 600; 
          margin-bottom: 8px; 
          color: #1f2937; 
        }
        
        .legend-item { 
          display: flex; 
          align-items: center; 
          gap: 8px; 
          margin-bottom: 4px; 
        }
        
        .legend-color { 
          width: 16px; 
          height: 16px; 
          border-radius: 3px; 
          flex-shrink: 0; 
        }
        
        .react-flow-container {
          width: 100%;
          height: 100%;
        }
      `}</style>

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

      <div className="legend">
        <div className="legend-title">Legend</div>
        <div className="legend-item">
          <div
            className="legend-color"
            style={{
              background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)'
            }}
          />
          <span>👑🌱 Big and Little</span>
        </div>
        <div className="legend-item">
          <div
            className="legend-color"
            style={{
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)'
            }}
          />
          <span>👑 Big with Littles</span>
        </div>
        <div className="legend-item">
          <div
            className="legend-color"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)'
            }}
          />
          <span>⭐ Big without Littles</span>
        </div>
        <div className="legend-item">
          <div
            className="legend-color"
            style={{
              background: 'linear-gradient(135deg, #10b981, #047857)'
            }}
          />
          <span>🌱 Little</span>
        </div>
        <div className="legend-item">
          <div
            className="legend-color"
            style={{
              background: 'linear-gradient(135deg, #f3f4f6, #e5e7eb)'
            }}
          />
          <span>⚪ Unconnected</span>
        </div>
      </div>

      <div
        ref={containerRef}
        className="react-flow-container"
        onClick={() => setContextMenu(null)}>
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
            setContextMenu({
              id: node.id,
              type: 'node',
              position: { x: e.clientX, y: e.clientY }
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
          onNodeClick={(e, node) => {
            e.stopPropagation();
            setNodes((nds) =>
              nds.map((n) => ({ ...n, selected: n.id === node.id }))
            );
            setEdges((eds) => eds.map((e) => ({ ...e, selected: false })));
            setContextMenu(null);
          }}
          onPaneClick={() => {
            setNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
            setEdges((eds) => eds.map((e) => ({ ...e, selected: false })));
            setContextMenu(null);
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
        {contextMenu && (
          <div
            className="context-menu"
            style={{
              top: contextMenu.position.y,
              left: contextMenu.position.x
            }}>
            <div className="title">
              {contextMenu.type === 'node'
                ? 'Member Options'
                : 'Connection Options'}
            </div>
            {contextMenu.type === 'node' && (
              <button onClick={() => handleToggleBig(contextMenu.id)}>
                {nodes.find((n) => n.id === contextMenu.id)?.data.is_big
                  ? 'Demote from Big'
                  : 'Promote to Big'}
              </button>
            )}
            <button
              onClick={() => handleDelete(contextMenu.id, contextMenu.type)}>
              Delete {contextMenu.type === 'node' ? 'Member' : 'Connection'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FamilyTreeFlow;
