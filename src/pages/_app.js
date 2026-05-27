import '../styles/globals.css'
import WikiChat from '../components/WikiChat'
import UploadDrop from '../components/UploadDrop'

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <WikiChat />
      <UploadDrop />
    </>
  )
}
