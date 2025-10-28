import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MessageTypeFilter } from '@/components/message-type-filter';
import { useRouter, useSearchParams } from 'next/navigation';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn()
}));

describe('MessageTypeFilter', () => {
  const mockPush = vi.fn();
  const mockRouter = {
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue(mockRouter as any);
  });

  it('should render filter buttons for all message types', () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams());
    
    render(<MessageTypeFilter />);

    expect(screen.getByRole('button', { name: /All/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Text/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Images/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Files/i })).toBeInTheDocument();
  });

  it('should highlight "All" by default when no filter is set', () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams());
    
    render(<MessageTypeFilter />);

    const allButton = screen.getByRole('button', { name: /All/i });
    expect(allButton).toHaveClass('bg-primary');
    expect(allButton).toHaveClass('text-primary-foreground');
    
    const textButton = screen.getByRole('button', { name: /Text/i });
    expect(textButton).toHaveClass('bg-secondary');
  });

  it('should highlight selected filter from URL params', () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams('messageType=image'));
    
    render(<MessageTypeFilter />);

    const imageButton = screen.getByRole('button', { name: /Images/i });
    expect(imageButton).toHaveClass('bg-primary');
    expect(imageButton).toHaveClass('text-primary-foreground');
    
    const allButton = screen.getByRole('button', { name: /All/i });
    expect(allButton).toHaveClass('bg-secondary');
  });

  it('should update URL when clicking Text filter', () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams());
    
    render(<MessageTypeFilter />);

    const textButton = screen.getByRole('button', { name: /Text/i });
    fireEvent.click(textButton);

    expect(mockPush).toHaveBeenCalledWith('?messageType=text');
  });

  it('should update URL when clicking Images filter', () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams());
    
    render(<MessageTypeFilter />);

    const imageButton = screen.getByRole('button', { name: /Images/i });
    fireEvent.click(imageButton);

    expect(mockPush).toHaveBeenCalledWith('?messageType=image');
  });

  it('should update URL when clicking Files filter', () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams());
    
    render(<MessageTypeFilter />);

    const fileButton = screen.getByRole('button', { name: /Files/i });
    fireEvent.click(fileButton);

    expect(mockPush).toHaveBeenCalledWith('?messageType=file');
  });

  it('should clear filter when clicking All', () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams('messageType=text'));
    
    render(<MessageTypeFilter />);

    const allButton = screen.getByRole('button', { name: /All/i });
    fireEvent.click(allButton);

    expect(mockPush).toHaveBeenCalledWith('?');
  });

  it('should preserve other query params when changing filter', () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams('page=2&limit=50&dateFrom=2024-01-01'));
    
    render(<MessageTypeFilter />);

    const textButton = screen.getByRole('button', { name: /Text/i });
    fireEvent.click(textButton);

    expect(mockPush).toHaveBeenCalledWith('?page=2&limit=50&dateFrom=2024-01-01&messageType=text');
  });

  it('should preserve other params when clearing filter', () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams('page=2&messageType=image&limit=50'));
    
    render(<MessageTypeFilter />);

    const allButton = screen.getByRole('button', { name: /All/i });
    fireEvent.click(allButton);

    expect(mockPush).toHaveBeenCalledWith('?page=2&limit=50');
  });

  it('should display icons for each filter type', () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams());
    
    render(<MessageTypeFilter />);

    expect(screen.getByTestId('filter-icon-all')).toBeInTheDocument();
    expect(screen.getByTestId('filter-icon-text')).toBeInTheDocument();
    expect(screen.getByTestId('filter-icon-image')).toBeInTheDocument();
    expect(screen.getByTestId('filter-icon-file')).toBeInTheDocument();
  });

  it('should be keyboard accessible', () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams());
    
    render(<MessageTypeFilter />);

    const textButton = screen.getByRole('button', { name: /Text/i });
    
    // Simulate keyboard navigation
    textButton.focus();
    expect(document.activeElement).toBe(textButton);
    
    fireEvent.keyDown(textButton, { key: 'Enter', code: 'Enter' });
    expect(mockPush).toHaveBeenCalledWith('?messageType=text');
  });

  it('should handle rapid filter changes', async () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams());
    
    render(<MessageTypeFilter />);

    const textButton = screen.getByRole('button', { name: /Text/i });
    const imageButton = screen.getByRole('button', { name: /Images/i });
    const fileButton = screen.getByRole('button', { name: /Files/i });
    
    // Rapid clicks
    fireEvent.click(textButton);
    fireEvent.click(imageButton);
    fireEvent.click(fileButton);
    
    await waitFor(() => {
      // Should have called push for each click
      expect(mockPush).toHaveBeenCalledTimes(3);
      expect(mockPush).toHaveBeenNthCalledWith(1, '?messageType=text');
      expect(mockPush).toHaveBeenNthCalledWith(2, '?messageType=image');
      expect(mockPush).toHaveBeenNthCalledWith(3, '?messageType=file');
    });
  });

  it('should not update URL when clicking already active filter', () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams('messageType=text'));
    
    render(<MessageTypeFilter />);

    const textButton = screen.getByRole('button', { name: /Text/i });
    fireEvent.click(textButton);

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should show count badges when counts are provided', () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams());
    
    render(
      <MessageTypeFilter 
        counts={{
          all: 1500,
          text: 1200,
          image: 200,
          file: 100
        }}
      />
    );

    expect(screen.getByTestId('count-all')).toHaveTextContent('1,500');
    expect(screen.getByTestId('count-text')).toHaveTextContent('1,200');
    expect(screen.getByTestId('count-image')).toHaveTextContent('200');
    expect(screen.getByTestId('count-file')).toHaveTextContent('100');
  });

  it('should handle loading state', () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams());
    
    render(<MessageTypeFilter isLoading={true} />);

    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  it('should be responsive on mobile', () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams());
    
    render(<MessageTypeFilter />);

    const container = screen.getByTestId('message-type-filter');
    expect(container).toHaveClass('flex-wrap');
  });
});