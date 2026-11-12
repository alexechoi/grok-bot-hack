import { redeemOperatorLink } from "@/lib/server/operator-unlock";
export async function GET(request: Request) {
  return redeemOperatorLink(request);
}
