import React, { useState, useCallback, useRef } from 'react';

export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  videoUrl?: string; // URL to the demo video
  videoType?: 'mp4' | 'webm' | 'gif'; // Video format
  tips?: string[]; // Additional tips for the feature
}

interface TutorialOverlayProps {
  onComplete: () => void;
}

const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ onComplete }) => {
  const isMobile = useIsMobile();
  const [currentStep, setCurrentStep] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const steps: TutorialStep[] = [
    {
      id: 'intro',
      title: 'Welcome to the Family Tree!',
      description:
        "This interactive tool lets you visualize and manage your family tree. Let's explore how to use it!"
    },
    {
      id: 'layout-controls',
      title: 'Control Buttons',
      description:
        'Use these buttons to manage the tree: reset the layout, recenter the view, refetch new submissions, or add a new member.',
      videoUrl: '/demos/layout-controls.mp4',
      videoType: 'mp4',
      tips: [
        'Reset button reorganizes the tree layout',
        'Center button focuses the view on the tree',
        'Refresh button updates with new data'
      ]
    },
    {
      id: 'add-member',
      title: 'Adding a Member',
      description:
        'Click the "Add Member" button to add a new member to the tree. Enter their identifier to create a new node.',
      videoUrl: '/demos/add-member.mp4',
      videoType: 'mp4',
      tips: [
        'Use clear, recognizable identifiers',
        'New members start as unconnected nodes',
        'You can edit the identifier later'
      ]
    },
    {
      id: 'create-connection',
      title: 'Creating Connections',
      description:
        'Drag from the bottom handle of one node to the top handle of another to create a Big-Little connection.',
      videoUrl: '/demos/create-connection.mp4',
      videoType: 'mp4',
      tips: [
        'Bottom handle = Big (mentor)',
        'Top handle = Little (mentee)',
        'Connections show family lineage'
      ]
    },
    {
      id: 'edit-member',
      title: 'Editing a Member',
      description: `${
        isMobile ? 'Double-tap' : 'Double-click'
      } a node to edit its identifier.`,
      videoUrl: '/demos/edit-member.mp4',
      videoType: 'mp4',
      tips: [
        'Quick way to fix typos',
        'Changes are saved automatically',
        'Press Enter to confirm changes'
      ]
    },
    {
      id: 'toggle-big',
      title: 'Toggling Big/Little Status',
      description: `${
        isMobile ? 'Tap and hold' : 'Right-click'
      } a node to open the context menu and promote or demote a member to/from Big status.`,
      videoUrl: '/demos/toggle-status.mp4',
      videoType: 'mp4',
      tips: [
        'Big status affects node appearance',
        'Only Bigs can have Littles',
        'Status changes update the legend'
      ]
    },
    {
      id: 'delete',
      title: 'Deleting Members or Connections',
      description: `${
        isMobile ? 'Tap and hold' : 'Right-click'
      } a node or connection to open the context menu and delete it.`,
      videoUrl: '/demos/delete-items.mp4',
      videoType: 'mp4',
      tips: [
        'Deleting a node removes all its connections',
        'Deleting connections preserves the nodes',
        'Changes cannot be undone'
      ]
    },
    {
      id: 'legend',
      title: 'Understanding the Legend',
      description:
        'The legend explains node types: Big and Little (👑🌱), Big (⭐), Little (🌱), and Unconnected (⚪).',
      videoUrl: '/demos/legend-guide.mp4',
      videoType: 'mp4',
      tips: [
        'Icons help identify member roles',
        'Colors indicate connection status',
        'Legend updates automatically'
      ]
    },
    {
      id: 'conclusion',
      title: "You're Ready!",
      description:
        "You're all set to use the family tree! Restart the tutorial anytime from the control buttons."
    }
  ];

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

  const handleStepClick = useCallback((stepIndex: number) => {
    setCurrentStep(stepIndex);
  }, []);

  const renderVideo = (step: TutorialStep) => {
    if (!step.videoUrl) return null;

    return (
      <div className="mb-4 rounded-lg overflow-hidden bg-gray-100">
        <video
          className="w-full h-auto max-h-48"
          controls
          loop
          muted
          autoPlay
          playsInline>
          <source
            src={step.videoUrl}
            type={`video/${step.videoType || 'mp4'}`}
          />
          Your browser does not support the video tag.
        </video>
      </div>
    );
  };

  const renderTips = (tips?: string[]) => {
    if (!tips || tips.length === 0) return null;

    return (
      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="text-sm font-medium text-blue-800 mb-2">💡 Tips:</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          {tips.map((tip, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">•</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}>
      <div
        className={`bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-fade-in-up ${
          isMobile
            ? 'w-full max-w-sm max-h-[90vh]'
            : 'w-full max-w-2xl max-h-[85vh]'
        }`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Family Tree Tutorial</h2>
            <button
              onClick={onComplete}
              className="text-white/80 hover:text-white text-xl font-bold">
              ✕
            </button>
          </div>
          <div className="mt-2 flex gap-1">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => handleStepClick(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'bg-white flex-1'
                    : index < currentStep
                    ? 'bg-white/70 w-2'
                    : 'bg-white/30 w-2'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="mb-4">
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              {steps[currentStep].title}
            </h3>
            <p className="text-gray-600 leading-relaxed">
              {steps[currentStep].description}
            </p>
          </div>

          {renderVideo(steps[currentStep])}
          {renderTips(steps[currentStep].tips)}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex justify-between items-center">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed">
              Previous
            </button>

            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">
                {currentStep + 1} of {steps.length}
              </span>

              <div className="flex gap-2">
                <button
                  onClick={handleSkip}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500">
                  Skip Tutorial
                </button>
                <button
                  onClick={handleNext}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorialOverlay;
