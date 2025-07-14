import React, { useCallback, useState, useEffect, useRef } from 'react';
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
  OnConnect,
  useReactFlow,
  NodeMouseHandler,
  EdgeMouseHandler,
  NodeResizeParams
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
  groups: z.infer<typeof Group>[],
  containerWidth: number,
  containerHeight: number
): { x: number; y: number } => {
  const defaultPos = { x: 0, y: 0 };
  if (!member.position_x || !member.position_y) return defaultPos;

  if (!member.group_id) {
    return {
      x: member.position_x,
      y: Math.min(member.position_y, containerHeight - NODE_HEIGHT - 100)
    };
  }

  const group = groups.find((g) => g.id === member.group_id);
  if (!group) return defaultPos;

  const groupWidth = parseFloat(group.width || '300px');
  const groupHeight = parseFloat(group.height || '200px');
  return {
    x: Math.max(0, Math.min(member.position_x, groupWidth - NODE_WIDTH)),
    y: Math.max(0, Math.min(member.position_y, groupHeight - NODE_HEIGHT))
  };
};

// Utility to find an empty space for a node
const findEmptySpace = (
  nodes: Node[],
  targetNode: Node,
  parentGroup: Node,
  nodeWidth: number,
  nodeHeight: number,
  containerWidth: number,
  containerHeight: number
): { x: number; y: number } => {
  const parentWidth =
    parentGroup.style && typeof parentGroup.style.width === 'string'
      ? parseFloat(parentGroup.style.width)
      : GROUP_WIDTH;
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

  y = Math.min(y, containerHeight - nodeHeight - 100);
  return { x, y };
};

