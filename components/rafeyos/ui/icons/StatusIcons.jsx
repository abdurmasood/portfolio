import { useSettings, useWifiLink } from '@/components/rafeyos/state/logic/contexts'
import { Sym, WifiGlyph } from '@/components/rafeyos/ui/icons/symbols'

/** Off, one arc while reconnecting, or the full mark. Shared by the tile and every status cluster. */
export const WifiStatusIcon = () => {
  const { wifi } = useSettings()
  const { searching, arc } = useWifiLink()
  if (!wifi) return <Sym name="wifioff" />
  return <WifiGlyph arc={searching ? arc : null} />
}

/** Wi-Fi, volume and power, as in the top bar's status area (also on the lock screen). */
export const StatusIcons = () => {
  const { volume } = useSettings()
  return (
    <span className="sti">
      <WifiStatusIcon />
      <Sym name={volume === 0 ? 'vol0' : 'vol'} />
      <Sym name="power" />
    </span>
  )
}
