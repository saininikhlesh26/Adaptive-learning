import { Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.container}>
          <h1 style={styles.heading}>Something went wrong</h1>
          <p style={styles.message}>We apologize for the inconvenience. Please refresh the page to continue.</p>
          {import.meta.env.DEV && (
            <details style={styles.details}>
              <summary>Error details (development only)</summary>
              <pre style={styles.pre}>{this.state.error?.toString()}</pre>
            </details>
          )}
        </div>
      )
    }

    return this.props.children
  }
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '20px',
    textAlign: 'center',
    backgroundColor: '#f5f5f5',
    fontFamily: 'system-ui, sans-serif',
  },
  heading: {
    color: '#333',
    marginBottom: '10px',
  },
  message: {
    color: '#666',
    marginBottom: '20px',
  },
  details: {
    textAlign: 'left',
    maxWidth: '600px',
    backgroundColor: '#fff',
    padding: '10px',
    borderRadius: '4px',
    border: '1px solid #ddd',
  },
  pre: {
    overflow: 'auto',
    backgroundColor: '#f4f4f4',
    padding: '10px',
    borderRadius: '4px',
    fontSize: '12px',
  },
}

export default ErrorBoundary
