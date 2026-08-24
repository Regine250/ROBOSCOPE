import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '3rem 2rem',
          maxWidth: '600px',
          margin: '4rem auto',
          background: 'var(--card-bg, #1e293b)',
          border: '1px solid #f87171',
          borderRadius: '12px',
          textAlign: 'center',
          color: 'var(--text-main, #f8fafc)'
        }}>
          <h2 style={{ color: '#f87171', marginTop: 0 }}>Something went wrong</h2>
          <p style={{ color: 'var(--text-muted, #94a3b8)', marginBottom: '1.5rem' }}>
            {this.state.error?.message || "An unexpected error occurred while rendering this component."}
          </p>
          <button className="btn" onClick={this.handleReset}>
            Reload Application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
