import { memo } from 'react';
import { NodeResizer, NodeProps } from 'reactflow';

const ResizableNode = ({ data }: NodeProps) => {
  return (
    <>
      <NodeResizer
        minWidth={100}
        minHeight={100}
        handleStyle={{
          background: '#9ca3af',
          width: 6,
          height: 6,
          borderRadius: '50%',
          border: '1px solid rgba(255, 255, 255, 0.9)',
          boxShadow: '0 1px 1px rgba(0, 0, 0, 0.1)',
          zIndex: 99999,
          pointerEvents: 'auto'
        }}
        lineStyle={{
          display: 'none'
        }}
        isVisible={true}
      />
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(243, 244, 246, 0.6)',
          border: '1px solid #d1d5db',
          borderRadius: '2px',
          padding: '6px',
          boxSizing: 'border-box',
          pointerEvents: 'none'
        }}>
        <div
          style={{
            color: '#6b7280',
            fontSize: '10px',
            fontWeight: 500
          }}>
          {data.label}
        </div>
      </div>
    </>
  );
};

export default memo(ResizableNode);
