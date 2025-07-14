// ResizableNode.tsx
import { memo } from 'react';
import { NodeResizer, NodeProps } from 'reactflow';

const ResizableNode = ({ data, id }: NodeProps) => {
  return (
    <>
      <NodeResizer
        minWidth={100}
        minHeight={100}
        handleStyle={{
          background: 'rgba(156, 163, 175, 0.8)', // Subtle gray with transparency
          width: 8,
          height: 8,
          borderRadius: '50%',
          border: '1px solid rgba(255, 255, 255, 0.8)',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
          zIndex: 99999,
          pointerEvents: 'auto'
        }}
        lineStyle={{
          display: 'none' // Hide edge lines to focus on corner handles
        }}
        isVisible={true}
      />
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(249, 245, 249, 0.8)',
          border: '1px solid #9ca3af', // Single solid border instead of dashed
          borderRadius: '4px',
          padding: '8px',
          boxSizing: 'border-box',
          pointerEvents: 'none' // Prevent div from intercepting clicks
        }}>
        <div style={{ color: '#4b5563', fontSize: '12px' }}>{data.label}</div>
      </div>
    </>
  );
};

export default memo(ResizableNode);
