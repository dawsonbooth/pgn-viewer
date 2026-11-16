import { render } from 'solid-js/web'
import '@fontsource-variable/source-sans-3/index.css'
import '@lichess-org/chessground/assets/chessground.base.css'
import '@lichess-org/chessground/assets/chessground.cburnett.css'
import './styles/global.css'
import { App } from './App'

render(() => <App />, document.getElementById('root')!)
