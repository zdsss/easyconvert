import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProgressTracker from '../ProgressTracker';
import type { StageName, StageStatus } from '@shared/types';

// Mock the Icon component to avoid SVG rendering issues
vi.mock('../ui/Icon', () => ({
  default: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

function makeStages(overrides: Partial<Record<StageName, { status: StageStatus; duration?: number }>> = {}) {
  const defaults: Record<StageName, { status: StageStatus }> = {
    file_upload: { status: 'pending' },
    file_parse: { status: 'pending' },
    difficulty_classify: { status: 'pending' },
    strategy_select: { status: 'pending' },
    llm_extract: { status: 'pending' },
    content_classify: { status: 'pending' },
    validation: { status: 'pending' },
    cache_store: { status: 'pending' },
  };
  return { ...defaults, ...overrides };
}

describe('ProgressTracker', () => {
  it('renders all 8 stage labels', () => {
    render(<ProgressTracker stages={makeStages()} currentStage={null} />);
    expect(screen.getByText('上传')).toBeDefined();
    expect(screen.getByText('AI提取')).toBeDefined();
    expect(screen.getByText('验证')).toBeDefined();
    expect(screen.getByText('缓存')).toBeDefined();
  });

  it('shows 0% when no stages completed', () => {
    render(<ProgressTracker stages={makeStages()} currentStage={null} />);
    expect(screen.getByText('0%')).toBeDefined();
    expect(screen.getByText('准备中...')).toBeDefined();
  });

  it('shows correct percentage for completed stages', () => {
    const stages = makeStages({
      file_upload: { status: 'completed' },
      file_parse: { status: 'completed' },
    });
    render(<ProgressTracker stages={stages} currentStage="difficulty_classify" />);
    expect(screen.getByText('25%')).toBeDefined();
    expect(screen.getByText('正在分类...')).toBeDefined();
  });

  it('shows 100% when all stages completed', () => {
    const stages = makeStages({
      file_upload: { status: 'completed' },
      file_parse: { status: 'completed' },
      difficulty_classify: { status: 'completed' },
      strategy_select: { status: 'completed' },
      llm_extract: { status: 'completed' },
      content_classify: { status: 'completed' },
      validation: { status: 'completed' },
      cache_store: { status: 'completed' },
    });
    render(<ProgressTracker stages={stages} currentStage={null} />);
    expect(screen.getByText('100%')).toBeDefined();
    expect(screen.getByText('处理完成')).toBeDefined();
  });

  it('shows duration when available', () => {
    const stages = makeStages({
      file_upload: { status: 'completed', duration: 150 },
    });
    render(<ProgressTracker stages={stages} currentStage="file_parse" />);
    expect(screen.getByText('150ms')).toBeDefined();
  });
});
