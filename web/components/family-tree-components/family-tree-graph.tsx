import React, {
  useCallback,
  useState,
  useEffect,
  useRef,
  useMemo
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
  OnConnect,
  useReactFlow,
  NodeMouseHandler,
  EdgeMouseHandler,
  NodeChange,
  NodeTypes
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
  getFamilyTreeById,
  refetchSubmissions
} from '@/utils/supabase/queries/family-tree';
import { z } from 'zod';
import { toast } from 'sonner';
import { debounce } from 'lodash';
import ResizableNode from './resizable-node';

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

// Node Types
const nodeTypes: NodeTypes = {
  group: ResizableNode
};

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

  const groupWidth =
    parseFloat(group.width || `${GROUP_WIDTH}px`) || GROUP_WIDTH;
  const groupHeight =
    parseFloat(group.height || `${GROUP_HEIGHT}px`) || GROUP_HEIGHT;
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
    parentGroup.style && typeof parentGroup.style.width === 'number'
      ? parentGroup.style.width
      : GROUP_WIDTH;
  let x = parentGroup.position.x + parentWidth + PADDING;
  let y = parentGroup.position.y;

  const isOverlapping = (testX: number, testY: number): boolean => {
    return nodes.some((n) => {
      if (n.id === targetNode.id) return false;
      const nWidth =
        n.type === 'group' && n.style && typeof n.style.width === 'number'
          ? n.style.width
          : NODE_WIDTH;
      const nHeight =
        n.type === 'group' && n.style && typeof n.style.height === 'number'
          ? n.style.height
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
  const groupNodes = nodes.filter((node) => node.type === 'group');
  const regularNodes = nodes.filter((node) => node.type !== 'group');
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

// Utility to calculate member positions within a group
const calculateMemberPositions = (
  members: { identifier: string; form_submission_id?: string | null }[],
  groupPosition: { x: number; y: number },
  groupWidth: number,
  groupHeight: number
): { position_x: number; position_y: number }[] => {
  const positions: { position_x: number; position_y: number }[] = [];
  const maxPerRow = Math.floor(groupWidth / (NODE_WIDTH + PADDING));
  const offsetX =
    (groupWidth - maxPerRow * (NODE_WIDTH + PADDING) + PADDING) / 2;
  const offsetY = PADDING;

  members.forEach((_, index) => {
    const row = Math.floor(index / maxPerRow);
    const col = index % maxPerRow;
    const position_x = offsetX + col * (NODE_WIDTH + PADDING);
    const position_y = offsetY + row * (NODE_HEIGHT + PADDING);
    positions.push({
      position_x: Math.min(
        Math.max(position_x, PADDING),
        groupWidth - NODE_WIDTH - PADDING
      ),
      position_y: Math.min(
        Math.max(position_y, PADDING),
        groupHeight - NODE_HEIGHT - PADDING
      )
    });
  });

  return positions;
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

  // Validate familyTreeId
  if (!familyTreeId || typeof familyTreeId !== 'string') {
    console.error('Invalid familyTreeId:', familyTreeId);
    setError('Invalid family tree ID');
    setIsLoading(false);
  }

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
        style: { zIndex: 20, width: NODE_WIDTH, height: NODE_HEIGHT },
        resizable: false
      }));

      const groupNodes: Node[] = groups.map((group) => {
        const width =
          parseFloat(group.width || `${GROUP_WIDTH}px`) || GROUP_WIDTH;
        const height =
          parseFloat(group.height || `${GROUP_HEIGHT}px`) || GROUP_HEIGHT;
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
            width,
            height,
            backgroundColor: 'rgba(243, 244, 246, 0.6)',
            border: '1px solid #d1d5db',
            borderRadius: '2px',
            zIndex: 1,
            boxSizing: 'border-box'
          },
          draggable: true,
          selectable: true,
          resizable: true
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
      window.requestAnimationFrame(() => fitView({ padding: 0.4 }));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
      toast.error('Failed to load family tree');
    } finally {
      setIsLoading(false);
    }
  }, [familyTreeId, supabase, setNodes, setEdges, fitView, getContainerSize]);

  const refetchNewSubmissions = useCallback(async () => {
    if (!familyTreeId || typeof familyTreeId !== 'string') {
      console.error(
        'Invalid familyTreeId in refetchNewSubmissions:',
        familyTreeId
      );
      toast.error('Invalid family tree ID');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      console.log('Refetching submissions for familyTreeId:', familyTreeId);

      // Fetch current tree members
      const members = await getFamilyTreeMembers(supabase, familyTreeId);
      const existingSubmissionIds = new Set(
        members
          .map((m) => m.form_submission_id)
          .filter((id): id is string => !!id)
      );

      // Fetch all form submissions
      const submissions = await refetchSubmissions(supabase, familyTreeId);
      const { data: familyTree, error: familyTreeError } = await supabase
        .from('family_tree')
        .select('form_id, question_id')
        .eq('id', familyTreeId)
        .single();
      if (familyTreeError) {
        throw new Error(
          `Error fetching family tree: ${familyTreeError.message}`
        );
      }

      // Fetch question responses for new submissions
      const newSubmissions = submissions.filter(
        (s) => !existingSubmissionIds.has(s.id)
      );
      if (newSubmissions.length === 0) {
        toast.info('No new submissions found');
        setIsLoading(false);
        return;
      }

      const { data: responseData, error: responseError } = await supabase
        .from('question_response')
        .select('free_text, form_submission_id')
        .eq('form_id', familyTree.form_id)
        .eq('question_id', familyTree.question_id)
        .in(
          'form_submission_id',
          newSubmissions.map((s) => s.id)
        );
      if (responseError) {
        throw new Error(`Error fetching responses: ${responseError.message}`);
      }

      // Fetch groups - FIXED: Include family_tree_id in select
      const { data: groupsData, error: groupsError } = await supabase
        .from('group')
        .select('id, family_tree_id, position_x, position_y, width, height')
        .eq('family_tree_id', familyTreeId);
      if (groupsError) {
        throw new Error(`Error fetching groups: ${groupsError.message}`);
      }
      let groups = groupsData ? Group.array().parse(groupsData) : [];

      // Create a new group if none exist
      let targetGroup = groups[0];
      if (!targetGroup) {
        const newGroups = await createGroup(supabase, familyTreeId);
        targetGroup = newGroups[0];
        groups = [targetGroup];
      }

      // Calculate positions for new members
      const newMembers = responseData.map((response) => ({
        identifier: response.free_text,
        form_submission_id: response.form_submission_id
      }));
      const groupWidth =
        parseFloat(targetGroup.width || `${GROUP_WIDTH}px`) || GROUP_WIDTH;
      const groupHeight =
        parseFloat(targetGroup.height || `${GROUP_HEIGHT}px`) || GROUP_HEIGHT;
      const memberPositions = calculateMemberPositions(
        newMembers,
        { x: targetGroup.position_x ?? 0, y: targetGroup.position_y ?? 0 },
        groupWidth,
        groupHeight
      );

      // Insert new tree members
      const treeMembers = newMembers.map((member, index) => {
        const memberData = {
          family_tree_id: familyTreeId,
          identifier: member.identifier,
          form_submission_id: member.form_submission_id,
          group_id: targetGroup.id,
          is_big: false,
          position_x: memberPositions[index].position_x,
          position_y: memberPositions[index].position_y
        };
        console.log('Creating tree member:', memberData);
        return memberData;
      });

      const { data: newMembersData, error: membersError } = await supabase
        .from('tree_member')
        .insert(treeMembers)
        .select();
      if (membersError) {
        throw new Error(`Error inserting new members: ${membersError.message}`);
      }

      const parsedNewMembers = TreeMember.array().parse(newMembersData);
      const { width: containerWidth, height: containerHeight } =
        getContainerSize();

      // Create new nodes
      const newNodes: Node[] = parsedNewMembers.map((member) => ({
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
        parentNode: member.group_id,
        extent: 'parent' as const,
        style: { zIndex: 20, width: NODE_WIDTH, height: NODE_HEIGHT },
        resizable: false
      }));

      // If a new group was created, add it as a node
      const newGroupNodes: Node[] =
        targetGroup !== groups[0]
          ? [
              {
                id: targetGroup.id,
                type: 'group',
                data: {
                  label: `Family Group ${targetGroup.id.slice(0, 4)}`,
                  position_x: targetGroup.position_x ?? 0,
                  position_y: targetGroup.position_y ?? 0
                },
                position: {
                  x: targetGroup.position_x ?? 0,
                  y: targetGroup.position_y ?? 0
                },
                style: {
                  width: groupWidth,
                  height: groupHeight,
                  backgroundColor: 'rgba(243, 244, 246, 0.6)',
                  border: '1px solid #d1d5db',
                  borderRadius: '2px',
                  zIndex: 1,
                  boxSizing: 'border-box'
                },
                draggable: true,
                selectable: true,
                resizable: true
              }
            ]
          : [];

      // Update nodes
      setNodes((nds) => [...nds, ...newNodes, ...newGroupNodes]);
      window.requestAnimationFrame(() => fitView({ padding: 0.4 }));
      toast.success(`Added ${newMembers.length} new members`);
    } catch (error) {
      console.error('Error in refetchNewSubmissions:', error);
      toast.error('Failed to refetch submissions');
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
  const [nodes, setNodes, onNodesChange] = useNodesState<Node[]>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([]);
  const [contextMenu, setContextMenu] = useState<ContextMenuData | null>(null);
  const { fitView } = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);

  // Debug familyTreeId
  useEffect(() => {
    console.log('FamilyTreeFlow mounted with familyTreeId:', familyTreeId);
  }, [familyTreeId]);

  // Memoize nodeTypes
  const memoizedNodeTypes = useMemo(() => nodeTypes, []);

  // Debug node properties
  useEffect(() => {
    console.log(
      'Nodes:',
      nodes.map((n) => ({
        id: n.id,
        type: n.type,
        resizable: n.resizable,
        style: n.style
      }))
    );
  }, [nodes]);

  // Global click listener for debugging
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const classes = target.classList ? Array.from(target.classList) : [];
      let isResizeHandle = false;
      let parentNodeId: string | null = null;
      let closestNode: HTMLElement | null = target;
      while (closestNode) {
        if (closestNode.classList?.contains('react-flow__resize-control')) {
          isResizeHandle = true;
          const parentNode = closestNode.closest('.react-flow__node-group');
          parentNodeId = parentNode?.getAttribute('data-id') || null;
          break;
        }
        closestNode = closestNode.parentElement;
      }
      console.log('Click detected:', {
        isResizeHandle,
        parentNodeId,
        targetClasses: classes,
        targetTag: target.tagName,
        clientX: event.clientX,
        clientY: event.clientY,
        closestNodeClasses: closestNode?.classList
          ? Array.from(closestNode.classList)
          : []
      });
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const getContainerSize = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
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
    if (!familyTreeId || typeof familyTreeId !== 'string') {
      console.error('Invalid familyTreeId on mount:', familyTreeId);
      toast.error('Invalid family tree ID');
      return;
    }
    void loadFamilyTree();
  }, [loadFamilyTree, familyTreeId]);

  const onNodeClick: NodeMouseHandler = useCallback(
    (event, node) => {
      const target = event.target as HTMLElement;
      let isResizeHandle = false;
      const classes = target.classList ? Array.from(target.classList) : [];
      let closestNode: HTMLElement | null = target;
      while (closestNode) {
        if (closestNode.classList?.contains('react-flow__resize-control')) {
          isResizeHandle = true;
          break;
        }
        closestNode = closestNode.parentElement;
      }
      console.log(`Node click on ${node.id}:`, {
        isResizeHandle,
        targetClasses: classes,
        targetTag: target.tagName,
        nodeType: node.type,
        resizable: node.resizable
      });
      if (isResizeHandle) {
        event.stopPropagation();
        return;
      }

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
      const target = event.target as HTMLElement;
      let isResizeHandle = false;
      const classes = target.classList ? Array.from(target.classList) : [];
      let closestNode: HTMLElement | null = target;
      while (closestNode) {
        if (closestNode.classList?.contains('react-flow__resize-control')) {
          isResizeHandle = true;
          break;
        }
        closestNode = closestNode.parentElement;
      }
      console.log(`Context menu on node ${node.id}:`, {
        isResizeHandle,
        targetClasses: classes,
        targetTag: target.tagName,
        nodeType: node.type,
        resizable: node.resizable
      });
      if (isResizeHandle) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

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
        const isGroup = node.type === 'group';
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
      const width =
        parseFloat(newGroup.width || `${GROUP_WIDTH}px`) || GROUP_WIDTH;
      const height =
        parseFloat(newGroup.height || `${GROUP_HEIGHT}px`) || GROUP_HEIGHT;
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
          width,
          height,
          backgroundColor: 'rgba(243, 244, 246, 0.6)',
          border: '1px solid #d1d5db',
          borderRadius: '2px',
          zIndex: 1,
          boxSizing: 'border-box'
        },
        draggable: true,
        selectable: true,
        resizable: true
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
      .filter((node) => node.type === 'group')
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
        if (node.type === 'group') {
          const height = (node.style?.height as number) || GROUP_HEIGHT;
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
              n.type === 'group' &&
              n.style &&
              typeof n.style.width === 'number' &&
              typeof n.style.height === 'number' &&
              node.positionAbsolute &&
              node.positionAbsolute.x >= n.position.x &&
              node.positionAbsolute.x <=
                n.position.x + (n.style.width as number) &&
              node.positionAbsolute.y >= n.position.y &&
              node.positionAbsolute.y <=
                n.position.y + (n.style.height as number)
          );

          if (group && !node.parentNode) {
            // Outside to Inside Group
            const relativeX = node.positionAbsolute!.x - group.position.x;
            const relativeY = node.positionAbsolute!.y - group.position.y;
            const parentWidth = (group.style!.width as number) || GROUP_WIDTH;
            const parentHeight =
              (group.style!.height as number) || GROUP_HEIGHT;
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
                (parentGroup.style?.width as number) || GROUP_WIDTH;
              const parentHeight =
                (parentGroup.style?.height as number) || GROUP_HEIGHT;
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

  const debouncedUpdateDimensions = useMemo(
    () =>
      debounce(async (nodeId: string, width: number, height: number) => {
        console.log(
          `Persisting dimensions for node ${nodeId}: ${width}x${height}`
        );
        try {
          await supabase
            .from('group')
            .update({
              width: `${width}px`,
              height: `${height}px`
            })
            .eq('id', nodeId);
          toast.success('Group resized');
        } catch (error) {
          toast.error('Failed to resize group');
          console.error('Error persisting group dimensions:', error);
        }
      }, 500),
    [supabase]
  );

  const lastDimensions = useRef<Map<string, { width: number; height: number }>>(
    new Map()
  );

  const onNodesChangeCustom = useCallback(
    async (changes: NodeChange[]) => {
      console.log('Node changes:', changes);
      const validChanges = changes.filter((change) => {
        if (change.type !== 'dimensions' || !change.id || !change.dimensions) {
          return true; // Allow non-dimension changes
        }
        const node = nodes.find((n) => n.id === change.id);
        if (!node || node.type !== 'group' || !node.resizable) {
          console.log(`Filtered out dimensions change for node ${change.id}:`, {
            nodeExists: !!node,
            isGroup: node?.type === 'group',
            isResizable: node?.resizable,
            dimensions: change.dimensions
          });
          return false;
        }
        const lastDims = lastDimensions.current.get(change.id);
        const isChanged =
          !lastDims ||
          Math.abs(lastDims.width - change.dimensions.width) > 0.1 ||
          Math.abs(lastDims.height - change.dimensions.height) > 0.1;
        if (isChanged) {
          lastDimensions.current.set(change.id, {
            width: change.dimensions.width,
            height: change.dimensions.height
          });
        } else {
          console.log(`Skipped redundant dimensions for node ${change.id}:`, {
            last: lastDims,
            current: change.dimensions
          });
        }
        return isChanged;
      });

      if (validChanges.length === 0) {
        console.log('No valid changes to process');
        return;
      }

      onNodesChange(validChanges);

      for (const change of validChanges) {
        if (change.type === 'dimensions' && change.id && change.dimensions) {
          const { width, height } = change.dimensions;
          console.log(
            `Updating node ${change.id} dimensions: ${width}x${height}`
          );
          setNodes((nds) =>
            nds.map((n) =>
              n.id === change.id
                ? {
                    ...n,
                    style: {
                      ...n.style,
                      width,
                      height,
                      boxSizing: 'border-box'
                    },
                    width,
                    height
                  }
                : n
            )
          );
          debouncedUpdateDimensions(change.id, width, height);
        }
      }
    },
    [onNodesChange, nodes, debouncedUpdateDimensions, setNodes]
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
  .react-flow__node-group {
    z-index: 1;
    background: rgba(243, 244, 246, 0.6);
    border: 1px solid #d1d5db;
    border-radius: 2px;
    pointer-events: auto;
    min-width: 100px;
    min-height: 100px;
    box-sizing: border-box;
  }
  .react-flow__node-default {
    pointer-events: auto;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    font-size: 12px;
    color: #374151;
    padding: 8px;
    z-index: 20;
    width: ${NODE_WIDTH}px;
    height: ${NODE_HEIGHT}px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }
  .react-flow__node:not(.react-flow__node-group) {
    cursor: grab;
    z-index: 20;
  }
  .react-flow__node:not(.react-flow__node-group).selected {
    box-shadow: 0 0 0 2px #3b82f6 !important;
    border: 1px solid #3b82f6 !important;
  }
  .react-flow__node-group.selected {
    border: 1px solid #3b82f6 !important;
    background-color: rgba(59, 130, 246, 0.1) !important;
  }
  .layout-controls {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
    padding: 10px;
    position: absolute;
    top: 8px;
    left: 8px;
    z-index: 1000;
    background: #ffffff;
    border-radius: 4px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  .layout-controls button {
    padding: 6px 10px;
    border: 1px solid #e5e7eb;
    background: #ffffff;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    color: #374151;
    transition: background 0.2s;
  }
  .layout-controls button:hover {
    background: #f3f4f6;
  }
  .layout-controls .divider {
    width: 1px;
    height: 24px;
    background: #e5e7eb;
    margin: 0 4px;
  }
  .context-menu {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 6px;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    position: fixed;
    z-index: 1000;
  }
  .context-menu button {
    padding: 4px 10px;
    border: none;
    background: #ffffff;
    text-align: left;
    cursor: pointer;
    font-size: 12px;
    color: #374151;
    border-radius: 2px;
    transition: background 0.2s;
  }
  .context-menu button:hover,
  .context-menu button:focus {
    background: #f3f4f6;
    outline: none;
  }
  .context-menu .title {
    font-weight: 500;
    color: #6b7280;
    padding-bottom: 4px;
    border-bottom: 1px solid #e5e7eb;
    font-size: 12px;
  }
  .react-flow-container {
    width: 100%;
    height: 100%;
    overflow: hidden;
    position: relative;
    z-index: 0 !important;
  }
  .react-flow__pane {
    overflow: visible !important;
    z-index: 0 !important;
  }
  .react-flow__controls {
    position: fixed;
    bottom: 16px;
    left: 16px;
    z-index: 2000;
    background: #ffffff;
    border-radius: 4px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    padding: 4px;
  }
  .react-flow__minimap {
    position: fixed;
    bottom: 16px;
    right: 16px;
    z-index: 2000;
    background: #ffffff;
    border-radius: 4px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    padding: 4px;
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
          <button type="button" onClick={refetchNewSubmissions}>
            Refetch Submissions
          </button>
          <div className="divider" />
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChangeCustom}
          onEdgesChange={onEdgesChange}
          onNodeDrag={onNodeDrag}
          onNodeDragStop={onNodeDragStop}
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
          ]}
          nodeTypes={memoizedNodeTypes}>
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
                ? nodes.find((n) => n.id === contextMenu.id)?.type === 'group'
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
