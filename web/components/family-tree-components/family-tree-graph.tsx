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
import { FamilyTree } from '@/utils/supabase/models/family-tree';
import {
  createGroup,
  createConnection,
  removeConnection,
  getFamilyTreeMembers,
  getFamilyTreeById
} from '@/utils/supabase/queries/family-tree';
import { z } from 'zod';

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

const getNodePosition = (
  member: z.infer<typeof TreeMember>,
  groups: z.infer<typeof Group>[]
): { x: number; y: number } => {
  if (!member.group_id) {
    // Free nodes: use absolute position
    return { x: member.position_x ?? 100, y: member.position_y ?? 100 };
  }

  // Grouped nodes: use relative position within group
  // These positions should be relative to the group's (0,0) corner
  return {
    x: member.position_x ?? 50, // Default to center-ish of group
    y: member.position_y ?? 50
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

// Utility to center nodes and groups while preserving relative positions
const centerElements = (
  nodes: Node[],
  groups: z.infer<typeof Group>[],
  viewport: { width: number; height: number }
): Node[] => {
  const groupNodes = nodes.filter((node) => node.className === 'group-node');
  const regularNodes = nodes.filter((node) => node.className !== 'group-node');
  const freeNodes = regularNodes.filter((node) => !node.parentNode);
  const groupedNodes = regularNodes.filter((node) => node.parentNode);

  // Calculate total width and height for free nodes and groups
  const totalWidth = Math.max(
    (freeNodes.length + groupNodes.length) * (NODE_WIDTH + PADDING),
    viewport.width
  );
  const totalHeight = Math.max(
    Math.ceil((freeNodes.length + groupNodes.length) / 5) *
      (NODE_HEIGHT + PADDING),
    viewport.height
  );

  // Center free nodes in a grid
  const centeredFreeNodes = freeNodes.map((node, index) => ({
    ...node,
    position: {
      x:
        (viewport.width - totalWidth) / 2 +
        (index % 5) * (NODE_WIDTH + PADDING),
      y:
        (viewport.height - totalHeight) / 2 +
        Math.floor(index / 5) * (NODE_HEIGHT + PADDING)
    }
  }));

  // Center group nodes
  const centeredGroupNodes = groupNodes.map((node, index) => {
    const newPosition = {
      x:
        (viewport.width - totalWidth) / 2 +
        (index % 5) * (GROUP_WIDTH + PADDING),
      y:
        (viewport.height - totalHeight) / 2 +
        Math.floor(index / 5) * (GROUP_HEIGHT + PADDING)
    };
    return {
      ...node,
      position: newPosition
    };
  });

  // Maintain grouped nodes' relative positions
  const updatedGroupedNodes = groupedNodes.map((node) => {
    const parent = centeredGroupNodes.find((n) => n.id === node.parentNode);
    if (!parent) return node;
    const member = groups.find((g) => g.id === node.parentNode);
    if (!member) return node;

    // Create a proper TreeMember-like object with all required properties
    const memberData = {
      id: node.id,
      family_tree_id: member.family_tree_id,
      identifier: node.data.label,
      form_submission_id: null, // Required property
      group_id: node.parentNode ?? null, // Keep as null for TreeMember type
      is_big: null, // Required property
      position_x: node.data.position_x || 100,
      position_y: node.data.position_y || 100
    };

    const relativePos = getNodePosition(memberData, groups);
    return {
      ...node,
      position: relativePos
    };
  });

  // Combine all nodes
  return [...centeredFreeNodes, ...updatedGroupedNodes, ...centeredGroupNodes];
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
  const { fitView, getViewport } = useReactFlow();

  // Load family tree data and center elements
  useEffect(() => {
    const loadFamilyTree = async () => {
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

        // Fetch connections
        const { data: connectionsData, error: connectionsError } =
          await supabase
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
          data: { label: `Family Group ${group.id.slice(0, 4)}` },
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
        window.requestAnimationFrame(() => fitView());
      } catch (error) {
        console.error('Error loading family tree:', error);
      }
    };

    void loadFamilyTree();
  }, [familyTreeId, supabase, setNodes, setEdges, fitView, getViewport]);

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
      } catch (error) {
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
      } else if (action === 'detach') {
        const node = nodes.find((n) => n.id === nodeId);
        if (!node || !node.parentNode) return;
        const { x, y } = getAbsolutePosition(node, nodes);

        // Update database with null for group_id
        await supabase
          .from('tree_member')
          .update({ group_id: null, position_x: x, position_y: y })
          .eq('id', nodeId);

        // Update nodes state with undefined for parentNode
        setNodes((nds) =>
          nds.map((n) =>
            n.id === nodeId
              ? {
                  ...n,
                  parentNode: undefined, // Use undefined instead of null
                  extent: undefined,
                  position: { x, y }
                }
              : n
          )
        );
      }
      setContextMenu(null);
    } catch (error) {
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
    } catch (error) {
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
        data: { label: `Family Group ${newGroup.id.slice(0, 4)}` },
        position: {
          x: newGroup.position_x ?? 100,
          y: newGroup.position_y ?? 100
        },
        style: {
          width: newGroup.width ?? '300px',
          height: newGroup.height ?? '200px',
          backgroundColor: 'rgba(249, 245, 249, 0.8)',
          border: '2px dashed #444',
          zIndex: 1
        },
        className: 'group-node',
        draggable: true,
        selectable: true
      };
      setNodes((nds) => [...nds, group]);
      window.requestAnimationFrame(() => fitView());
    } catch (error) {
      console.error('Error adding group:', error);
    }
  };

  // Handle node drag
  const onNodeDrag = useCallback(
    async (_: React.MouseEvent, node: Node) => {
      if (node.className === 'group-node') return;

      // Only check for group collision if node is not already grouped
      if (!node.parentNode) {
        const group = nodes.find(
          (n) =>
            n.id !== node.id &&
            n.className === 'group-node' &&
            n.style &&
            typeof n.style.width === 'string' &&
            typeof n.style.height === 'string' &&
            node.position.x > n.position.x &&
            node.position.x < n.position.x + parseFloat(n.style.width) &&
            node.position.y > n.position.y &&
            node.position.y < n.position.y + parseFloat(n.style.height)
        );

        if (group) {
          try {
            const relativeX = node.position.x - group.position.x;
            const relativeY = node.position.y - group.position.y;

            // Update database with relative position
            await supabase
              .from('tree_member')
              .update({
                group_id: group.id,
                position_x: relativeX,
                position_y: relativeY
              })
              .eq('id', node.id);

            // Update node state
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
          } catch (error) {
            console.error('Error updating group membership:', error);
          }
        }
      }
    },
    [nodes, setNodes, supabase]
  );

  // Persist node position after drag
  const onNodeDragStop = useCallback(
    async (_: React.MouseEvent, node: Node) => {
      if (resizing) return;

      try {
        if (node.className === 'group-node') {
          // Save group position
          await supabase
            .from('group')
            .update({
              position_x: node.position.x,
              position_y: node.position.y
            })
            .eq('id', node.id);
        } else {
          // For regular nodes, save the appropriate position
          if (node.parentNode) {
            // Grouped node: save relative position
            await supabase
              .from('tree_member')
              .update({
                position_x: node.position.x,
                position_y: node.position.y
              })
              .eq('id', node.id);
          } else {
            // Free node: save absolute position
            await supabase
              .from('tree_member')
              .update({
                position_x: node.position.x,
                position_y: node.position.y
              })
              .eq('id', node.id);
          }
        }

        // Clear selection
        setNodes((nds) =>
          nds.map((n) => (n.id === node.id ? { ...n, selected: false } : n))
        );
      } catch (error) {
        console.error('Error persisting node position:', error);
      }
    },
    [nodes, resizing, setNodes, supabase]
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
      } catch (error) {
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

  // Styles
  const styles = `
    .group-node {
      pointer-events: all;
    }
    .group-node .react-flow__node-default {
      pointer-events: all;
      background: transparent;
      border: none;
      font-size: 12px;
      color: #666;
    }
    .react-flow__node:not(.group-node) {
      pointer-events: all;
      cursor: grab;
    }
    .react-flow__node:not(.group-node).selected {
      box-shadow: 0 0 0 2px #1976d2;
    }
    .group-node.selected {
      border: 2px solid #1976d2 !important;
      background-color: rgba(25, 118, 210, 0.1) !important;
    }
    .resize-edge {
      position: absolute;
      background: transparent;
      opacity: 0;
      transition: opacity 0.2s;
      pointer-events: all;
      z-index: 100;
    }
    .resize-edge:hover,
    .group-node:hover .resize-edge,
    .group-node.selected .resize-edge {
      background: rgba(25, 118, 210, 0.3);
      opacity: 1;
    }
    .resize-edge.top,
    .resize-edge.bottom {
      left: 0;
      right: 0;
      height: 8px;
      cursor: ns-resize;
    }
    .resize-edge.top {
      top: -4px;
    }
    .resize-edge.bottom {
      bottom: -4px;
    }
    .resize-edge.left,
    .resize-edge.right {
      top: 0;
      bottom: 0;
      width: 8px;
      cursor: ew-resize;
    }
    .resize-edge.left {
      left: -4px;
    }
    .resize-edge.right {
      right: -4px;
    }
    .layout-controls {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      align-items: center;
      padding: 10px;
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
    .layout-controls span {
      font-weight: bold;
      color: #666;
    }
    .layout-controls .divider {
      width: 1px;
      height: 30px;
      background: #ddd;
      margin: 0 5px;
    }
  `;

  return (
    <>
      <style>{styles}</style>
      <div className="layout-controls">
        <button type="button" onClick={addGroup}>
          Add Family Group
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
          fitView>
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
            style={
              {
                position: 'fixed',
                top: contextMenu.position.y,
                left: contextMenu.position.x,
                background: 'white',
                border: '1px solid #ccc',
                padding: '6px 10px',
                zIndex: 1000,
                boxShadow: '0 2px 5px rgba(0,0,0,0.15)'
              } as React.CSSProperties
            }>
            <div
              style={
                { marginBottom: 5, fontWeight: 'bold' } as React.CSSProperties
              }>
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
              Delete
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
