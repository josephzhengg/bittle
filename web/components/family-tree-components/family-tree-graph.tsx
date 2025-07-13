import React, { useCallback, useState, useEffect } from 'react';
import ReactFlow, {
  ReactFlowProvider,
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
  OnConnect,
  useReactFlow,
  NodeMouseHandler,
  EdgeMouseHandler
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useSupabase } from '@/lib/supabase';
import { TreeMember } from '@/utils/supabase/models/tree-member';
import { Group } from '@/utils/supabase/models/group';
import {
  createGroup,
  createConnection,
  removeConnection,
  getFamilyTreeMembers,
  getFamilyTreeById
} from '@/utils/supabase/queries/family-tree';
import { z } from 'zod';
import { toast } from 'sonner';

// Types
interface ContextMenuData {
  id: string;
  type: 'node' | 'edge';
  position: { x: number; y: number };
}

interface ResizeState {
  nodeId: string;
  handle: 'top' | 'bottom' | 'left' | 'right';
}

type NodeAction = 'delete' | 'detach';

// Constants
const NODE_WIDTH = 172;
const NODE_HEIGHT = 36;
const GROUP_WIDTH = 300;
const GROUP_HEIGHT = 200;
const PADDING = 50;

// Utility to get node position from database
const getNodePosition = (
  member: z.infer<typeof TreeMember>,
  groups: z.infer<typeof Group>[]
): { x: number; y: number } => {
  const defaultPos = { x: 100, y: 100 };
  if (!member.position_x || !member.position_y) return defaultPos;

  if (!member.group_id) {
    return { x: member.position_x, y: member.position_y };
  }

  const group = groups.find((g) => g.id === member.group_id);
  if (!group) return defaultPos;

  return {
    x: member.position_x,
    y: member.position_y
  };
};

// Utility to get absolute position for persistence
const getAbsolutePosition = (
  node: Node,
  nodes: Node[]
): { x: number; y: number } => {
  if (!node.parentNode) {
    return { x: node.position.x, y: node.position.y };
  }
  const parent = nodes.find((n) => n.id === node.parentNode);
  if (!parent) {
    return { x: node.position.x, y: node.position.y };
  }
  return {
    x: node.position.x + parent.position.x,
    y: node.position.y + parent.position.y
  };
};

// Utility to find an empty space for a node
const findEmptySpace = (
  nodes: Node[],
  targetNode: Node,
  parentGroup: Node,
  nodeWidth: number,
  nodeHeight: number
): { x: number; y: number } => {
  const parentWidth =
    parentGroup.style && typeof parentGroup.style.width === 'string'
      ? parseFloat(parentGroup.style.width)
      : GROUP_WIDTH;
  const parentHeight =
    parentGroup.style && typeof parentGroup.style.height === 'string'
      ? parseFloat(parentGroup.style.height)
      : GROUP_HEIGHT;
  let x = parentGroup.position.x + parentWidth + PADDING;
  let y = parentGroup.position.y;

  const isOverlapping = (testX: number, testY: number): boolean => {
    return nodes.some((n) => {
      if (n.id === targetNode.id) return false;
      const nWidth =
        n.className === 'group-node' &&
        n.style &&
        typeof n.style.width === 'string'
          ? parseFloat(n.style.width)
          : NODE_WIDTH;
      const nHeight =
        n.className === 'group-node' &&
        n.style &&
        typeof n.style.height === 'string'
          ? parseFloat(n.style.height)
          : NODE_HEIGHT;
      const nX = n.position.x;
      const nY = n.position.y;

      return (
        testX < nX + nWidth + PADDING &&
        testX + nodeWidth + PADDING > nX &&
        testY < nY + nHeight + PADDING &&
        testY + nodeHeight + PADDING > nY
      );
    });
  };

  const maxAttempts = 10;
  let attempts = 0;
  const stepSize = 50;
  const directions = [
    { dx: 1, dy: 0 }, // Right
    { dx: 0, dy: 1 }, // Down
    { dx: -1, dy: 0 }, // Left
    { dx: 0, dy: -1 } // Up
  ];
  let directionIndex = 0;

  while (isOverlapping(x, y) && attempts < maxAttempts) {
    const { dx, dy } = directions[directionIndex % directions.length];
    x += dx * stepSize;
    y += dy * stepSize;
    directionIndex++;
    attempts++;
  }

  return { x, y };
};

