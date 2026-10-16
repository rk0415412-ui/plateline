import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.subtitle}>PlateLine caught a runtime error:</Text>
          <ScrollView style={styles.errorBox}>
            <Text style={styles.errorText}>
              {this.state.error?.toString()}
            </Text>
            {this.state.errorInfo?.componentStack && (
              <Text style={styles.stackText}>
                {this.state.errorInfo.componentStack}
              </Text>
            )}
          </ScrollView>
          <TouchableOpacity style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6EFE3',
    padding: 24,
    paddingTop: 60,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#C1553B',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#4E3728',
    marginBottom: 16,
  },
  errorBox: {
    backgroundColor: '#FBF6EA',
    borderRadius: 14,
    padding: 16,
    maxHeight: 350,
    borderWidth: 1,
    borderColor: '#9E3D2A',
    marginBottom: 20,
  },
  errorText: {
    fontSize: 14,
    color: '#9E3D2A',
    fontWeight: '600',
    marginBottom: 8,
  },
  stackText: {
    fontSize: 12,
    color: '#8C7462',
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: '#C1553B',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#F6EFE3',
    fontSize: 16,
    fontWeight: '700',
  },
});
