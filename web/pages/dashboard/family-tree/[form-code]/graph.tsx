import { createSupabaseServerClient } from '@/utils/supabase/clients/server-props';
import { GetServerSidePropsContext } from 'next';
import type { User } from '@supabase/supabase-js';
import DashboardLayout from '@/components/layouts/dashboard-layout';
import FamilyTreeFlow from '@/components/family-tree-components/family-tree-graph';
import { ReactFlowProvider } from 'reactflow';
import { Node, Edge, MarkerType } from 'reactflow';
import { useState, useEffect } from 'react';
import {
  getFamilyTreeByCode,
  getFamilyTreeMembers
} from '@/utils/supabase/queries/family-tree';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User2, TreeDeciduous } from 'lucide-react';
import { useRouter } from 'next/router';

interface NodeData {
  label: string;
  position_x: number | null;
  position_y: number | null;
  is_big: boolean;
  hasLittles: boolean;
  hasBig: boolean;
  form_submission_id?: string | null;
}

interface GraphPageProps {
  user: User;
  initialNodes: Node<NodeData>[];
  initialEdges: Edge[];
  familyTreeId: string;
}

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

const getCustomMarker = (type: 'bigToLittle' | 'general') => ({
  type: MarkerType.ArrowClosed,
  color: type === 'bigToLittle' ? '#8b5cf6' : '#64748b',
  width: 16,
  height: 16,
  strokeWidth: 1.5
});

export default function GraphPage({
  user,
  initialNodes,
  initialEdges,
  familyTreeId
}: GraphPageProps) {
  const router = useRouter();
  const { 'form-code': formCode } = router.query;

  const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
      const checkMobile = () => {
        setIsMobile(window.innerWidth < 768);
      };

      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return isMobile;
  };
  const isMobile = useIsMobile();

  return (
    <DashboardLayout user={user}>
      <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-slate-200 p-1 mb-4">
        <Tabs className="w-full" defaultValue="family-tree">
          <TabsList className="h-12 p-1 bg-transparent rounded-lg w-full grid grid-cols-2">
            <TabsTrigger
              value="family-tree"
              className="flex items-center gap-2 h-10 px-3 sm:px-6 rounded-md font-medium transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-slate-800 text-slate-600 hover:text-slate-800">
              <TreeDeciduous className="w-4 h-4" />
              <span className="hidden xs:inline">Family Tree</span>
            </TabsTrigger>
            <TabsTrigger
              value="forms"
              onClick={() => router.push(`/dashboard/current/form/${formCode}`)}
              className="flex items-center gap-2 h-10 px-3 sm:px-6 rounded-md font-medium transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-slate-800 text-slate-600 hover:text-slate-800">
              <User2 className="w-4 h-4" />
              <span className="hidden xs:inline">Manage Tree</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div
        style={{
          width: '100%',
          height: `${isMobile ? '70vh' : '80vh'}`,
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

    const [members, { data: connections }] = await Promise.all([
      getFamilyTreeMembers(supabase, familyTree.id),
      supabase
        .from('connections')
        .select('id, big_id, little_id')
        .eq('family_tree_id', familyTree.id)
    ]);

    const bigToLittles = new Map<string, string[]>();
    const littleToBig = new Map<string, string>();
    connections?.forEach((conn) => {
      if (!bigToLittles.has(conn.big_id)) bigToLittles.set(conn.big_id, []);
      bigToLittles.get(conn.big_id)?.push(conn.little_id);
      littleToBig.set(conn.little_id, conn.big_id);
    });

    const getRoleIcon = (data: NodeData) => {
      if (data.is_big && data.hasLittles && data.hasBig) return '👑🌱';
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
          y: member.position_y ?? 0 // Remove server-side y constraint
        },
        draggable: true,
        selectable: true
      };
    });

    const edges: Edge[] =
      connections?.map((conn) => {
        const sourceNode = nodes.find((n) => n.id === conn.big_id);
        const targetNode = nodes.find((n) => n.id === conn.little_id);
        const isBigToLittle =
          sourceNode?.data.is_big && targetNode?.data.hasBig;

        const sourceX = sourceNode?.position?.x;
        const targetX = targetNode?.position?.x;
        const isVertical =
          sourceX !== undefined &&
          targetX !== undefined &&
          Math.abs(sourceX - targetX) < 10;

        return {
          id: conn.id,
          type: isVertical ? 'default' : 'smoothstep',
          source: conn.big_id,
          target: conn.little_id,
          style: getEdgeStyle(sourceNode, targetNode),
          animated: isBigToLittle,
          markerEnd: getCustomMarker(isBigToLittle ? 'bigToLittle' : 'general'),
          sourceHandle: 'bottom',
          targetHandle: 'top',
          data: {
            relationshipType: isBigToLittle ? 'bigToLittle' : 'general',
            isVertical
          }
        };
      }) ?? [];

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
