import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { apiToken, serviceUserId } = await request.json()

    if (!apiToken || !serviceUserId) {
      return NextResponse.json(
        { error: "API token and service user ID are required" },
        { status: 400 }
      )
    }

    // Test connection to HiBob API
    const response = await fetch("https://api.hibob.com/v1/people?showInactive=false&humanReadable=REPLACE", {
      method: "GET",
      headers: {
        Authorization: `Basic ${Buffer.from(`${serviceUserId}:${apiToken}`).toString("base64")}`,
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `HiBob API returned ${response.status}: ${response.statusText}` },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Connection test failed" },
      { status: 500 }
    )
  }
}
