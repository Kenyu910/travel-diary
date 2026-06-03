import { Component, type ReactNode } from 'react'

type State = { error: Error | null }

export class MapErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: any) {
    console.error('MapErrorBoundary caught:', error.message, error.stack)
    console.error('Component stack:', info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-pink-50 p-6 text-center">
          <p className="text-4xl mb-3">🗺️</p>
          <p className="text-sm font-semibold text-gray-700 mb-1">マップの読み込みに失敗しました</p>
          <p className="text-xs text-red-400 bg-red-50 rounded-xl p-3 mt-2 text-left break-all">
            {this.state.error.message}
          </p>
          <button
            onClick={() => { localStorage.clear(); window.location.reload() }}
            className="mt-4 px-4 py-2 bg-pink-400 text-white text-sm rounded-2xl"
          >
            データをリセットして再起動
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
