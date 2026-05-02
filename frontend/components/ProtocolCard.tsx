import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const LENDING_ADDRESS = process.env.NEXT_PUBLIC_LENDING_ADDRESS ?? "0xD46bBD0362b1F8feb764366805F98f8782Ab81DA";
const BRIDGE_ADDRESS = process.env.NEXT_PUBLIC_BRIDGE_ADDRESS ?? "0xD2efb57cFA2a7626d520C45a8304AD3162FE32Af";

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

interface Row {
  label: string;
  value: string;
  mono?: boolean;
  href?: string;
  ariaLabel?: string;
}

const BASE_EXPLORER = "https://chainscan-testnet.0g.ai/address/";

const rows: Row[] = [
  { label: "Network", value: "0G Newton Testnet (16602)" },
  {
    label: "Bridge contract",
    value: shortAddr(BRIDGE_ADDRESS),
    mono: true,
    href: `${BASE_EXPLORER}${BRIDGE_ADDRESS}`,
    ariaLabel: `View bridge contract ${shortAddr(BRIDGE_ADDRESS)} on 0G explorer (opens in new tab)`,
  },
  {
    label: "Lending contract",
    value: shortAddr(LENDING_ADDRESS),
    mono: true,
    href: `${BASE_EXPLORER}${LENDING_ADDRESS}`,
    ariaLabel: `View lending contract ${shortAddr(LENDING_ADDRESS)} on 0G explorer (opens in new tab)`,
  },
  { label: "Pause threshold", value: "≥ 7 / 10 risk score" },
  { label: "DVN scoring", value: "1-of-1 → 2  ·  2-of-3 → 7  ·  3-of-5 → 9" },
];

export function ProtocolCard() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold font-[family-name:var(--font-display)]">Protocol Config</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">KelpDAO monitoring targets</p>
          </div>
          <Badge variant="secondary" className="text-xs font-mono" translate="no">
            kelpdao.bridgesentinel.eth
          </Badge>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="pt-3">
        <dl className="flex flex-col gap-2">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-4 text-xs">
              <dt className="text-muted-foreground shrink-0">{row.label}</dt>
              <dd className={`text-right truncate ${row.mono ? "font-mono" : ""}`}>
                {row.href ? (
                  <a
                    href={row.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={row.ariaLabel}
                    className="text-primary hover:underline"
                    translate="no"
                  >
                    {row.value}
                    <span aria-hidden="true" className="ml-0.5 text-[10px]">↗</span>
                  </a>
                ) : (
                  row.value
                )}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
