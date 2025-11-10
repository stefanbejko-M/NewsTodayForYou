'use client'
import { useEffect } from 'react'
export default function AdSlot({ id }: { id: string }) {
  useEffect(()=>{(window as any).googletag=(window as any).googletag||{cmd:[]};(window as any).googletag.cmd.push(()=>{(window as any).googletag.display(id)})},[id])
  return <div id={id} style={{minHeight:50}} />
}
