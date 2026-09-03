import { redirect } from "next/navigation";
import { routes } from "@/lib/constants";

export default function RootPage() {
  redirect(routes.dashboard());
}