// Utility to center nodes and groups (only for elements without positions)
const centerElements = (
  nodes: Node[],
  groups: z.infer<typeof Group>[],
  viewport: { width: number; height: number }
): Node[] => {
  const groupNodes = nodes.filter((node) => node.className === 'group-node');
  const regularNodes = nodes.filter((node) => node.className !== 'group-node');
  const nodesWithoutPosition = regularNodes.filter(
    (node) => !node.data.position_x || !node.data.position_y
  );
  const groupsWithoutPosition = groupNodes.filter(
    (node) => !node.data.position_x || !node.data.position_y
  );

  const totalWidth = Math.max(
    (nodesWithoutPosition.length + groupsWithoutPosition.length) *
      (NODE_WIDTH + PADDING),
    viewport.width
  );
  const totalHeight = Math.max(
    Math.ceil(
      (nodesWithoutPosition.length + groupsWithoutPosition.length) / 5
    ) *
      (NODE_HEIGHT + PADDING),
    viewport.height
  );

  const centeredNodesWithoutPosition = nodesWithoutPosition.map(
    (node, index) => {
      const newX =
        (viewport.width - totalWidth) / 2 +
        (index % 5) * (NODE_WIDTH + PADDING);
      const newY =
        (viewport.height - totalHeight) / 2 +
        Math.floor(index / 5) * (NODE_HEIGHT + PADDING);
      return {
        ...node,
        position: { x: newX, y: newY },
        data: {
          ...node.data,
          position_x: newX,
          position_y: newY
        }
      };
    }
  );

  const centeredGroupsWithoutPosition = groupsWithoutPosition.map(
    (node, index) => {
      const newX =
        (viewport.width - totalWidth) / 2 +
        (index % 5) * (GROUP_WIDTH + PADDING);
      const newY =
        (viewport.height - totalHeight) / 2 +
        Math.floor(index / 5) * (GROUP_HEIGHT + PADDING);
      return {
        ...node,
        position: { x: newX, y: newY },
        data: {
          ...node.data,
          position_x: newX,
          position_y: newY
        }
      };
    }
  );

  const nodesWithPosition = regularNodes.filter(
    (node) => node.data.position_x && node.data.position_y
  );
  const groupsWithPosition = groupNodes.filter(
    (node) => node.data.position_x && node.data.position_y
  );

  return [
    ...nodesWithPosition,
    ...centeredNodesWithoutPosition,
    ...groupsWithPosition,
    ...centeredGroupsWithoutPosition
  ];
};

