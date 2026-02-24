import { createApp } from 'vue'
import App from './App.vue'
import Vant from 'vant'
import 'vant/lib/index.css'
import VNetworkGraph from "v-network-graph"
import "v-network-graph/lib/style.css"

const app = createApp(App)
app.use(Vant)
app.use(VNetworkGraph)
app.mount('#app')

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('阿波的 PWA 助手已就位！', reg))
      .catch(err => console.log('PWA 启动失败 xwx', err));
  });
}