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
  videoUrl?: string;
  videoType?: 'mp4' | 'webm' | 'gif';
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
      title: 'Welcome! 👋',
      description: "Let's quickly explore your family tree tool!"
    },
    {
      id: 'layout-controls',
      title: 'Control Buttons',
      description: 'Auto layout, recenter view, add members, and more.',
      videoUrl: '/demos/layout-controls.mp4',
      videoType: 'mp4'
    },
    {
      id: 'create-connection',
      title: 'Make Connections',
      description:
        'Drag from bottom handle to top handle to create Big-Little relationships.',
      videoUrl: '/demos/create-connection.mp4',
      videoType: 'mp4'
    },
    {
      id: 'detail',
      title: 'Details Panel',
      description: `${
        isMobile ? 'Tap' : 'Click'
      } on members to see responses on form.`,
      videoUrl: '/demos/details-panel.mp4',
      videoType: 'mp4'
    },
    {
      id: 'double-click',
      title: 'Double Clicking',
      description: `${
        isMobile ? 'Double-tap' : 'Double-click'
      } to delete members or edit identifiers.`,
      videoUrl: '/demos/edit-member.mp4',
      videoType: 'mp4'
    },
    {
      id: 'delete-connection',
      title: 'Remove Connections',
      description: `${
        isMobile ? 'Tap' : 'Click'
      } on a connection line to delete it.`,
      videoUrl: '/demos/delete-connection.mp4',
      videoType: 'mp4'
    },
    {
      id: 'add-member',
      title: 'Add Members',
      description: 'Tap "Add Member" to create new members.',
      videoUrl: '/demos/add-member.mp4',
      videoType: 'mp4'
    },
    {
      id: 'conclusion',
      title: "You're Ready!",
      description:
        'Great! You can restart this tutorial anytime from the control buttons.'
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
      <div className="mb-3 rounded-lg overflow-hidden bg-gray-50 shadow-sm">
        <video
          className="w-full h-auto object-contain"
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

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(6px)' }}>
      <div
        className={`bg-white shadow-2xl border border-gray-200 overflow-hidden animate-fade-in-up flex flex-col ${
          isMobile
            ? 'w-full max-h-[85vh] rounded-t-2xl'
            : 'w-full max-w-2xl max-h-[80vh] rounded-xl'
        }`}
        style={
          isMobile
            ? { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }
            : {}
        }>
        {/* Header */}
        <div
          className={`bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600 text-white ${
            isMobile ? 'p-3' : 'p-4'
          }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span
                className={`${isMobile ? 'text-base' : 'text-lg'} font-bold`}>
                Family Tree Tutorial
              </span>
              <span
                className={`${
                  isMobile ? 'text-xs' : 'text-sm'
                } bg-white/20 px-2 py-0.5 rounded-full font-medium`}>
                {currentStep + 1}/{steps.length}
              </span>
            </div>
            <button
              onClick={onComplete}
              className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-full">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Progress Bar */}
          <div className="flex gap-1">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => handleStepClick(index)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === currentStep
                    ? 'bg-white flex-1 shadow-sm'
                    : index < currentStep
                    ? 'bg-white/70 w-2'
                    : 'bg-white/30 w-2 hover:bg-white/40'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div
          className={`overflow-y-auto flex-1 ${
            isMobile ? 'px-4 py-3' : 'p-6'
          } scrollbar-thin`}>
          <div className="mb-3">
            <h3
              className={`${
                isMobile ? 'text-lg' : 'text-xl'
              } font-bold text-gray-800 mb-2 leading-tight`}>
              {steps[currentStep].title}
            </h3>
            <p
              className={`${
                isMobile ? 'text-sm' : 'text-base'
              } text-gray-600 leading-relaxed`}>
              {steps[currentStep].description}
            </p>
          </div>

          {renderVideo(steps[currentStep])}
        </div>

        {/* Footer */}
        <div
          className={`border-t border-gray-100 bg-gray-50/80 backdrop-blur-sm ${
            isMobile ? 'p-3' : 'p-4'
          }`}>
          {isMobile ? (
            // Mobile Layout - Stacked
            <div className="space-y-3">
              <div className="flex justify-between items-center gap-3">
                <button
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                  className="flex-1 px-3 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm">
                  ← Previous
                </button>
                <button
                  onClick={handleSkip}
                  className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all shadow-sm">
                  Skip
                </button>
                <button
                  onClick={handleNext}
                  className="flex-1 px-3 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm">
                  {currentStep === steps.length - 1 ? 'Finish 🎉' : 'Next →'}
                </button>
              </div>
            </div>
          ) : (
            // Desktop Layout
            <div className="flex justify-between items-center">
              <button
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                ← Previous
              </button>

              <div className="flex items-center gap-4">
                <button
                  onClick={handleSkip}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all">
                  Skip Tutorial
                </button>
                <button
                  onClick={handleNext}
                  className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm">
                  {currentStep === steps.length - 1 ? 'Finish 🎉' : 'Next →'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TutorialOverlay;
