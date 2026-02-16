import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { DocumentUploader } from './DocumentUploader';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';

// Use vi.hoisted to ensure mocks are available inside vi.mock
const { mockUpload, mockInsert } = vi.hoisted(() => {
  return {
    mockUpload: vi.fn(),
    mockInsert: vi.fn(),
  };
});

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'test-user-id' } }),
}));

// Mock Toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => {
  const UPLOAD_DELAY = 100; // ms
  const INSERT_DELAY = 50;  // ms

  mockUpload.mockImplementation(async () => {
    await new Promise(resolve => setTimeout(resolve, UPLOAD_DELAY));
    return { data: {}, error: null };
  });

  mockInsert.mockImplementation(async () => {
    await new Promise(resolve => setTimeout(resolve, INSERT_DELAY));
    return { data: [], error: null };
  });

  return {
    supabase: {
      storage: {
        from: () => ({
          upload: mockUpload,
        }),
      },
      from: () => {
        const eqChain = {
          in: () => ({
            order: () => Promise.resolve({ data: [], error: null }),
          }),
          order: () => Promise.resolve({ data: [], error: null }),
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
        };
        return {
          select: () => ({
            eq: () => eqChain,
          }),
          insert: mockInsert,
        };
      },
    },
  };
});

describe('DocumentUploader Benchmark', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('measures upload time for multiple files', async () => {
    const onUploadComplete = vi.fn();
    const { container } = render(<DocumentUploader processId="test-process-id" onUploadComplete={onUploadComplete} />);

    // Create 5 dummy files
    const files = Array.from({ length: 5 }, (_, i) =>
      new File([`content${i}`], `file${i}.pdf`, { type: 'application/pdf' })
    );

    // Get the input element
    // The component has <input type="file" ... /> which is hidden but present in DOM
    const input = container.querySelector('input[type="file"]');
    expect(input).toBeTruthy();

    if (input) {
      fireEvent.change(input, { target: { files } });
    }

    // Wait for file list to appear
    await waitFor(() => {
      expect(screen.getByText('5 arquivo(s)')).toBeInTheDocument();
    });

    // Start timer
    const startTime = performance.now();

    // Click upload button
    const uploadButton = screen.getByText('Fazer Upload');
    fireEvent.click(uploadButton);

    // Wait for completion (uploading state goes away or onUploadComplete called)
    await waitFor(() => {
      expect(onUploadComplete).toHaveBeenCalled();
    }, { timeout: 10000 });

    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log(`\n\n⚡ Benchmark Result: Uploading 5 files took ${duration.toFixed(2)}ms\n\n`);
  });
});