// Custom hook for loading family tree data
const useFamilyTreeData = (
  familyTreeId: string,
  setNodes: (nodes: Node[]) => void,
  setEdges: (edges: Edge[]) => void,
  fitView: (options?: {
    padding?: number;
    includeHiddenNodes?: boolean;
  }) => void
) => {
  const supabase = useSupabase();
  const { getViewport } = useReactFlow();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFamilyTree = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const familyTree = await getFamilyTreeById(supabase, familyTreeId);
      const members = await getFamilyTreeMembers(supabase, familyTreeId);
      const { data: groupsData, error: groupsError } = await supabase
        .from('group')
        .select('id, family_tree_id, position_x, position_y, width, height')
        .eq('family_tree_id', familyTreeId);

      if (groupsError)
        throw new Error(`Error fetching groups: ${groupsError.message}`);

      const groups = groupsData ? Group.array().parse(groupsData) : [];

      const { data: connectionsData, error: connectionsError } = await supabase
        .from('connections')
        .select('id, big_id, little_id')
        .eq('family_tree_id', familyTreeId);

      if (connectionsError)
        throw new Error(
          `Error fetching connections: ${connectionsError.message}`
        );

      const initialNodes: Node[] = members.map((member) => ({
        id: member.id,
        type: 'default',
        data: {
          label: member.identifier,
          position_x: member.position_x,
          position_y: member.position_y
        },
        position: getNodePosition(member, groups),
        draggable: true,
        selectable: true,
        parentNode: member.group_id ?? undefined,
        extent: member.group_id ? ('parent' as const) : undefined,
        style: { zIndex: 10 }
      }));

      const groupNodes: Node[] = groups.map((group) => ({
        id: group.id,
        type: 'group',
        data: {
          label: `Family Group ${group.id.slice(0, 4)}`,
          position_x: group.position_x,
          position_y: group.position_y
        },
        position: { x: group.position_x ?? 100, y: group.position_y ?? 100 },
        style: {
          width: group.width ?? '300px',
          height: group.height ?? '200px',
          backgroundColor: 'rgba(249, 245, 249, 0.8)',
          border: '2px dashed #444',
          zIndex: 1
        },
        className: 'group-node',
        draggable: true,
        selectable: true
      }));

      const initialEdges: Edge[] = connectionsData
        ? connectionsData.map((conn) => ({
            id: `e${conn.big_id}-${conn.little_id}`,
            type: 'default',
            source: conn.big_id,
            target: conn.little_id,
            style: { zIndex: 5 }
          }))
        : [];

      const allNodes = [...initialNodes, ...groupNodes];
      const viewport = getViewport();
      const centeredNodes = centerElements(allNodes, groups, {
        width: window.innerWidth,
        height: window.innerHeight * 0.85
      });

      setNodes(centeredNodes);
      setEdges(initialEdges);
      window.requestAnimationFrame(() => fitView({ padding: 0.2 }));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
      toast.error('Failed to load family tree');
    } finally {
      setIsLoading(false);
    }
  }, [familyTreeId, supabase, getViewport, setNodes, setEdges, fitView]);

  return { loadFamilyTree, isLoading, error };
};

interface FamilyTreeFlowProps {
  familyTreeId: string;
}