// Utility to center nodes and groups
const centerElements = (
  nodes: Node[],
  groups: z.infer<typeof Group>[],
  containerWidth: number,
  containerHeight: number
): Node[] => {
  const groupNodes = nodes.filter((node) => node.className === 'group-node');
  const regularNodes = nodes.filter((node) => node.className !== 'group-node');
  const nodesWithoutPosition = regularNodes.filter(
    (node) => !node.data.position_x || !node.data.position_y
  );
  const groupsWithoutPosition = groupNodes.filter(
    (node) => !node.data.position_x || !node.data.position_y
  );

  const maxPerRow = 5;
  const totalElements =
    nodesWithoutPosition.length + groupsWithoutPosition.length;
  const totalRows = Math.ceil(totalElements / maxPerRow);

  let currentIndex = 0;

  const centeredNodesWithoutPosition = nodesWithoutPosition.map((node) => {
    const col = currentIndex % maxPerRow;
    const row = Math.floor(currentIndex / maxPerRow);
    const newX = col * (NODE_WIDTH + PADDING);
    const newY = Math.min(
      row * (NODE_HEIGHT + PADDING),
      containerHeight - NODE_HEIGHT - 100
    );
    currentIndex++;
    return {
      ...node,
      position: { x: newX, y: newY },
      data: {
        ...node.data,
        position_x: newX,
        position_y: newY
      }
    };
  });

  const centeredGroupsWithoutPosition = groupsWithoutPosition.map((node) => {
    const col = currentIndex % maxPerRow;
    const row = Math.floor(currentIndex / maxPerRow);
    const newX = col * (GROUP_WIDTH + PADDING);
    const newY = Math.min(
      row * (GROUP_HEIGHT + PADDING),
      containerHeight - GROUP_HEIGHT - 100
    );
    currentIndex++;
    return {
      ...node,
      position: { x: newX, y: newY },
      data: {
        ...node.data,
        position_x: newX,
        position_y: newY
      }
    };
  });

  const nodesWithPosition = regularNodes
    .filter((node) => node.data.position_x && node.data.position_y)
    .map((node) => ({
      ...node,
      position: {
        x: node.position.x,
        y: Math.min(node.position.y, containerHeight - NODE_HEIGHT - 100)
      },
      data: {
        ...node.data,
        position_x: node.position.x,
        position_y: Math.min(
          node.position.y,
          containerHeight - NODE_HEIGHT - 100
        )
      }
    }));

  const groupsWithPosition = groupNodes
    .filter((node) => node.data.position_x && node.data.position_y)
    .map((node) => ({
      ...node,
      position: {
        x: node.position.x,
        y: Math.min(node.position.y, containerHeight - GROUP_HEIGHT - 100)
      },
      data: {
        ...node.data,
        position_x: node.position.x,
        position_y: Math.min(
          node.position.y,
          containerHeight - GROUP_HEIGHT - 100
        )
      }
    }));

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
  }) => void,
  getContainerSize: () => { width: number; height: number }
) => {
  const supabase = useSupabase();
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

      const { width: containerWidth, height: containerHeight } =
        getContainerSize();

      const initialNodes: Node[] = members.map((member) => ({
        id: member.id,
        type: 'default',
        data: {
          label: member.identifier,
          position_x: member.position_x,
          position_y: member.position_y
        },
        position: getNodePosition(
          member,
          groups,
          containerWidth,
          containerHeight
        ),
        draggable: true,
        selectable: true,
        parentNode: member.group_id ?? undefined,
        extent: member.group_id ? ('parent' as const) : undefined,
        style: { zIndex: 20 }
      }));

      const groupNodes: Node[] = groups.map((group) => {
        const width = parseFloat(group.width || '300px');
        const height = parseFloat(group.height || '200px');
        const posX = group.position_x ?? 0;
        const posY = group.position_y ?? 0;
        const constrainedY = Math.min(posY, containerHeight - height - 100);
        return {
          id: group.id,
          type: 'group',
          data: {
            label: `Family Group ${group.id.slice(0, 4)}`,
            position_x: posX,
            position_y: constrainedY
          },
          position: { x: posX, y: constrainedY },
          style: {
            width: `${width}px`,
            height: `${height}px`,
            backgroundColor: 'rgba(249, 245, 249, 0.8)',
            border: '2px dashed #444',
            zIndex: 1
          },
          className: 'group-node',
          draggable: true,
          resizable: true,
          selectable: true
        };
      });

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
      const centeredNodes = centerElements(
        allNodes,
        groups,
        containerWidth,
        containerHeight
      );

      setNodes(centeredNodes);
      setEdges(initialEdges);
      window.requestAnimationFrame(() => fitView({ padding: 0.4, maxZoom: 1 }));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
      toast.error('Failed to load family tree');
    } finally {
      setIsLoading(false);
    }
  }, [familyTreeId, supabase, setNodes, setEdges, fitView, getContainerSize]);

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
  const { fitView } = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);

  const getContainerSize = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    }
    return { width: window.innerWidth, height: window.innerHeight };
  }, []);

  const { loadFamilyTree, isLoading, error } = useFamilyTreeData(
    familyTreeId,
    setNodes,
    setEdges,
    fitView,
    getContainerSize
  );

  useEffect(() => {
    void loadFamilyTree();
  }, [loadFamilyTree]);

  const onNodeClick: NodeMouseHandler = useCallback(
    (event, node) => {
      event.stopPropagation();
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          selected: n.id === node.id
        }))
      );
      setContextMenu(null);
    },
    [setNodes]
  );

  const onPaneClick = useCallback(() => {
    setNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
    setContextMenu(null);
  }, [setNodes]);

  const onNodeContextMenu: NodeMouseHandler = useCallback(
    (event, node) => {
      event.preventDefault();
      event.stopPropagation();
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          selected: n.id === node.id
        }))
      );
      setContextMenu({
        id: node.id,
        type: 'node',
        position: { x: event.clientX, y: event.clientY }
      });
    },
    [setNodes]
  );

  const onEdgeContextMenu: EdgeMouseHandler = useCallback((event, edge) => {
    event.preventDefault();
    setContextMenu({
      id: edge.id,
      type: 'edge',
      position: { x: event.clientX, y: event.clientY }
    });
  }, []);

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

        const { width: containerWidth, height: containerHeight } =
          getContainerSize();
        const { x, y } = findEmptySpace(
          nodes,
          node,
          parentGroup,
          NODE_WIDTH,
          NODE_HEIGHT,
          containerWidth,
          containerHeight
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

  const addGroup = async () => {
    try {
      const [newGroup] = await createGroup(supabase, familyTreeId);
      const { width: containerWidth, height: containerHeight } =
        getContainerSize();
      const width = parseFloat(newGroup.width || '300px');
      const height = parseFloat(newGroup.height || '200px');
      const newX = 0;
      const newY = Math.min(0, containerHeight - height - 100);
      const group: Node = {
        id: newGroup.id,
        type: 'group',
        data: {
          label: `Family Group ${newGroup.id.slice(0, 4)}`,
          position_x: newX,
          position_y: newY
        },
        position: { x: newX, y: newY },
        style: {
          width: `${width}px`,
          height: `${height}px`,
          backgroundColor: 'rgba(249, 245, 249, 0.8)',
          border: '2px dashed #444',
          zIndex: 1
        },
        className: 'group-node',
        draggable: true,
        resizable: true,
        selectable: true
      };
      setNodes((nds) => [...nds, group]);
      window.requestAnimationFrame(() => fitView({ padding: 0.4, maxZoom: 1 }));
      toast.success('Group added');
    } catch (error) {
      toast.error('Failed to add group');
      console.error('Error adding group:', error);
    }
  };

  const resetLayout = () => {
    const { width: containerWidth, height: containerHeight } =
      getContainerSize();
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
    const centeredNodes = centerElements(
      nodes,
      groups,
      containerWidth,
      containerHeight
    );
    setNodes(centeredNodes);
    window.requestAnimationFrame(() => fitView({ padding: 0.4, maxZoom: 1 }));
    toast.success('Layout reset');
  };

  const recenterView = () => {
    window.requestAnimationFrame(() => fitView({ padding: 0.4, maxZoom: 1 }));
    toast.success('View recentered');
  };

  const onNodeDrag = useCallback((event: React.MouseEvent, node: Node) => {
    console.log(
      `Dragging node ${node.id}: positionAbsolute=${JSON.stringify(
        node.positionAbsolute
      )}`
    );
  }, []);

  const onNodeDragStop = useCallback(
    async (event: React.MouseEvent, node: Node) => {
      console.log(
        `Drag stopped for node ${node.id}: positionAbsolute=${JSON.stringify(
          node.positionAbsolute
        )}`
      );
      const { width: containerWidth, height: containerHeight } =
        getContainerSize();
      try {
        if (node.className === 'group-node') {
          const height =
            parseFloat(node.style?.height as string) || GROUP_HEIGHT;
          const constrainedY = Math.min(
            node.position.y,
            containerHeight - height - 100
          );
          await supabase
            .from('group')
            .update({
              position_x: node.position.x,
              position_y: constrainedY
            })
            .eq('id', node.id);
          setNodes((nds) =>
            nds.map((n) =>
              n.id === node.id
                ? { ...n, position: { x: node.position.x, y: constrainedY } }
                : n
            )
          );
        } else {
          const group = nodes.find(
            (n) =>
              n.id !== node.id &&
              n.className === 'group-node' &&
              n.style &&
              typeof n.style.width === 'string' &&
              typeof n.style.height === 'string' &&
              node.positionAbsolute &&
              node.positionAbsolute.x >= n.position.x &&
              node.positionAbsolute.x <=
                n.position.x + parseFloat(n.style.width) &&
              node.positionAbsolute.y >= n.position.y &&
              node.positionAbsolute.y <=
                n.position.y + parseFloat(n.style.height)
          );

          if (group && !node.parentNode) {
            // Outside to Inside Group
            const relativeX = node.positionAbsolute!.x - group.position.x;
            const relativeY = node.positionAbsolute!.y - group.position.y;
            const parentWidth =
              parseFloat(group.style!.width as string) || GROUP_WIDTH;
            const parentHeight =
              parseFloat(group.style!.height as string) || GROUP_HEIGHT;
            const constrainedX = Math.max(
              0,
              Math.min(relativeX, parentWidth - NODE_WIDTH)
            );
            const constrainedY = Math.max(
              0,
              Math.min(relativeY, parentHeight - NODE_HEIGHT)
            );
            await supabase
              .from('tree_member')
              .update({
                group_id: group.id,
                position_x: constrainedX,
                position_y: constrainedY
              })
              .eq('id', node.id);
            setNodes((nds) =>
              nds.map((n) =>
                n.id === node.id
                  ? {
                      ...n,
                      parentNode: group.id,
                      extent: 'parent' as const,
                      position: { x: constrainedX, y: constrainedY }
                    }
                  : n
              )
            );
            toast.success('Member added to group');
          } else if (!group && node.parentNode) {
            // Inside to Outside Group
            await supabase
              .from('tree_member')
              .update({
                group_id: null,
                position_x: node.positionAbsolute!.x,
                position_y: Math.min(
                  node.positionAbsolute!.y,
                  containerHeight - NODE_HEIGHT - 100
                )
              })
              .eq('id', node.id);
            setNodes((nds) =>
              nds.map((n) =>
                n.id === node.id
                  ? {
                      ...n,
                      parentNode: undefined,
                      extent: undefined,
                      position: {
                        x: node.positionAbsolute!.x,
                        y: Math.min(
                          node.positionAbsolute!.y,
                          containerHeight - NODE_HEIGHT - 100
                        )
                      }
                    }
                  : n
              )
            );
            toast.success('Member removed from group');
          } else if (node.parentNode) {
            // Inside Group (same group)
            const parentGroup = nodes.find((n) => n.id === node.parentNode);
            if (parentGroup) {
              const parentWidth =
                parseFloat(parentGroup.style?.width as string) || GROUP_WIDTH;
              const parentHeight =
                parseFloat(parentGroup.style?.height as string) || GROUP_HEIGHT;
              const relativeX = Math.max(
                0,
                Math.min(node.position.x, parentWidth - NODE_WIDTH)
              );
              const relativeY = Math.max(
                0,
                Math.min(node.position.y, parentHeight - NODE_HEIGHT)
              );
              await supabase
                .from('tree_member')
                .update({
                  position_x: relativeX,
                  position_y: relativeY
                })
                .eq('id', node.id);
              setNodes((nds) =>
                nds.map((n) =>
                  n.id === node.id
                    ? { ...n, position: { x: relativeX, y: relativeY } }
                    : n
                )
              );
            }
          } else {
            // Outside Group (no change in group)
            const constrainedY = Math.min(
              node.positionAbsolute!.y,
              containerHeight - NODE_HEIGHT - 100
            );
            await supabase
              .from('tree_member')
              .update({
                position_x: node.positionAbsolute!.x,
                position_y: constrainedY
              })
              .eq('id', node.id);
            setNodes((nds) =>
              nds.map((n) =>
                n.id === node.id
                  ? {
                      ...n,
                      position: { x: node.positionAbsolute!.x, y: constrainedY }
                    }
                  : n
              )
            );
          }
        }
        toast.success('Position updated');
      } catch (error) {
        toast.error('Failed to update position');
        console.error('Error persisting node position:', error);
      }
    },
    [setNodes, supabase, nodes, getContainerSize]
  );

  const onNodeResize = useCallback(
    (event: React.MouseEvent, params: NodeResizeParams) => {
      const { node } = params;
      console.log(
        `Resizing group ${node.id}: width=${node.width}, height=${node.height}`
      );
      setNodes((nds) =>
        nds.map((n) =>
          n.id === node.id
            ? {
                ...n,
                style: {
                  ...n.style,
                  width: `${node.width}px`,
                  height: `${node.height}px`
                }
              }
            : n
        )
      );
    },
    [setNodes]
  );

  const onNodeResizeEnd = useCallback(
    async (event: React.MouseEvent, params: NodeResizeParams) => {
      const { node } = params;
      console.log(
        `Resize ended for group ${node.id}: width=${node.width}, height=${node.height}`
      );
      try {
        await supabase
          .from('group')
          .update({
            width: `${node.width}px`,
            height: `${node.height}px`
          })
          .eq('id', node.id);
        toast.success('Group resized');
      } catch (error) {
        toast.error('Failed to resize group');
        console.error('Error persisting group dimensions:', error);
      }
    },
    [supabase]
  );

  const handleClickAway = useCallback(() => {
    setContextMenu(null);
  }, []);

  if (isLoading) {
    return (
      <div style={{ padding: '16px', textAlign: 'center' }}>
        Loading family tree...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', color: '#dc2626' }}>
        Error: {error}
      </div>
    );
  }

  const styles = `
    .group-node {
      z-index: 1;
    }
    .group-node .react-flow__node-default {
      pointer-events: auto;
      background: #fff;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 12px;
      color: #333;
      padding: 8px;
      z-index: 20;
    }
    .react-flow__node:not(.group-node) {
      pointer-events: auto;
      cursor: grab;
      z-index: 20;
    }
    .react-flow__node:not(.group-node).selected {
      box-shadow: 0 0 0 2px #1976d2 !important;
      border: 1px solid #1976d2 !important;
    }
    .group-node.selected {
      border: 2px solid #1976d2 !important;
      background-color: rgba(25, 118, 210, 0.1) !important;
    }
    .react-flow__resize-control {
      background: rgba(25, 118, 210, 0.5);
      border: 2px solid #1976d2;
      opacity: 0;
      transition: opacity 0.2s;
      pointer-events: auto;
    }
    .group-node.selected .react-flow__resize-control {
      opacity: 1;
    }
    .react-flow__resize-control.top,
    .react-flow__resize-control.bottom {
      left: 0;
      right: 0;
      height: 12px;
      cursor: ns-resize;
    }
    .react-flow__resize-control.top {
      top: -6px;
    }
    .react-flow__resize-control.bottom {
      bottom: -6px;
    }
    .react-flow__resize-control.left,
    .react-flow__resize-control.right {
      top: 0;
      bottom: 0;
      width: 12px;
      cursor: ew-resize;
    }
    .react-flow__resize-control.left {
      left: -6px;
    }
    .react-flow__resize-control.right {
      right: -6px;
    }
    .layout-controls {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      align-items: center;
      padding: 10px;
      position: absolute;
      top: 0;
      left: 0;
      z-index: 1000;
    }
    .layout-controls button {
      padding: 8px 12px;
      border: 1px solid #ddd;
      background: white;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }
    .layout-controls button:hover {
      background: #f5f5f5;
    }
    .layout-controls .divider {
      width: 1px;
      height: 30px;
      background: #ddd;
      margin: 0 5px;
    }
    .context-menu {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 8px;
      background: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.15);
      position: fixed;
      z-index: 1000;
    }
    .context-menu button {
      padding: 6px 12px;
      border: none;
      background: white;
      text-align: left;
      cursor: pointer;
      font-size: 14px;
      color: #333;
      border-radius: 2px;
    }
    .context-menu button:hover,
    .context-menu button:focus {
      background: #f5f5f5;
      outline: none;
    }
    .context-menu .title {
      font-weight: bold;
      color: #666;
      padding-bottom: 4px;
      border-bottom: 1px solid #eee;
    }
    .react-flow-container {
      width: 100%;
      height: 100%;
      overflow: hidden;
      position: relative;
    }
    .react-flow__pane {
      overflow: visible !important;
    }
    .react-flow__controls {
      position: fixed;
      bottom: 20px;
      left: 20px;
      z-index: 2000;
      background: white;
      border-radius: 4px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      padding: 5px;
    }
    .react-flow__minimap {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 2000;
      background: white;
      border-radius: 4px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      padding: 5px;
    }
  `;

  return (
    <>
      <style>{styles}</style>
      <div
        ref={containerRef}
        className="react-flow-container"
        onClick={handleClickAway}>
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
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDrag={onNodeDrag}
          onNodeDragStop={onNodeDragStop}
          onNodeResize={onNodeResize}
          onNodeResizeEnd={onNodeResizeEnd}
          onConnect={onConnect}
          onNodeContextMenu={onNodeContextMenu}
          onEdgeContextMenu={onEdgeContextMenu}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          fitView
          fitViewOptions={{ padding: 0.4, maxZoom: 1 }}
          minZoom={0.2}
          maxZoom={4}
          translateExtent={[
            [-Infinity, -Infinity],
            [Infinity, Infinity]
          ]}>
          <MiniMap />
          <Controls />
          <Background variant={BackgroundVariant.Dots} />
        </ReactFlow>
        {contextMenu && (
          <div
            className="context-menu"
            style={{
              position: 'fixed',
              top: contextMenu.position.y,
              left: contextMenu.position.x,
              zIndex: 1000
            }}>
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

export default FamilyTreeFlow;
