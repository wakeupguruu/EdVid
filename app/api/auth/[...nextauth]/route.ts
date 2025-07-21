import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest, {params}:any) {
   const nextauth = await  params.nextauth;
   console.log("NextAuth Params:", nextauth);
    return NextResponse.json({
        message: "Handler"
    })
}