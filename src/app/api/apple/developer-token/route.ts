import { NextResponse } from 'next/server'
import { generateAppleDeveloperToken } from '@/lib/apple'

export async function GET() {
  try {
    const token = await generateAppleDeveloperToken()
    return NextResponse.json({ token })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
