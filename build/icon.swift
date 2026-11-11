import AppKit

// Desenha o ícone do Acervo (1024px) e grava em PNG.
let size: CGFloat = 1024
let img = NSImage(size: NSSize(width: size, height: size))
img.lockFocus()
let ctx = NSGraphicsContext.current!.cgContext

let inset: CGFloat = 100
let rect = CGRect(x: inset, y: inset, width: size - inset * 2, height: size - inset * 2)
let radius: CGFloat = 185
let path = CGPath(roundedRect: rect, cornerWidth: radius, cornerHeight: radius, transform: nil)

ctx.saveGState()
ctx.setShadow(offset: CGSize(width: 0, height: -14), blur: 34, color: NSColor(white: 0, alpha: 0.38).cgColor)
ctx.addPath(path)
ctx.setFillColor(NSColor(red: 0.36, green: 0.33, blue: 1.0, alpha: 1).cgColor)
ctx.fillPath()
ctx.restoreGState()

ctx.saveGState()
ctx.addPath(path)
ctx.clip()
let colors = [
  NSColor(red: 0.50, green: 0.47, blue: 1.0, alpha: 1).cgColor,
  NSColor(red: 0.36, green: 0.33, blue: 1.0, alpha: 1).cgColor,
  NSColor(red: 0.22, green: 0.19, blue: 0.80, alpha: 1).cgColor,
] as CFArray
let grad = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(), colors: colors, locations: [0, 0.55, 1])!
ctx.drawLinearGradient(grad, start: CGPoint(x: rect.minX, y: rect.maxY), end: CGPoint(x: rect.maxX, y: rect.minY), options: [])

// duas "telas" empilhadas atrás
func card(_ r: CGRect, _ alpha: CGFloat) {
  ctx.addPath(CGPath(roundedRect: r, cornerWidth: 46, cornerHeight: 46, transform: nil))
  ctx.setFillColor(NSColor(white: 1, alpha: alpha).cgColor)
  ctx.fillPath()
}
card(CGRect(x: 330, y: 640, width: 364, height: 90), 0.20)
card(CGRect(x: 286, y: 590, width: 452, height: 100), 0.34)
// tela principal
card(CGRect(x: 240, y: 270, width: 544, height: 360), 1.0)
// play
let tri = CGMutablePath()
tri.move(to: CGPoint(x: 462, y: 368))
tri.addLine(to: CGPoint(x: 462, y: 532))
tri.addLine(to: CGPoint(x: 598, y: 450))
tri.closeSubpath()
ctx.addPath(tri)
ctx.setLineJoin(.round)
ctx.setLineWidth(26)
ctx.setStrokeColor(NSColor(red: 0.33, green: 0.30, blue: 0.96, alpha: 1).cgColor)
ctx.setFillColor(NSColor(red: 0.33, green: 0.30, blue: 0.96, alpha: 1).cgColor)
ctx.drawPath(using: .fillStroke)
ctx.restoreGState()
img.unlockFocus()

let rep = NSBitmapImageRep(data: img.tiffRepresentation!)!
let png = rep.representation(using: .png, properties: [:])!
try! png.write(to: URL(fileURLWithPath: CommandLine.arguments[1]))
