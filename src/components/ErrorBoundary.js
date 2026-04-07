import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", color: 'var(--text-primary)' }}>Algo sali&#243; mal</h2>
          <pre style={{ background: 'var(--bg-subtle)', padding: '16px', borderRadius: '12px', overflow: 'auto', textAlign: 'left', fontSize: '13px', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}>
            {this.state.error?.toString()}
          </pre>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ marginTop: '16px', padding: '10px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontFamily: "'Outfit', sans-serif", fontWeight: 600 }}
          >
            Reintentar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
