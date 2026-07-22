import AppKit
import ScreenSaver

@objc(CreatureSaverView)
final class CreatureSaverView: ScreenSaverView {
  private var phase = 0.0
  private var pulseColour = NSColor(white: 1.0, alpha: 1.0)

  override init?(frame: NSRect, isPreview: Bool) {
    super.init(frame: frame, isPreview: isPreview)
    animationTimeInterval = 1.0 / 60.0
    loadStoredPalette()
  }

  required init?(coder: NSCoder) {
    super.init(coder: coder)
    animationTimeInterval = 1.0 / 60.0
    loadStoredPalette()
  }

  override func animateOneFrame() {
    phase += animationTimeInterval
    needsDisplay = true
  }

  override func draw(_ rect: NSRect) {
    NSColor.black.setFill()
    rect.fill()

    // The native renderer is linked here in the packaging milestone. Keeping
    // the ScreenSaverView lifecycle in a real bundle target now means its
    // preview/full-screen semantics are exercised independently of the GPU core.
    let alpha = 0.13 + 0.07 * sin(phase * .pi * 2.0)
    pulseColour.withAlphaComponent(alpha).setFill()
    let dot = NSRect(x: bounds.midX - 1, y: bounds.midY - 1, width: 2, height: 2)
    NSBezierPath(ovalIn: dot).fill()
  }

  private func loadStoredPalette() {
    let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
    let preset = base?.appendingPathComponent("Creature Saver/active.creature")
    guard let preset, let data = try? Data(contentsOf: preset),
          let root = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
          root["format"] as? String == "creature-saver",
          let specimen = root["specimen"] as? [String: Any],
          let palette = specimen["palette"] as? [String: Any],
          let hex = palette["pulse"] as? String,
          let colour = NSColor(creatureHex: hex) else { return }
    pulseColour = colour
  }
}

private extension NSColor {
  convenience init?(creatureHex: String) {
    guard creatureHex.count == 7, creatureHex.first == "#",
          let value = UInt32(creatureHex.dropFirst(), radix: 16) else { return nil }
    self.init(
      calibratedRed: CGFloat((value >> 16) & 0xff) / 255,
      green: CGFloat((value >> 8) & 0xff) / 255,
      blue: CGFloat(value & 0xff) / 255,
      alpha: 1
    )
  }
}
