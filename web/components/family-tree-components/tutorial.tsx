import React, { useState, useCallback, useRef } from 'react';
import { useIsMobile } from './family-tree-graph';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetSelector?: string; // CSS selector for the element to highlight
  position: 'top' | 'bottom' | 'left' | 'right' | 'center'; // Tooltip position
  offsetX?: number; // Optional X offset for tooltip
  offsetY?: number; // Optional Y offset for tooltip
  exampleVisual?: React.ReactNode; // Optional example visual for steps
}

interface TutorialOverlayProps {
  onComplete: () => void;
}

const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ onComplete }) => {
  const isMobile = useIsMobile();
  const [currentStep, setCurrentStep] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Mock node visual for steps requiring node/edge examples
  const mockNode = (
    <div
      style={{
        width: isMobile ? '100px' : '140px',
        height: isMobile ? '24px' : '32px',
        background: 'linear-gradient(135deg, #f3f4f6, #e5e7eb)',
        border: isMobile ? '1px solid #d1d5db' : '2px solid #d1d5db',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: isMobile ? '10px' : '12px',
        color: '#1f2937',
        position: 'relative',
        margin: '8px auto'
      }}>
      ⚪ Example Node
      <div
        style={{
          position: 'absolute',
          top: isMobile ? '-5px' : '-7px',
          width: isMobile ? '8px' : '10px',
          height: isMobile ? '8px' : '10px',
          background: 'linear-gradient(135deg, #3b82f6, #9333ea)',
          border: '2px solid #fff',
          borderRadius: '50%'
        }}
      />{' '}
      {/* Top handle */}
      <div
        style={{
          position: 'absolute',
          bottom: isMobile ? '-5px' : '-7px',
          width: isMobile ? '8px' : '10px',
          height: isMobile ? '8px' : '10px',
          background: 'linear-gradient(135deg, #3b82f6, #9333ea)',
          border: '2px solid #fff',
          borderRadius: '50%'
        }}
      />{' '}
      {/* Bottom handle */}
    </div>
  );

  // Mock edge visual
  const mockEdge = (
    <svg
      style={{
        width: isMobile ? '100px' : '140px',
        height: isMobile ? '40px' : '60px',
        margin: '8px auto',
        display: 'block'
      }}>
      <path
        d={isMobile ? 'M10,10 Q50,50 90,30' : 'M10,10 Q70,60 130,50'}
        stroke="#64748b"
        strokeWidth="3"
        fill="none"
        markerEnd="url(#arrow)"
      />
      <defs>
        <marker
          id="arrow"
          markerWidth="10"
          markerHeight="10"
          refX="6"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth">
          <path d="M0,0 L0,6 L9,3 z" fill="#64748b" />
        </marker>
      </defs>
    </svg>
  );

  const steps: TutorialStep[] = [
    {
      id: 'intro',
      title: 'Welcome to the Family Tree!',
      description:
        'This interactive tool lets you visualize and manage your family tree. Let’s explore how to use it!',
      position: 'center'
    },
    {
      id: 'layout-controls',
      title: 'Control Buttons',
      description:
        'Use these buttons to manage the tree: reset the layout, recenter the view, refetch new submissions, or add a new member.',
      targetSelector: '.layout-controls',
      position: 'bottom',
      offsetY: isMobile ? 8 : 12
    },
    {
      id: 'add-member',
      title: 'Adding a Member',
      description:
        'Click the "Add Member" button to add a new member to the tree. Enter their identifier to create a new node.',
      targetSelector: '.layout-controls button:nth-child(4)', // Add Member button
      position: 'bottom',
      offsetY: isMobile ? 8 : 12
    },
    {
      id: 'create-connection',
      title: 'Creating Connections',
      description:
        'Drag from the bottom handle of one node to the top handle of another to create a Big-Little connection.',
      position: 'center',
      exampleVisual: (
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: isMobile ? '10px' : '20px'
            }}>
            {mockNode}
            {mockNode}
          </div>
          {mockEdge}
        </div>
      )
    },
    {
      id: 'edit-member',
      title: 'Editing a Member',
      description: `${
        isMobile ? 'Double-tap' : 'Double-click'
      } a node to edit its identifier.`,
      position: 'center',
      exampleVisual: mockNode
    },
    {
      id: 'toggle-big',
      title: 'Toggling Big/Little Status',
      description: `${
        isMobile ? 'Tap and hold' : 'Right-click'
      } a node to open the context menu and promote or demote a member to/from Big status.`,
      position: 'center',
      exampleVisual: mockNode
    },
    {
      id: 'delete',
      title: 'Deleting Members or Connections',
      description: `${
        isMobile ? 'Tap and hold' : 'Right-click'
      } a node or connection to open the context menu and delete it.`,
      position: 'center',
      exampleVisual: (
        <div>
          {mockNode}
          {mockEdge}
        </div>
      )
    },
    {
      id: 'legend',
      title: 'Understanding the Legend',
      description:
        'The legend explains node types: Big and Little (👑🌱), Big (⭐), Little (🌱), and Unconnected (⚪).',
      targetSelector: '.legend',
      position: isMobile ? 'top' : 'left',
      offsetX: isMobile ? 0 : -12,
      offsetY: isMobile ? -12 : 0
    },
    {
      id: 'conclusion',
      title: 'You’re Ready!',
      description:
        'You’re all set to use the family tree! Restart the tutorial anytime from the control buttons.',
      position: 'center'
    }
  ];

  const getElementBounds = useCallback((selector?: string) => {
    if (!selector) return null;
    const element = document.querySelector(selector);
    if (!element) return null;
    const bounds = element.getBoundingClientRect();
    // Adjust for fixed .layout-controls positioning
    if (selector === '.layout-controls') {
      return {
        ...bounds,
        top: bounds.top + window.scrollY,
        left: bounds.left + window.scrollX
      };
    }
    return bounds;
  }, []);

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  }, [currentStep, steps.length, onComplete]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleSkip = useCallback(() => {
    onComplete();
  }, [onComplete]);

  const getTooltipPosition = useCallback(
    (step: TutorialStep) => {
      const bounds = getElementBounds(step.targetSelector);
      if (!bounds || step.position === 'center') {
        return {
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        };
      }

      const offsetX = step.offsetX || 0;
      const offsetY = step.offsetY || 0;
      const tooltipWidth = isMobile ? 260 : 320;
      const tooltipHeight = isMobile ? 160 : 200;

      let top: number, left: number, transform: string;

      switch (step.position) {
        case 'top':
          top = bounds.top - tooltipHeight - offsetY;
          left = bounds.left + bounds.width / 2;
          transform = 'translate(-50%, 0)';
          break;
        case 'bottom':
          top = bounds.bottom + offsetY;
          left = bounds.left + bounds.width / 2;
          transform = 'translate(-50%, 0)';
          break;
        case 'left':
          top = bounds.top + bounds.height / 2;
          left = bounds.left - tooltipWidth - offsetX;
          transform = 'translate(0, -50%)';
          break;
        case 'right':
          top = bounds.top + bounds.height / 2;
          left = bounds.right + offsetX;
          transform = 'translate(0, -50%)';
          break;
        default:
          top = window.innerHeight / 2;
          left = window.innerWidth / 2;
          transform = 'translate(-50%, -50%)';
      }

      // Ensure tooltip stays within viewport
      top = Math.max(
        10,
        Math.min(top, window.innerHeight - tooltipHeight - 10)
      );
      left = Math.max(
        10,
        Math.min(left, window.innerWidth - tooltipWidth - 10)
      );

      return { top, left, transform };
    },
    [isMobile, getElementBounds]
  );

  const renderSpotlight = (step: TutorialStep) => {
    const bounds = getElementBounds(step.targetSelector);
    if (!bounds) return null;

    const padding = isMobile ? 8 : 12;
    const spotlightStyle = {
      position: 'absolute' as const,
      top: bounds.top - padding,
      left: bounds.left - padding,
      width: bounds.width + padding * 2,
      height: bounds.height + padding * 2,
      borderRadius: 'var(--radius)',
      boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
      animation: 'pulse-subtle 2s ease-in-out infinite',
      pointerEvents: 'none' as React.CSSProperties['pointerEvents']
    };

    return <div style={spotlightStyle} />;
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[200] pointer-events-auto"
      style={{ background: 'rgba(0, 0, 0, 0.3)', backdropFilter: 'blur(2px)' }}>
      {steps[currentStep].targetSelector && renderSpotlight(steps[currentStep])}
      <div
        className={`absolute bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-gray-200/50 p-4 pointer-events-auto animate-fade-in-up ${
          isMobile ? 'max-w-[260px] text-sm' : 'max-w-[320px]'
        }`}
        style={getTooltipPosition(steps[currentStep])}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-600" />
          <h3 className="font-semibold text-gray-800">
            {steps[currentStep].title}
          </h3>
        </div>
        <p className="text-gray-600 mb-4">{steps[currentStep].description}</p>
        {steps[currentStep].exampleVisual && (
          <div className="mb-4">{steps[currentStep].exampleVisual}</div>
        )}
        <div className="flex justify-between items-center">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className={`nav-button px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 ${
              isMobile ? 'text-xs' : ''
            }`}>
            Previous
          </button>
          <span className="text-gray-500 text-sm">
            {currentStep + 1} / {steps.length}
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleSkip}
              className={`nav-button px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 ${
                isMobile ? 'text-xs' : ''
              }`}>
              Skip
            </button>
            <button
              onClick={handleNext}
              className={`nav-button px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isMobile ? 'text-xs' : ''
              }`}>
              {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorialOverlay;
