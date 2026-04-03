import Icon from './Icon';

interface Step {
  label: string;
}

interface Props {
  steps: Step[];
  currentStep: number;
  completedSteps: number[];
}

export default function StepIndicator({ steps, currentStep, completedSteps }: Props) {
  return (
    <div className="flex items-center">
      {steps.map((step, i) => {
        const isCompleted = completedSteps.includes(i);
        const isCurrent = i === currentStep;

        return (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                  isCompleted
                    ? 'bg-status-success text-white'
                    : isCurrent
                      ? 'bg-brand-600 text-white ring-4 ring-brand-100 dark:ring-brand-900/50'
                      : 'bg-surface-tertiary text-text-tertiary'
                }`}
              >
                {isCompleted ? <Icon name="check-circle" size={16} /> : i + 1}
              </div>
              <span className={`text-xs mt-1.5 whitespace-nowrap ${
                isCurrent ? 'text-brand-700 dark:text-brand-400 font-medium' : isCompleted ? 'text-text-secondary' : 'text-text-tertiary'
              }`}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 rounded-full transition-colors duration-300 ${
                isCompleted ? 'bg-status-success' : 'bg-surface-tertiary'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
