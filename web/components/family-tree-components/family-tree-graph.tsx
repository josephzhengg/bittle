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
  Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import { v4 as uuidv4 } from 'uuid';
import dagre from 'dagre';
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

interface ContextMenuData {
  id: string;
  type: 'node' | 'edge';
  position: { x: number; y: number };
}

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 172;
const nodeHeight = 36;

const getLayoutedElements = (
  nodes: Node[],
  edges: Edge[],
  direction: 'TB' | 'LR' | 'BT' | 'RL' = 'TB'
): Node[] => {
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction });

  const regularNodes = nodes.filter((node) => node.className !== 'group-node');
  const groupNodes = nodes.filter((node) => node.className === 'group-node');
  const freeNodes = regularNodes.filter((node) => !node.parentNode);
  const groupedNodes = regularNodes.filter((node) => node.parentNode);

  freeNodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    const sourceIsFree = freeNodes.some((n) => n.id === edge.source);
    const targetIsFree = freeNodes.some((n) => n.id === edge.target);
    if (sourceIsFree && targetIsFree) {
      dagreGraph.setEdge(edge.source, edge.target);
    }
  });

  dagre.layout(dagreGraph);

  const layoutedFreeNodes = freeNodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2
      }
    };
  });

  freeNodes.forEach((node) => dagreGraph.removeNode(node.id));

  return [...layoutedFreeNodes, ...groupedNodes, ...groupNodes];
};

interface FamilyTreeFlowProps {
  familyTreeId: string;
}

