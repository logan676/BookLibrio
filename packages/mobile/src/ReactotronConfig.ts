import Reactotron from 'reactotron-react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

const reactotron = Reactotron
  .setAsyncStorageHandler(AsyncStorage)
  .configure({
    name: 'BookPost',
  })
  .useReactNative({
    asyncStorage: true,
    networking: {
      ignoreUrls: /symbolicate/,
    },
    editor: false,
    errors: { veto: () => false },
    overlay: false,
  })
  .connect()

// Patch console.log to also send to Reactotron
const originalLog = console.log
const originalWarn = console.warn
const originalError = console.error

console.log = (...args) => {
  originalLog(...args)
  if (reactotron.log) {
    reactotron.log(...args)
  }
}

console.warn = (...args) => {
  originalWarn(...args)
  if (reactotron.warn) {
    reactotron.warn(args.join(' '))
  }
}

console.error = (...args) => {
  originalError(...args)
  if (reactotron.error) {
    reactotron.error(args.join(' '), null)
  }
}

export default reactotron
