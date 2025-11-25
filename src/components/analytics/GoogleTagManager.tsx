import { GoogleTagManager } from '@next/third-parties/google'

const GTM_ID = 'GTM-P267R5WW'

export default function GTM() {
  return <GoogleTagManager gtmId={GTM_ID} />
}