const FamilyTreeFlow: React.FC<FamilyTreeFlowProps> = ({ familyTreeId }) => {
  const supabase = useSupabase();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node[]>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([]);
  const [contextMenu, setContextMenu] = useState<ContextMenuData | null>(null);
  const [resizing, setResizing] = useState<ResizeState | null>(null);
  const { fitView } = useReactFlow();
  const { loadFamilyTree, isLoading, error } = useFamilyTreeData(
    familyTreeId,
    setNodes,
    setEdges,
    fitView
  );

  // Load family tree data
  useEffect(() => {
    void loadFamilyTree();
  }, [loadFamilyTree]);

  // Handle node context menu (right-click)
  const onNodeContextMenu: NodeMouseHandler = useCallback((event, node) => {
    event.preventDefault();
    setContextMenu({
      id: node.id,
      type: 'node',
      position: { x: event.clientX, y: event.clientY }
    });
  }, []);

  // Handle edge context menu (right-click)
  const onEdgeContextMenu: EdgeMouseHandler = useCallback((event, edge) => {
    event.preventDefault();
    setContextMenu({
      id: edge.id,
      type: 'edge',
      position: { x: event.clientX, y: event.clientY }
    });
  }, []);

  // Handle edge creation
  const onConnect: OnConnect = useCallback(
    async (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      try {
        await createConnection(supabase, connection.source, connection.target);
        setEdges((eds) =>
          addEdge(
            {
              ...connection,
              id: `e${connection.source}-${connection.target}`,
              type: 'default',
              style: { zIndex: 5 }
            },
            eds
          )
        );
        toast.success('Connection created');
      } catch (error) {
        toast.error('Failed to create connection');
        console.error('Error creating connection:', error);
      }
    },
    [setEdges, supabase]
  );

  // Handle node actions (delete or detach)
  const handleNodeAction = async (action: NodeAction, nodeId: string) => {
    try {
      if (action === 'delete') {
        const node = nodes.find((n) => n.id === nodeId);
        if (!node) return;
        const isGroup = node.className === 'group-node';
        await supabase
          .from(isGroup ? 'group' : 'tree_member')
          .delete()
          .eq('id', nodeId);
        setNodes((nds) => nds.filter((n) => n.id !== nodeId));
        setEdges((eds) =>
          eds.filter((e) => e.source !== nodeId && e.target !== nodeId)
        );
        toast.success(`${isGroup ? 'Group' : 'Member'} deleted`);
      } else if (action === 'detach') {
        const node = nodes.find((n) => n.id === nodeId);
        if (!node || !node.parentNode) return;
        const parentGroup = nodes.find((n) => n.id === node.parentNode);
        if (!parentGroup) return;

        const { x, y } = findEmptySpace(
          nodes,
          node,
          parentGroup,
          NODE_WIDTH,
          NODE_HEIGHT
        );

        await supabase
          .from('tree_member')
          .update({ group_id: null, position_x: x, position_y: y })
          .eq('id', nodeId);

        setNodes((nds) =>
          nds.map((n) =>
            n.id === nodeId
              ? {
                  ...n,
                  parentNode: undefined,
                  extent: undefined,
                  position: { x, y }
                }
              : n
          )
        );
        toast.success('Member detached from group');
      }
      setContextMenu(null);
    } catch (error) {
      toast.error(`Failed to ${action === 'delete' ? 'delete' : 'detach'}`);
      console.error(`Error performing ${action} action:`, error);
    }
  };

  // Handle edge deletion
  const handleEdgeAction = async (edgeId: string) => {
    try {
      const edgeMatch = edgeId.match(/e(.+)-(.+)/);
      if (!edgeMatch) return;
      const [, , targetId] = edgeMatch;
      await removeConnection(supabase, targetId);
      setEdges((eds) => eds.filter((e) => e.id !== edgeId));
      setContextMenu(null);
      toast.success('Connection deleted');
    } catch (error) {
      toast.error('Failed to delete connection');
      console.error('Error deleting edge:', error);
    }
  };

  // Add new group
  const addGroup = async () => {
    try {
      const [newGroup] = await createGroup(supabase, familyTreeId);
      const group: Node = {
        id: newGroup.id,
        type: 'group',
        data: {
          label: `Family Group ${newGroup.id.slice(0, 4)}`,
          position_x: newGroup.position_x,
          position_y: newGroup.position_y
        },
        position: {
          x: newGroup.position_x ?? 100,
          y: newGroup.position_y ?? 100
        },
        style: {
          width: newGroup.width ?? '300px',
          height: newGroup.width ?? '200px',
          backgroundColor: 'rgba(249, 245, 249, 0.8)',
          border: '2px dashed #444',
          zIndex: 1
        },
        className: 'group-node',
        draggable: true,
        selectable: true
      };
      setNodes((nds) => [...nds, group]);
      window.requestAnimationFrame(() => fitView({ padding: 0.2 }));
      toast.success('Group added');
    } catch (error) {
      toast.error('Failed to add group');
      console.error('Error adding group:', error);
    }
  };

  // Reset layout to centered
  const resetLayout = () => {
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight * 0.85
    };
    const groups = nodes
      .filter((node) => node.className === 'group-node')
      .map((node) => ({
        id: node.id,
        family_tree_id: familyTreeId,
        position_x: node.data.position_x,
        position_y: node.data.position_y,
        width: node.style?.width as string,
        height: node.style?.height as string
      }));
    const centeredNodes = centerElements(nodes, groups, viewport);
    setNodes(centeredNodes);
    window.requestAnimationFrame(() => fitView({ padding: 0.2 }));
    toast.success('Layout reset');
  };

  // Recenter viewport to include all nodes and groups
  const recenterView = () => {
    window.requestAnimationFrame(() => fitView({ padding: 0.2 }));
    toast.success('View recentered');
  };

  // Handle node drag (no group reassignment during drag)
  const onNodeDrag = useCallback(() => {
    // Intentionally empty to prevent group reassignment during drag
  }, []);

  // Persist node position and handle group reassignment after drag
  const onNodeDragStop = useCallback(
    async (_: React.MouseEvent, node: Node) => {
      if (resizing) return;

      try {
        if (node.className === 'group-node') {
          await supabase
            .from('group')
            .update({
              position_x: node.position.x,
              position_y: node.position.y
            })
            .eq('id', node.id);
        } else {
          if (node.parentNode) {
            // Node is in a group, update its relative position
            await supabase
              .from('tree_member')
              .update({
                position_x: node.position.x,
                position_y: node.position.y
              })
              .eq('id', node.id);
          } else {
            // Node is not in a group, check for new group assignment
            const absolutePos = { x: node.position.x, y: node.position.y };
            const group = nodes.find(
              (n) =>
                n.id !== node.id &&
                n.className === 'group-node' &&
                n.style &&
                typeof n.style.width === 'string' &&
                typeof n.style.height === 'string' &&
                absolutePos.x >= n.position.x &&
                absolutePos.x <= n.position.x + parseFloat(n.style.width) &&
                absolutePos.y >= n.position.y &&
                absolutePos.y <= n.position.y + parseFloat(n.style.height)
            );

            if (group) {
              const relativeX = absolutePos.x - group.position.x;
              const relativeY = absolutePos.y - group.position.y;

              await supabase
                .from('tree_member')
                .update({
                  group_id: group.id,
                  position_x: relativeX,
                  position_y: relativeY
                })
                .eq('id', node.id);

              setNodes((nds) =>
                nds.map((n) =>
                  n.id === node.id
                    ? {
                        ...n,
                        parentNode: group.id,
                        extent: 'parent' as const,
                        position: { x: relativeX, y: relativeY }
                      }
                    : n
                )
              );
              toast.success('Member added to group');
            } else {
              // Node remains outside any group, update absolute position
              await supabase
                .from('tree_member')
                .update({
                  position_x: absolutePos.x,
                  position_y: absolutePos.y
                })
                .eq('id', node.id);
            }
          }
        }

        setNodes((nds) =>
          nds.map((n) => (n.id === node.id ? { ...n, selected: false } : n))
        );
        toast.success('Position updated');
      } catch (error) {
        toast.error('Failed to update position');
        console.error('Error persisting node position:', error);
      }
    },
    [resizing, setNodes, supabase, nodes]
  );

  const handleClickAway = () => setContextMenu(null);

  // Handle group resizing
  const handleMouseDown = (
    e: React.MouseEvent,
    nodeId: string,
    handle: 'top' | 'bottom' | 'left' | 'right'
  ) => {
    e.stopPropagation();
    setResizing({ nodeId, handle });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!resizing) return;
      const { nodeId, handle } = resizing;
      const node = nodes.find((n) => n.id === nodeId);
      if (
        !node ||
        !node.style ||
        typeof node.style.width !== 'string' ||
        typeof node.style.height !== 'string'
      )
        return;

      const rect = (e.target as HTMLElement)
        .closest('.react-flow__pane')
        ?.getBoundingClientRect();
      if (!rect) return;

      const currentWidth = parseFloat(node.style.width);
      const currentHeight = parseFloat(node.style.height);
      const currentX = node.position.x;
      const currentY = node.position.y;

      let newWidth = currentWidth;
      let newHeight = currentHeight;
      let newX = currentX;
      let newY = currentY;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      switch (handle) {
        case 'top':
          newHeight = Math.max(100, currentY + currentHeight - mouseY);
          newY = mouseY;
          break;
        case 'bottom':
          newHeight = Math.max(100, mouseY - currentY);
          break;
        case 'left':
          newWidth = Math.max(100, currentX + currentWidth - mouseX);
          newX = mouseX;
          break;
        case 'right':
          newWidth = Math.max(100, mouseX - currentX);
          break;
      }

      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? {
                ...n,
                position: { x: newX, y: newY },
                style: {
                  ...n.style,
                  width: `${newWidth}px`,
                  height: `${newHeight}px`
                }
              }
            : n
        )
      );
    },
    [resizing, nodes, setNodes]
  );

  const handleMouseUp = useCallback(async () => {
    if (!resizing) return;
    const { nodeId } = resizing;
    const node = nodes.find((n) => n.id === nodeId);
    if (node && node.className === 'group-node') {
      try {
        await supabase
          .from('group')
          .update({
            position_x: node.position.x,
            position_y: node.position.y,
            width: node.style?.width,
            height: node.style?.height
          })
          .eq('id', nodeId);
        setNodes((nds) =>
          nds.map((n) => (n.id === nodeId ? { ...n, selected: false } : n))
        );
        toast.success('Group resized');
      } catch (error) {
        toast.error('Failed to resize group');
        console.error('Error persisting group dimensions:', error);
      }
    }
    setResizing(null);
  }, [resizing, nodes, setNodes, supabase]);

  useEffect(() => {
    if (resizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing, handleMouseMove, handleMouseUp]);

  if (isLoading) {
    return <div className="p-4 text-center">Loading family tree...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-600">Error: {error}</div>;
  }

  return (
    <>
      <div className="layout-controls">
        <button type="button" onClick={addGroup}>
          Add Family Group
        </button>
        <button type="button" onClick={resetLayout}>
          Reset Layout
        </button>
        <button type="button" onClick={recenterView}>
          Recenter View
        </button>
        <div className="divider" />
      </div>
      <div
        style={{ width: '100vw', height: '85vh' } as React.CSSProperties}
        onClick={handleClickAway}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDrag={onNodeDrag}
          onNodeDragStop={onNodeDragStop}
          onConnect={onConnect}
          onNodeContextMenu={onNodeContextMenu}
          onEdgeContextMenu={onEdgeContextMenu}
          fitView
          fitViewOptions={{ padding: 0.2 }}>
          <MiniMap />
          <Controls />
          <Background variant={BackgroundVariant.Dots} />
        </ReactFlow>
        {nodes
          .filter((node) => node.className === 'group-node')
          .map((node) => (
            <div
              key={node.id}
              style={
                {
                  position: 'absolute',
                  left: node.position.x,
                  top: node.position.y,
                  width:
                    typeof node.style?.width === 'string'
                      ? node.style.width
                      : '300px',
                  height:
                    typeof node.style?.height === 'string'
                      ? node.style.height
                      : '200px',
                  pointerEvents: 'none',
                  zIndex: 50
                } as React.CSSProperties
              }>
              {(['top', 'bottom', 'left', 'right'] as const).map((handle) => (
                <div
                  key={handle}
                  className={`resize-edge ${handle}`}
                  onMouseDown={(e) => handleMouseDown(e, node.id, handle)}
                />
              ))}
            </div>
          ))}
        {contextMenu && (
          <div
            className="context-menu"
            style={
              {
                position: 'fixed',
                top: contextMenu.position.y,
                left: contextMenu.position.x,
                zIndex: 1000
              } as React.CSSProperties
            }>
            <div className="title">
              {contextMenu.type === 'node'
                ? 'Member/Group Options'
                : 'Connection Options'}
            </div>
            <button
              type="button"
              onClick={() =>
                contextMenu.type === 'node'
                  ? handleNodeAction('delete', contextMenu.id)
                  : handleEdgeAction(contextMenu.id)
              }>
              Delete{' '}
              {contextMenu.type === 'node'
                ? nodes.find((n) => n.id === contextMenu.id)?.className ===
                  'group-node'
                  ? 'Group'
                  : 'Member'
                : 'Connection'}
            </button>
            {contextMenu.type === 'node' &&
              nodes.find((n) => n.id === contextMenu.id)?.parentNode && (
                <button
                  type="button"
                  onClick={() => handleNodeAction('detach', contextMenu.id)}>
                  Detach from Group
                </button>
              )}
          </div>
        )}
      </div>
    </>
  );
};

export default function FamilyTreeFlowWrapper(props: FamilyTreeFlowProps) {
  return (
    <ReactFlowProvider>
      <FamilyTreeFlow {...props} />
    </ReactFlowProvider>
  );
}