const FamilyTreeFlow: React.FC<FamilyTreeFlowProps> = ({ familyTreeId }) => {
  const supabase = useSupabase();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node[]>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([]);
  const [contextMenu, setContextMenu] = useState<ContextMenuData | null>(null);
  const [resizing, setResizing] = useState<{
    nodeId: string;
    handle: 'top' | 'bottom' | 'left' | 'right';
  } | null>(null);
  const { fitView } = useReactFlow();

  useEffect(() => {
    const loadFamilyTree = async () => {
      try {
        const familyTree: z.infer<typeof FamilyTree> = await getFamilyTreeById(
          supabase,
          familyTreeId
        );
        const members: z.infer<typeof TreeMember>[] =
          await getFamilyTreeMembers(supabase, familyTreeId);

        const initialNodes: Node[] = members.map((member) => ({
          id: member.id,
          data: { label: member.identifier },
          type: 'default',
          position: { x: Math.random() * 300, y: Math.random() * 300 },
          zIndex: 10,
          draggable: true,
          selectable: true,
          parentNode: member.group_id ?? undefined,
          extent: member.group_id ? ('parent' as const) : undefined
        }));

        const groupNodes: Node[] = [];
        const uniqueGroupIds = [
          ...new Set(
            members
              .map((m) => m.group_id)
              .filter((id): id is string => id !== null)
          )
        ];
        for (const groupId of uniqueGroupIds) {
          groupNodes.push({
            id: groupId,
            type: 'group',
            data: { label: `Family Group ${groupId.slice(0, 4)}` },
            position: { x: 100, y: 100 },
            style: {
              width: '300px',
              height: '200px',
              backgroundColor: 'rgba(249, 245, 249, 0.8)',
              border: '2px dashed #444'
            },
            className: 'group-node',
            zIndex: 1,
            selectable: true,
            draggable: true
          });
        }

        const initialEdges: Edge[] = members
          .filter(
            (member): member is { id: string; big: string } =>
              member.big !== null
          )
          .map((member) => ({
            id: `e${member.big}-${member.id}`,
            source: member.big,
            target: member.id,
            zIndex: 5
          }));

        setNodes([...initialNodes, ...groupNodes]);
        setEdges(initialEdges);
      } catch (error) {
        console.error('Error loading family tree:', error);
      }
    };

    void loadFamilyTree();
  }, [familyTreeId, supabase, setNodes, setEdges]);

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
              zIndex: 5
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

  const onLayout = useCallback(
    (direction: 'TB' | 'LR' | 'BT' | 'RL') => {
      const layoutedNodes = getLayoutedElements(nodes, edges, direction);
      setNodes(layoutedNodes);
      window.requestAnimationFrame(() => {
        fitView();
      });
    },
    [nodes, edges, setNodes, fitView]
  );

  const addGroup = async () => {
    try {
      const [newGroup]: z.infer<typeof Group>[] = await createGroup(
        supabase,
        familyTreeId
      );
      const id = newGroup.id;
      const group: Node = {
        id,
        type: 'group',
        data: { label: `Family Group ${id.slice(0, 4)}` },
        position: { x: 100, y: 100 },
        style: {
          width: '300px',
          height: '200px',
          backgroundColor: 'rgba(249, 245, 249, 0.8)',
          border: '2px dashed #444'
        },
        className: 'group-node',
        zIndex: 1,
        selectable: true,
        draggable: true
      };
      setNodes((nds) => [...nds, group]);
    } catch (error) {
      console.error('Error adding group:', error);
    }
  };

  const deleteItem = async () => {
    if (!contextMenu) return;

    const { id, type } = contextMenu;
    try {
      if (type === 'node') {
        const node = nodes.find((n) => n.id === id);
        if (!node) return;
        const isGroup = node.className === 'group-node';
        if (isGroup) {
          const { error } = await supabase.from('group').delete().eq('id', id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('tree_member')
            .delete()
            .eq('id', id);
          if (error) throw error;
        }
        setNodes((nds) => nds.filter((n) => n.id !== id));
        setEdges((eds) =>
          eds.filter((e) => e.source !== id && e.target !== id)
        );
      } else {
        const edgeMatch = contextMenu.id.match(/e(.+)-(.+)/);
        if (!edgeMatch) return;
        const [, , targetId] = edgeMatch;
        await removeConnection(supabase, targetId);
        setEdges((eds) => eds.filter((e) => e.id !== id));
      }
      setContextMenu(null);
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const detachNode = async () => {
    if (!contextMenu) return;

    try {
      const { error } = await supabase
        .from('tree_member')
        .update({ group_id: null })
        .eq('id', contextMenu.id);
      if (error) throw error;
      setNodes((nds) =>
        nds.map((n) =>
          n.id === contextMenu.id
            ? { ...n, parentNode: undefined, extent: undefined }
            : n
        )
      );
      setContextMenu(null);
    } catch (error) {
      console.error('Error detaching node:', error);
    }
  };

  const onNodeDrag = async (_: React.MouseEvent, node: Node) => {
    if (node.className === 'group-node') return;

    const group = nodes.find(
      (n) =>
        n.id !== node.id &&
        !node.parentNode &&
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
        const { error } = await supabase
          .from('tree_member')
          .update({ group_id: group.id })
          .eq('id', node.id);
        if (error) throw error;
        setNodes((nds) =>
          nds.map((n) =>
            n.id === node.id
              ? {
                  ...n,
                  parentNode: group.id,
                  extent: 'parent' as const,
                  position: {
                    x: node.position.x - group.position.x,
                    y: node.position.y - group.position.y
                  }
                }
              : n
          )
        );
      } catch (error) {
        console.error('Error updating group membership:', error);
      }
    }
  };

  const onNodeDragStop = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (node.className === 'group-node' && !resizing) {
        setNodes((nds) =>
          nds.map((n) => (n.id === node.id ? { ...n, selected: false } : n))
        );
      }

      if (node.className !== 'group-node') {
        void onNodeDrag(event, node);
      }
    },
    [nodes, onNodeDrag, resizing]
  );

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      setContextMenu({
        id: node.id,
        type: 'node',
        position: { x: event.clientX, y: event.clientY }
      });
    },
    []
  );

  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault();
      setContextMenu({
        id: edge.id,
        type: 'edge',
        position: { x: event.clientX, y: event.clientY }
      });
    },
    []
  );

  const handleClickAway = () => {
    if (contextMenu) setContextMenu(null);
  };

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

  const handleMouseUp = useCallback(() => {
    if (resizing) {
      const { nodeId } = resizing;
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId && n.className === 'group-node'
            ? { ...n, selected: false }
            : n
        )
      );
    }
    setResizing(null);
  }, [resizing, setNodes]);

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

  return (
    <>
      <style>{`
        .group-node {
          pointer-events: all;
        }
        .group-node .react-flow__node-default {
          pointer-events: all;
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
        .group-node .react-flow__node-default {
          background: transparent;
          border: none;
          font-size: 12px;
          color: #666;
        }
        .resize-edge {
          position: absolute;
          background: transparent;
          opacity: 0;
          transition: opacity 0.2s;
          pointer-events: all;
          z-index: 100;
        }
        .resize-edge:hover {
          background: rgba(25, 118, 210, 0.3);
          opacity: 1;
        }
        .group-node:hover .resize-edge,
        .group-node.selected .resize-edge {
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
      `}</style>

      <div style={{ padding: 10 }} className="layout-controls">
        <button type="button" onClick={addGroup}>
          Add Family Group
        </button>
        <div
          style={{
            width: '1px',
            height: '30px',
            background: '#ddd',
            margin: '0 5px'
          }}
        />
        <span style={{ fontWeight: 'bold', color: '#666' }}>Auto Layout:</span>
        <button type="button" onClick={() => onLayout('TB')}>
          Vertical Layout
        </button>
        <button type="button" onClick={() => onLayout('LR')}>
          Horizontal Layout
        </button>
        <button type="button" onClick={() => onLayout('BT')}>
          Bottom to Top
        </button>
        <button type="button" onClick={() => onLayout('RL')}>
          Right to Left
        </button>
      </div>

      <div style={{ width: '100vw', height: '85vh' }} onClick={handleClickAway}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
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
              style={{
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
              }}>
              <div
                className="resize-edge top"
                onMouseDown={(e) => handleMouseDown(e, node.id, 'top')}
              />
              <div
                className="resize-edge bottom"
                onMouseDown={(e) => handleMouseDown(e, node.id, 'bottom')}
              />
              <div
                className="resize-edge left"
                onMouseDown={(e) => handleMouseDown(e, node.id, 'left')}
              />
              <div
                className="resize-edge right"
                onMouseDown={(e) => handleMouseDown(e, node.id, 'right')}
              />
            </div>
          ))}

        {contextMenu && (
          <div
            style={{
              position: 'fixed',
              top: contextMenu.position.y,
              left: contextMenu.position.x,
              background: 'white',
              border: '1px solid #ccc',
              padding: '6px 10px',
              zIndex: 1000,
              boxShadow: '0 2px 5px rgba(0,0,0,0.15)'
            }}>
            <div style={{ marginBottom: 5, fontWeight: 'bold' }}>
              {contextMenu.type === 'node'
                ? 'Member/Group Options'
                : 'Connection Options'}
            </div>
            <button type="button" onClick={deleteItem}>
              Delete
            </button>
            {contextMenu.type === 'node' &&
              nodes.find((n) => n.id === contextMenu.id)?.parentNode && (
                <button type="button" onClick={detachNode}>
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
