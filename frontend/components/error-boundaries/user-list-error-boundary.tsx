'use client'

import React from 'react'
import { Button } from '@/components/ui/button'

interface UserListErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

/**
 * Error boundary specifically designed for user list components
 * 
 * Features:
 * - Catches rendering errors in user list views
 * - Provides user-friendly error messages
 * - Includes retry mechanisms
 * - Reports errors to analytics in production
 * - Shows development-friendly error details in dev mode
 */
export class UserListErrorBoundary extends React.Component<
  React.PropsWithChildren<unknown>,
  UserListErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<unknown>) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): UserListErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('User list error boundary caught an error:', error, errorInfo)
    
    // Report to error tracking service in production
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      // Check if analytics/error tracking is available
      const windowWithAnalytics = window as Window & { analytics?: { track: (event: string, data: object) => void } }
      if (windowWithAnalytics.analytics) {
        windowWithAnalytics.analytics.track('User List Error', {
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        })
      }
      
      // Alternative: Send to custom error endpoint
      fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'user-list-error',
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
          url: window.location.href
        })
      }).catch(reportError => {
        console.error('Failed to report error:', reportError)
      })
    }
    
    this.setState({ error, errorInfo })
  }

  private handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined 
    })
  }

  private handleRefresh = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center max-w-md mx-auto">
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <svg
                data-testid="error-icon"
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                role="img"
                aria-label="Error warning icon"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            
            <h2 className="text-lg font-semibold text-destructive mb-2">
              Something went wrong loading the user list
            </h2>
            
            <p className="text-muted-foreground mb-6">
              We encountered an error while displaying the users. This might be a temporary issue.
            </p>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={this.handleRetry} 
              variant="outline"
              className="w-full"
            >
              Try Again
            </Button>
            
            <Button 
              onClick={this.handleRefresh} 
              variant="default"
              className="w-full"
            >
              Refresh Page
            </Button>
          </div>

          {/* Development error details */}
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-6 text-left">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Error Details (Development Only)
              </summary>
              <div className="mt-3 p-4 bg-muted rounded-md text-xs">
                <div className="mb-3">
                  <strong>Error:</strong>
                  <pre className="mt-1 whitespace-pre-wrap break-words">
                    {this.state.error.message}
                  </pre>
                </div>
                
                {this.state.error.stack && (
                  <div className="mb-3">
                    <strong>Stack Trace:</strong>
                    <pre className="mt-1 whitespace-pre-wrap break-words text-xs overflow-auto max-h-40">
                      {this.state.error.stack}
                    </pre>
                  </div>
                )}
                
                {this.state.errorInfo?.componentStack && (
                  <div>
                    <strong>Component Stack:</strong>
                    <pre className="mt-1 whitespace-pre-wrap break-words text-xs overflow-auto max-h-40">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          )}
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Higher-order component to wrap user list components with error boundary
 * @param Component - Component to wrap
 * @returns Wrapped component with error boundary
 */
export function withUserListErrorBoundary<P extends object>(
  Component: React.ComponentType<P>
) {
  const WrappedComponent = (props: P) => (
    <UserListErrorBoundary>
      <Component {...props} />
    </UserListErrorBoundary>
  )
  
  WrappedComponent.displayName = `withUserListErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

/**
 * Convenience wrapper component for users page
 */
export const UsersPageWithErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => (
  <UserListErrorBoundary>
    {children}
  </UserListErrorBoundary>
)

export default UserListErrorBoundary