import { NextResponse } from "next/server";
import { listPersonas } from "@/server/services";

/**
 * GET /api/personas
 *
 * The demo identities the evaluation area can be read as (direction.md 14).
 * Not a paginated list: this feeds a switcher, and a switcher with a page two
 * is a list screen wearing a control's clothes.
 */
export async function GET() {
  return NextResponse.json({ items: listPersonas() });
}
