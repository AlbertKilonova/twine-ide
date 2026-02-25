import { createApp } from 'vue'
import App from './App.vue'
import Vant from 'vant'
import 'vant/lib/index.css'
import './styles/editor.css'
import VNetworkGraph from "v-network-graph"
import "v-network-graph/lib/style.css"

const app = createApp(App)
app.use(Vant)
app.use(VNetworkGraph)
app.mount('#app')