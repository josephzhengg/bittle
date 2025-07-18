import { createSupabaseServerClient } from '@/utils/supabase/clients/server-props';
import { GetServerSidePropsContext } from 'next';
import type { User } from '@supabase/supabase-js';
import DashboardLayout from '@/components/layouts/dashboard-layout';
import FamilyTreeFlow from '@/components/family-tree-components/family-tree-graph';
import { ReactFlowProvider } from 'reactflow';
import { Node, Edge, MarkerType } from 'reactflow';
import {
  getFamilyTreeByCode,
  getFamilyTreeMembers
} from '@/utils/supabase/queries/family-tree';
import {
  NODE_HEIGHT,
  PADDING
} from '@/components/family-tree-components/family-tree-graph';

interface NodeData {
  label: string;
  position_x: number | null;
  position_y: number | null;
  is_big: boolean;
  hasLittles: boolean;
  hasBig: boolean;
  form_submission_id?: string | null;
}

interface FamilyTreePageProps {
  user: User;
  initialNodes: Node<NodeData>[];
  initialEdges: Edge[];
  familyTreeId: string;
}

export default function FamilyTreePage({
  user,
  initialNodes,
  initialEdges,
  familyTreeId
}: FamilyTreePageProps) {
  return (
    <DashboardLayout user={user}>
      <div
        style={{
          width: '100%',
          height: '85vh',
          position: 'relative',
          overflow: 'hidden'
        }}>
        <ReactFlowProvider>
          <FamilyTreeFlow
            familyTreeId={familyTreeId}
            initialNodes={initialNodes}
            initialEdges={initialEdges}
          />
        </ReactFlowProvider>
      </div>
    </DashboardLayout>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const supabase = createSupabaseServerClient(context);
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (!userData || userError) {
    return {
      redirect: {
        destination: '/login',
        permanent: false
      }
    };
  }

  const { 'form-code': formCode } = context.query;
  if (typeof formCode !== 'string') {
    return {
      props: {
        user: userData.user,
        initialNodes: [],
        initialEdges: [],
        familyTreeId: ''
      }
    };
  }

  try {
    // Fetch family tree by code
    const familyTree = await getFamilyTreeByCode(supabase, formCode);
    if (!familyTree) {
      return {
        props: {
          user: userData.user,
          initialNodes: [],
          initialEdges: [],
          familyTreeId: ''
        }
      };
    }

    // Fetch members and connections
    const [members, { data: connections }] = await Promise.all([
      getFamilyTreeMembers(supabase, familyTree.id),
      supabase
        .from('connections')
        .select('id, big_id, little_id')
        .eq('family_tree_id', familyTree.id)
    ]);

    // Compute container height (use a default value for SSR)
    const containerHeight = 720 * 0.85; // Match VIEWPORT_HEIGHT from createFamilyTree

    // Build bigToLittles and littleToBig maps
    const bigToLittles = new Map<string, string[]>();
    const littleToBig = new Map<string, string>();
    connections?.forEach((conn) => {
      if (!bigToLittles.has(conn.big_id)) bigToLittles.set(conn.big_id, []);
      bigToLittles.get(conn.big_id)?.push(conn.little_id);
      littleToBig.set(conn.little_id, conn.big_id);
    });

    // Create nodes
    const getRoleIcon = (data: NodeData) => {
      if (data.is_big && data.hasLittles && data.hasBig) return '👑🌱';
      if (data.is_big && data.hasLittles) return '👑';
      if (data.is_big) return '⭐';
      if (data.hasBig) return '🌱';
      return '⚪';
    };

    const nodes: Node<NodeData>[] = members.map((member) => {
      const hasLittles = bigToLittles.has(member.id);
      const hasBig = littleToBig.has(member.id);
      const data: NodeData = {
        label: member.identifier,
        position_x: member.position_x,
        position_y: member.position_y,
        is_big: member.is_big ?? false,
        hasLittles,
        hasBig,
        form_submission_id: member.form_submission_id
      };

      return {
        id: member.id,
        type: 'custom',
        data: { ...data, label: `${getRoleIcon(data)} ${member.identifier}` },
        position: {
          x: member.position_x ?? 0,
          y: Math.min(
            member.position_y ?? 0,
            containerHeight - NODE_HEIGHT - PADDING
          )
        },
        draggable: true,
        selectable: true
      };
    });

    // Create edges
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
          type: MarkerType.Arrow,
          color: '#6b7280'
        }
      })) ?? [];

    return {
      props: {
        user: userData.user,
        initialNodes: nodes,
        initialEdges: edges,
        familyTreeId: familyTree.id
      }
    };
  } catch (error) {
    console.error('Error in getServerSideProps:', error);
    return {
      props: {
        user: userData.user,
        initialNodes: [],
        initialEdges: [],
        familyTreeId: ''
      }
    };
  }
}
